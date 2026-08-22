const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { unauthorized } = require('../lib/errors');

async function signin({ email, password }) {
  const employee = await prisma.employee.findUnique({ where: { email: email.toLowerCase() } });
  if (!employee) throw unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, employee.passwordHash);
  if (!valid) throw unauthorized('Invalid email or password');

  const token = jwt.sign({ sub: employee.id, role: employee.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

  return {
    token,
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      email: employee.email,
      role: employee.role,
      name: employee.name,
      mustChangePassword: employee.mustChangePassword,
    },
  };
}

async function changePassword(employeeId, { currentPassword, newPassword }) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  const valid = await bcrypt.compare(currentPassword, employee.passwordHash);
  if (!valid) throw unauthorized('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.employee.update({
    where: { id: employeeId },
    data: { passwordHash, mustChangePassword: false },
  });

  return { id: employeeId };
}

module.exports = { signin, changePassword };
