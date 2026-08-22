const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRouter = require('./routes/auth');
const employeesRouter = require('./routes/employees');
const attendanceRouter = require('./routes/attendance');
const leaveRouter = require('./routes/leave');
const payrollRouter = require('./routes/payroll');
const adminRouter = require('./routes/admin');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ ok: true, data: { status: 'up' } }));

app.use('/api/auth', authRouter);
app.use('/api', employeesRouter); // exposes /api/me, /api/me/photo
app.use('/api/attendance', attendanceRouter);
app.use('/api/leave', leaveRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/admin', adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
