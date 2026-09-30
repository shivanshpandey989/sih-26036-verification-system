const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { computeOverallResult, DEFAULT_PARAMETERS } = require('../utils/tolerance');
const { generateQrToken } = require('../utils/qr');
const { generateCertificatePdf } = require('../utils/pdf');

const router = express.Router();
router.use(authenticate);

function nextVerificationNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `VER-${year}-${rand}`;
}
function nextApplicationNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `APP-${year}-${rand}`;
}
function nextCertificateNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `LM-${year}-${rand}`;
}

// POST /api/verifications  -> start a new verification for an instrument.
// Pre-creates the default observation rows (empty) so the frontend can
// render the form immediately and autosave into existing records.
router.post(
  '/',
  authorize('ADMIN', 'LMO', 'GATC'),
  [body('instrumentId').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { instrumentId, verificationType = 'RE_VERIFICATION' } = req.body;
      const instrument = await prisma.instrument.findUnique({ where: { id: instrumentId } });
      if (!instrument) return res.status(404).json({ success: false, message: 'Instrument not found.' });

      const verification = await prisma.$transaction(async (tx) => {
        const v = await tx.verification.create({
          data: {
            instrumentId,
            officerId: req.user.id,
            verificationNumber: nextVerificationNumber(),
            applicationNumber: nextApplicationNumber(),
            verificationType,
            status: 'IN_PROGRESS',
          },
        });
        await tx.observation.createMany({
          data: DEFAULT_PARAMETERS.map((p, index) => ({
            verificationId: v.id,
            parameter: p.parameter,
            unit: p.unit,
            expectedValue: p.expectedValue,
            status: 'PENDING',
            sortOrder: index,
          })),
        });
        await tx.instrument.update({
          where: { id: instrumentId },
          data: { currentStatus: 'PENDING_VERIFICATION' },
        });
        return v;
      });

      await logAction({
        userId: req.user.id,
        action: 'VERIFICATION_STARTED',
        entityType: 'Verification',
        entityId: verification.id,
      });

      const full = await prisma.verification.findUnique({
        where: { id: verification.id },
        include: { observations: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }, instrument: { include: { business: true } }, officer: true },
      });

      res.status(201).json({ success: true, verification: full });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/verifications/:id  -> full verification incl. all observations.
// This is what the frontend re-fetches on page reload to restore progress.
router.get('/:id', async (req, res, next) => {
  try {
    const verification = await prisma.verification.findUnique({
      where: { id: req.params.id },
      include: {
        observations: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        instrument: { include: { business: true } },
        officer: { select: { id: true, name: true, role: true } },
        certificate: true,
      },
    });
    if (!verification) return res.status(404).json({ success: false, message: 'Verification not found.' });
    res.json({ success: true, verification });
  } catch (err) {
    next(err);
  }
});

// PUT /api/verifications/:id -> update remarks / save draft metadata.
router.put('/:id', async (req, res, next) => {
  try {
    const { remarks, status } = req.body;
    const verification = await prisma.verification.update({
      where: { id: req.params.id },
      data: { remarks, status },
    });
    res.json({ success: true, verification });
  } catch (err) {
    next(err);
  }
});

// POST /api/verifications/:id/complete -> compute result, issue certificate + QR + PDF.
router.post('/:id/complete', authorize('ADMIN', 'LMO', 'GATC'), async (req, res, next) => {
  try {
    const verification = await prisma.verification.findUnique({
      where: { id: req.params.id },
      include: { observations: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }, instrument: { include: { business: true } }, officer: true },
    });
    if (!verification) return res.status(404).json({ success: false, message: 'Verification not found.' });
    if (verification.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Verification already completed.' });
    }

    const result = computeOverallResult(verification.observations);
    if (result === 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'All observations must be entered before completing the verification.',
      });
    }

    const validityMonths = Number(process.env.CERTIFICATE_VALIDITY_MONTHS || 12);
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + validityMonths);

    const { updatedVerification, certificate } = await prisma.$transaction(async (tx) => {
      const updatedVerification = await tx.verification.update({
        where: { id: verification.id },
        data: {
          status: 'COMPLETED',
          result,
          completedAt: new Date(),
          remarks: req.body.remarks ?? verification.remarks,
        },
      });

      let certificate = null;
      let newInstrumentStatus = result === 'PASS' ? 'VALID' : 'FAILED';

      if (result === 'PASS') {
        certificate = await tx.certificate.create({
          data: {
            certificateNumber: nextCertificateNumber(),
            verificationId: verification.id,
            validUntil,
            status: 'VALID',
            qrToken: generateQrToken(),
          },
        });
      }

      await tx.instrument.update({
        where: { id: verification.instrumentId },
        data: {
          currentStatus: newInstrumentStatus,
          nextVerificationDate: result === 'PASS' ? validUntil : null,
        },
      });

      return { updatedVerification, certificate };
    });

    let pdfPath = null;
    if (certificate) {
      pdfPath = await generateCertificatePdf({
        certificate,
        verification: updatedVerification,
        instrument: verification.instrument,
        business: verification.instrument.business,
        officer: verification.officer,
      });
      await prisma.certificate.update({ where: { id: certificate.id }, data: { pdfPath } });
    }

    await logAction({
      userId: req.user.id,
      action: 'VERIFICATION_COMPLETED',
      entityType: 'Verification',
      entityId: verification.id,
      metadata: { result },
    });
    if (certificate) {
      await logAction({
        userId: req.user.id,
        action: 'CERTIFICATE_GENERATED',
        entityType: 'Certificate',
        entityId: certificate.id,
      });
    }

    const full = await prisma.verification.findUnique({
      where: { id: verification.id },
      include: { observations: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }, certificate: true, instrument: true },
    });

    res.json({ success: true, verification: full });
  } catch (err) {
    next(err);
  }
});

// GET /api/verifications/:id/certificate -> convenience alias documented in
// the API spec; looks up the certificate issued for this verification.
router.get('/:id/certificate', async (req, res, next) => {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { verificationId: req.params.id },
    });
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'No certificate has been issued for this verification.' });
    }
    res.json({ success: true, certificate });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
