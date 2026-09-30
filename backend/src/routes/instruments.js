const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// GET /api/instruments?search=&status=&type=&sort=
router.get('/', async (req, res, next) => {
  try {
    const { search, status, type, sort = 'createdAt', order = 'desc' } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { instrumentNumber: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.currentStatus = status;
    if (type) where.instrumentType = type;

    // Business users only see their own instruments.
    if (req.user.role === 'BUSINESS') {
      const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
      where.businessId = business ? business.id : '__none__';
    }

    const instruments = await prisma.instrument.findMany({
      where,
      include: { business: true, verifications: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { [sort]: order === 'asc' ? 'asc' : 'desc' },
    });

    res.json({ success: true, instruments });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const instrument = await prisma.instrument.findUnique({
      where: { id: req.params.id },
      include: {
        business: true,
        verifications: {
          orderBy: { createdAt: 'desc' },
          include: { officer: { select: { name: true, role: true } }, certificate: true },
        },
      },
    });
    if (!instrument) return res.status(404).json({ success: false, message: 'Instrument not found.' });
    res.json({ success: true, instrument });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authorize('ADMIN', 'LMO', 'GATC'),
  [
    body('instrumentNumber').notEmpty(),
    body('instrumentType').notEmpty(),
    body('manufacturer').notEmpty(),
    body('businessId').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const instrument = await prisma.instrument.create({ data: req.body });
      await logAction({
        userId: req.user.id,
        action: 'INSTRUMENT_CREATED',
        entityType: 'Instrument',
        entityId: instrument.id,
      });
      res.status(201).json({ success: true, instrument });
    } catch (err) {
      next(err);
    }
  }
);

router.put('/:id', authorize('ADMIN', 'LMO', 'GATC'), async (req, res, next) => {
  try {
    const instrument = await prisma.instrument.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logAction({
      userId: req.user.id,
      action: 'INSTRUMENT_UPDATED',
      entityType: 'Instrument',
      entityId: instrument.id,
      metadata: req.body,
    });
    res.json({ success: true, instrument });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
