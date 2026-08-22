const { Router } = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const payrollService = require('../../services/payrollService');
const { createPayrollSchema } = require('../../validators/payrollValidators');

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createPayrollSchema.parse(req.body);
    const data = await payrollService.create(req.user.id, input);
    res.status(201).json({ ok: true, data });
  })
);

router.get(
  '/:employeeId/history',
  asyncHandler(async (req, res) => {
    const data = await payrollService.getHistory(req.params.employeeId);
    res.json({ ok: true, data });
  })
);

module.exports = router;
