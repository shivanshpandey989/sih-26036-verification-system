const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalInstruments,
      pendingVerifications,
      completedVerifications,
      validCertificates,
      expiringSoon,
      expiredCertificates,
      passedCount,
      failedCount,
    ] = await Promise.all([
      prisma.instrument.count(),
      prisma.verification.count({ where: { status: { in: ['IN_PROGRESS', 'DRAFT', 'SUBMITTED'] } } }),
      prisma.verification.count({ where: { status: 'COMPLETED' } }),
      prisma.certificate.count({ where: { status: 'VALID' } }),
      prisma.instrument.count({ where: { currentStatus: 'EXPIRING_SOON' } }),
      prisma.certificate.count({ where: { status: 'EXPIRED' } }),
      prisma.verification.count({ where: { result: 'PASS' } }),
      prisma.verification.count({ where: { result: 'FAIL' } }),
    ]);

    // Monthly verification counts (last 6 months)
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    const recentVerifications = await prisma.verification.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, result: true },
    });
    const monthlyMap = {};
    recentVerifications.forEach((v) => {
      const key = v.createdAt.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      monthlyMap[key] = (monthlyMap[key] || 0) + 1;
    });
    const monthly = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

    // Instrument type breakdown
    const instrumentsByType = await prisma.instrument.groupBy({
      by: ['instrumentType'],
      _count: { _all: true },
    });

    const recentActivity = await prisma.verification.findMany({
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: {
        instrument: { select: { instrumentNumber: true, instrumentType: true } },
        officer: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      stats: {
        totalInstruments,
        pendingVerifications,
        completedVerifications,
        validCertificates,
        expiringSoon,
        expiredCertificates,
        passed: passedCount,
        failed: failedCount,
      },
      charts: {
        monthly,
        instrumentsByType: instrumentsByType.map((t) => ({ type: t.instrumentType, count: t._count._all })),
        resultBreakdown: [
          { name: 'Passed', value: passedCount },
          { name: 'Failed', value: failedCount },
        ],
      },
      recentActivity: recentActivity.map((v) => ({
        id: v.id,
        instrument: v.instrument.instrumentNumber,
        instrumentType: v.instrument.instrumentType,
        verificationNumber: v.verificationNumber,
        officer: v.officer.name,
        date: v.updatedAt,
        result: v.result,
        status: v.status,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
