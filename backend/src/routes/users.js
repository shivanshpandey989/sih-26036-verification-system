const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'LMO', 'GATC'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: req.user.role === 'ADMIN' ? undefined : { role: 'BUSINESS' },
      select: { id: true, name: true, email: true, phone: true, role: true, organisation: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('ADMIN', 'LMO', 'GATC'), async (req, res, next) => {
  try {
    const { name, email, phone, password, role, organisation } = req.body;
    // LMO/GATC can onboard Business accounts only. Admin retains full user creation access.
    const createdRole = req.user.role === 'ADMIN' ? role : 'BUSINESS';
    if (!name || !email || !password || !createdRole) {
      return res.status(400).json({ success: false, message: 'name, email, password and role are required.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), phone, passwordHash, role: createdRole, organisation },
    });
    await logAction({ userId: req.user.id, action: 'USER_CREATED', entityType: 'User', entityId: user.id });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ success: true, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/notifications -> current user's notifications.
router.get('/me/notifications', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
});

router.put('/me/notifications/:id/read', async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ success: true, notification });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
