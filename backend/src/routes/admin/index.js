const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const employeesRouter = require('./employees');
const attendanceRouter = require('./attendance');
const leaveRouter = require('./leave');
const payrollRouter = require('./payroll');
const documentsRouter = require('./documents');

const router = Router();

router.use(requireAuth, requireAdmin);

router.use('/employees', employeesRouter);
router.use('/attendance', attendanceRouter);
router.use('/leave', leaveRouter);
router.use('/payroll', payrollRouter);
router.use('/documents', documentsRouter);

module.exports = router;
