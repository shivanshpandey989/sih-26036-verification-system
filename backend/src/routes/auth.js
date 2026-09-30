const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { signToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();

router.post(
  '/login',
  [body('email').isEmail(), body('password').isLength({ min: 4 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid email or password format.' });
      }
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

      const token = signToken({ id: user.id, role: user.role, name: user.name, email: user.email });
      await logAction({ userId: user.id, action: 'USER_LOGIN', entityType: 'User', entityId: user.id });

      const { passwordHash, ...safeUser } = user;
      res.json({ success: true, token, user: safeUser });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { business: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
