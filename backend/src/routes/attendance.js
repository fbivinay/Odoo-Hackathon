const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const attendanceService = require('../services/attendanceService');

const router = Router();

router.use(requireAuth);

router.post(
  '/check-in',
  asyncHandler(async (req, res) => {
    const data = await attendanceService.checkIn(req.user.id);
    res.status(201).json({ ok: true, data });
  })
);

router.post(
  '/check-out',
  asyncHandler(async (req, res) => {
    const data = await attendanceService.checkOut(req.user.id);
    res.json({ ok: true, data });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const data = await attendanceService.listForEmployee(req.user.id, { from, to });
    res.json({ ok: true, data });
  })
);

module.exports = router;
