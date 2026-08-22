const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { unauthorized, forbidden } = require('../lib/errors');
const asyncHandler = require('./asyncHandler');

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw unauthorized('Missing or malformed Authorization header');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const employee = await prisma.employee.findUnique({ where: { id: payload.sub } });
  if (!employee) throw unauthorized('Account no longer exists');
  if (!employee.isActive) throw unauthorized('Account has been deactivated');

  req.user = { id: employee.id, role: employee.role, employeeId: employee.employeeId };
  next();
});

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'HR_ADMIN') throw forbidden('Admin access required');
  next();
};

const assertOwnership = (paramName = 'id') => (req, res, next) => {
  const targetId = req.params[paramName];
  if (req.user.role !== 'HR_ADMIN' && req.user.id !== targetId) {
    throw forbidden('You do not have access to this resource');
  }
  next();
};

module.exports = { requireAuth, requireAdmin, assertOwnership };
