const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { evaluateObservation } = require('../utils/tolerance');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// POST /api/verifications/:verificationId/observations
// Adds a new observation row to an in-progress verification (used for
// custom / extra parameters beyond the default set).
router.post(
  '/verifications/:verificationId/observations',
  authorize('ADMIN', 'LMO', 'GATC'),
  [body('parameter').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { verificationId } = req.params;
      const { parameter, unit, expectedValue, minValue, maxValue } = req.body;

      const existingCount = await prisma.observation.count({ where: { verificationId } });

      const observation = await prisma.observation.create({
        data: {
          verificationId,
          parameter,
          unit,
          expectedValue,
          minValue,
          maxValue,
          status: 'PENDING',
          sortOrder: existingCount, // append after existing rows, stable regardless of transaction timing
        },
      });

      res.status(201).json({ success: true, observation });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/observations/:id
// THE AUTOSAVE ENDPOINT. Called by the frontend on a debounced
// interval (500-1000ms after the officer stops typing). Every call is a
// real write to PostgreSQL — this is the single source of truth, not
// localStorage. Automatically re-evaluates PASS/FAIL for this row.
router.put(
  '/observations/:id',
  authorize('ADMIN', 'LMO', 'GATC'),
  [body('observationValue').optional({ nullable: true }).isString()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid observation payload.' });
      }

      const { id } = req.params;
      const { observationValue, remarks } = req.body;

      const existing = await prisma.observation.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Observation not found.' });

      const status = evaluateObservation({
        parameter: existing.parameter,
        observationValue: observationValue ?? existing.observationValue,
        expectedValue: existing.expectedValue,
        minValue: existing.minValue,
        maxValue: existing.maxValue,
      });

      const observation = await prisma.observation.update({
        where: { id },
        data: {
          observationValue: observationValue ?? existing.observationValue,
          remarks: remarks ?? existing.remarks,
          status,
          enteredAt: new Date(),
        },
      });

      res.json({ success: true, savedAt: new Date().toISOString(), observation });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/observations/:id -> remove a custom observation row.
router.delete('/observations/:id', authorize('ADMIN', 'LMO', 'GATC'), async (req, res, next) => {
  try {
    await prisma.observation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
