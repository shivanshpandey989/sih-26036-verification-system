const express = require('express');
const path = require('path');
const fs = require('fs');
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { generateQrPngBuffer, buildVerificationUrl } = require('../utils/qr');
const { generateCertificatePdf } = require('../utils/pdf');

const router = express.Router();
router.use(authenticate);

async function canAccessCertificate(certificate, user) {
  if (!certificate) return false;
  if (['ADMIN', 'LMO', 'GATC'].includes(user.role)) return true;
  if (user.role !== 'BUSINESS') return false;

  const business = await prisma.business.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return Boolean(business && certificate.verification?.instrument?.businessId === business.id);
}

// GET /api/certificates/:id/qr -> inline PNG of the certificate's QR code,
// for display in the officer/business UI (separate from the full PDF).
router.get('/:id/qr', async (req, res, next) => {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: { verification: { include: { instrument: { select: { businessId: true } } } } },
    });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    if (!(await canAccessCertificate(certificate, req.user))) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this certificate.' });
    }
    const png = await generateQrPngBuffer(certificate.qrToken);
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: {
        verification: {
          include: { instrument: { include: { business: true } }, officer: { select: { name: true, role: true } } },
        },
      },
    });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    if (!(await canAccessCertificate(certificate, req.user))) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this certificate.' });
    }
    res.json({ success: true, certificate: { ...certificate, verificationUrl: buildVerificationUrl(certificate.qrToken) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/certificates/:id/pdf -> stream the generated PDF file.
router.get('/:id/pdf', async (req, res, next) => {
  try {
    let certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: {
        verification: {
          include: {
            instrument: { include: { business: true } },
            officer: { select: { name: true, role: true } },
          },
        },
      },
    });
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }
    if (!(await canAccessCertificate(certificate, req.user))) {
      return res.status(403).json({ success: false, message: 'You do not have permission to download this certificate.' });
    }

    // Generate the PDF on demand when this certificate was created in the
    // database but its local PDF file is missing (for example after moving
    // the project to a fresh checkout). This keeps certificate download
    // working without requiring pre-generated files to be bundled in the ZIP.
    let absolutePath = certificate.pdfPath
      ? path.join(__dirname, '..', '..', certificate.pdfPath)
      : null;

    if (!absolutePath || !fs.existsSync(absolutePath)) {
      const pdfPath = await generateCertificatePdf({
        certificate,
        verification: certificate.verification,
        instrument: certificate.verification.instrument,
        business: certificate.verification.instrument.business,
        officer: certificate.verification.officer,
      });
      certificate = await prisma.certificate.update({
        where: { id: certificate.id },
        data: { pdfPath },
        include: {
          verification: {
            include: {
              instrument: { include: { business: true } },
              officer: { select: { name: true, role: true } },
            },
          },
        },
      });
      absolutePath = path.join(__dirname, '..', '..', pdfPath);
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(500).json({ success: false, message: 'Certificate PDF could not be generated.' });
    }

    await logAction({
      userId: req.user.id,
      action: 'CERTIFICATE_DOWNLOADED',
      entityType: 'Certificate',
      entityId: certificate.id,
    });

    res.download(absolutePath, `${certificate.certificateNumber}.pdf`);
  } catch (err) {
    next(err);
  }
});

// GET /api/verifications/:verificationId/certificate -> lookup by verification.
router.get('/by-verification/:verificationId', async (req, res, next) => {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { verificationId: req.params.verificationId },
      include: { verification: { include: { instrument: { select: { businessId: true } } } } },
    });
    if (!certificate) return res.status(404).json({ success: false, message: 'No certificate for this verification.' });
    if (!(await canAccessCertificate(certificate, req.user))) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this certificate.' });
    }
    res.json({ success: true, certificate });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
