const { Router } = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const leaveService = require('../../services/leaveService');
const { decisionSchema } = require('../../validators/leaveValidators');

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await leaveService.listAll({ status: req.query.status });
    res.json({ ok: true, data });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = decisionSchema.parse(req.body);
    const data = await leaveService.decide(req.params.id, req.user.id, input);
    res.json({ ok: true, data });
  })
);

module.exports = router;
