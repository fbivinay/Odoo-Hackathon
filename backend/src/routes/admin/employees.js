const { Router } = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const employeeService = require('../../services/employeeService');
const { adminEditSchema } = require('../../validators/employeeValidators');

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await employeeService.list({ search: req.query.search });
    res.json({ ok: true, data });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await employeeService.getById(req.params.id);
    res.json({ ok: true, data });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = adminEditSchema.parse(req.body);
    const data = await employeeService.updateAsAdmin(req.params.id, input);
    res.json({ ok: true, data });
  })
);

module.exports = router;
