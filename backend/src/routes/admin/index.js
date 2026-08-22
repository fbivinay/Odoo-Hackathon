const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const employeesRouter = require('./employees');
const attendanceRouter = require('./attendance');
const leaveRouter = require('./leave');
const payrollRouter = require('./payroll');

const router = Router();

router.use(requireAuth, requireAdmin);

router.use('/employees', employeesRouter);
router.use('/attendance', attendanceRouter);
router.use('/leave', leaveRouter);
router.use('/payroll', payrollRouter);

module.exports = router;
