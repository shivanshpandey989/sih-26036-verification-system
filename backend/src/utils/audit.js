const prisma = require('./prisma');

async function logAction({ userId, action, entityType, entityId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId, metadata: metadata || undefined },
    });
  } catch (err) {
    // Never let audit logging break the primary request.
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAction };
