const { Router } = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const employeeService = require('../../services/employeeService');
const { adminEditSchema, inviteSchema } = require('../../validators/employeeValidators');

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await employeeService.list({
      search: req.query.search,
      includeInactive: req.query.includeInactive === 'true',
      page: req.query.page ? parseInt(req.query.page, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
    });
    res.json({ ok: true, data });
  })
);

router.post(
  '/invite',
  asyncHandler(async (req, res) => {
    const input = inviteSchema.parse(req.body);
    const { employee, tempPassword } = await employeeService.invite(input);
    res.status(201).json({ ok: true, data: { employee, tempPassword } });
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

router.patch(
  '/:id/deactivate',
  asyncHandler(async (req, res) => {
    const data = await employeeService.deactivate(req.params.id, req.user.id);
    res.json({ ok: true, data });
  })
);

module.exports = router;
