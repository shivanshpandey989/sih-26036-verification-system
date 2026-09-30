const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const businesses = await prisma.business.findMany({ orderBy: { businessName: 'asc' } });
    res.json({ success: true, businesses });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('ADMIN', 'BUSINESS'), async (req, res, next) => {
  try {
    const { businessName, ownerName, address, phone, email } = req.body;
    const business = await prisma.business.create({
      data: {
        businessName,
        ownerName,
        address,
        phone,
        email,
        userId: req.user.role === 'BUSINESS' ? req.user.id : undefined,
      },
    });
    res.status(201).json({ success: true, business });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
