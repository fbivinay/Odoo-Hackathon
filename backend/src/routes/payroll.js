const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const payrollService = require('../services/payrollService');

const router = Router();

router.use(requireAuth);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const data = await payrollService.getCurrent(req.user.id);
    res.json({ ok: true, data });
  })
);

module.exports = router;
