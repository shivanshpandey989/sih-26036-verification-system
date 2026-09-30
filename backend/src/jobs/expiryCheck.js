const cron = require('node-cron');
const prisma = require('../utils/prisma');

const ALERT_DAYS = Number(process.env.EXPIRY_ALERT_DAYS || 30);

async function runExpiryCheck() {
  const now = new Date();
  const alertThreshold = new Date();
  alertThreshold.setDate(alertThreshold.getDate() + ALERT_DAYS);

  // 1) Mark instruments whose certificate is within the alert window as EXPIRING_SOON.
  const expiringSoon = await prisma.instrument.findMany({
    where: {
      currentStatus: 'VALID',
      nextVerificationDate: { lte: alertThreshold, gt: now },
    },
  });

  for (const instrument of expiringSoon) {
    await prisma.instrument.update({
      where: { id: instrument.id },
      data: { currentStatus: 'EXPIRING_SOON' },
    });

    const business = await prisma.business.findUnique({
      where: { id: instrument.businessId },
      include: { user: true },
    });
    if (business?.userId) {
      await prisma.notification.create({
        data: {
          userId: business.userId,
          instrumentId: instrument.id,
          type: 'EXPIRY_WARNING',
          message: `Instrument ${instrument.instrumentNumber} is due for re-verification on ${instrument.nextVerificationDate.toDateString()}.`,
        },
      });
    }
  }

  // 2) Mark instruments/certificates already past their validity as EXPIRED.
  const expired = await prisma.instrument.findMany({
    where: {
      currentStatus: { in: ['VALID', 'EXPIRING_SOON'] },
      nextVerificationDate: { lte: now },
    },
  });

  for (const instrument of expired) {
    await prisma.instrument.update({
      where: { id: instrument.id },
      data: { currentStatus: 'EXPIRED' },
    });
    await prisma.certificate.updateMany({
      where: { verification: { instrumentId: instrument.id }, status: 'VALID' },
      data: { status: 'EXPIRED' },
    });

    const business = await prisma.business.findUnique({
      where: { id: instrument.businessId },
      include: { user: true },
    });
    if (business?.userId) {
      await prisma.notification.create({
        data: {
          userId: business.userId,
          instrumentId: instrument.id,
          type: 'EXPIRED',
          message: `The certificate for instrument ${instrument.instrumentNumber} has expired. Please apply for re-verification.`,
        },
      });
    }
  }

  console.log(`[expiryCheck] ran at ${now.toISOString()} — ${expiringSoon.length} expiring soon, ${expired.length} expired`);
}

function scheduleExpiryCheck() {
  // Runs once a day at 02:00 server time. Also run once at boot so the
  // demo reflects correct statuses immediately without waiting.
  cron.schedule('0 2 * * *', runExpiryCheck);
  runExpiryCheck().catch((err) => console.error('Initial expiry check failed:', err));
}

module.exports = { scheduleExpiryCheck, runExpiryCheck };
