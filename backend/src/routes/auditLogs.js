const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const { action, userId, page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, role: true } } },
        orderBy: { timestamp: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, logs, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
