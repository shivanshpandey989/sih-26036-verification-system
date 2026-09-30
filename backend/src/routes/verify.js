const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../utils/prisma');
const { logAction } = require('../utils/audit');

const router = express.Router();

// Public endpoint — rate limited to prevent token-guessing / scraping.
const publicVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification requests. Please try again shortly.' },
});

// GET /api/verify/:token -> public certificate lookup, no login required.
router.get('/:token', publicVerifyLimiter, async (req, res, next) => {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { qrToken: req.params.token },
      include: {
        verification: {
          include: {
            instrument: { include: { business: true } },
            officer: { select: { name: true, role: true, organisation: true } },
          },
        },
      },
    });

    if (!certificate) {
      return res.status(404).json({ success: false, valid: false, message: 'INVALID CERTIFICATE' });
    }

    const now = new Date();
    let status = certificate.status;
    if (status === 'VALID' && certificate.validUntil < now) {
      status = 'EXPIRED';
      // Keep DB in sync so dashboards / lists reflect true status too.
      await prisma.certificate.update({ where: { id: certificate.id }, data: { status: 'EXPIRED' } });
    }

    await logAction({
      action: 'PUBLIC_CERTIFICATE_VERIFIED',
      entityType: 'Certificate',
      entityId: certificate.id,
      metadata: { ip: req.ip },
    });

    const { instrument, officer, verificationNumber, completedAt } = certificate.verification;

    res.json({
      success: true,
      valid: status === 'VALID',
      status, // VALID | EXPIRED | REVOKED
      certificate: {
        certificateNumber: certificate.certificateNumber,
        issueDate: certificate.issueDate,
        validUntil: certificate.validUntil,
      },
      verification: { verificationNumber, verificationDate: completedAt },
      instrument: {
        instrumentNumber: instrument.instrumentNumber,
        instrumentType: instrument.instrumentType,
        manufacturer: instrument.manufacturer,
        model: instrument.model,
        serialNumber: instrument.serialNumber,
      },
      business: {
        businessName: instrument.business.businessName,
        ownerName: instrument.business.ownerName,
      },
      authority: { officer: officer.name, role: officer.role, organisation: officer.organisation },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
