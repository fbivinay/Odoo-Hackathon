const { Router } = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const { badRequest } = require('../../lib/errors');
const attendanceService = require('../../services/attendanceService');

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date) throw badRequest('date query param is required (YYYY-MM-DD)');
    const data = await attendanceService.listForDate(date);
    res.json({ ok: true, data });
  })
);

module.exports = router;
