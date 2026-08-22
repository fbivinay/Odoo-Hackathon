const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const leaveService = require('../services/leaveService');
const { applyLeaveSchema } = require('../validators/leaveValidators');

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = applyLeaveSchema.parse(req.body);
    const data = await leaveService.apply(req.user.id, input);
    res.status(201).json({ ok: true, data });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await leaveService.listForEmployee(req.user.id);
    res.json({ ok: true, data });
  })
);

module.exports = router;
