const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');
const { badRequest, unauthorized, conflict } = require('../lib/errors');

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

async function signup({ employeeId, email, password, role, name }) {
  const existing = await prisma.employee.findFirst({
    where: { OR: [{ email }, { employeeId }] },
  });
  if (existing) throw conflict('An account with this email or employee ID already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = randomUUID();
  const verifyExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  const employee = await prisma.employee.create({
    data: {
      employeeId,
      email,
      passwordHash,
      role,
      name,
      verifyToken,
      verifyExpires,
    },
  });

  // Hackathon scope: no email provider wired up — log the verify link instead.
  console.log(`[dev] Verify email for ${email}: /api/auth/verify-email?token=${verifyToken}`);

  return { id: employee.id, employeeId: employee.employeeId, email: employee.email };
}

async function verifyEmail(token) {
  const employee = await prisma.employee.findFirst({ where: { verifyToken: token } });
  if (!employee || !employee.verifyExpires || employee.verifyExpires < new Date()) {
    throw badRequest('Verification link is invalid or expired');
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: { emailVerified: true, verifyToken: null, verifyExpires: null },
  });

  return { id: employee.id };
}

async function signin({ email, password }) {
  const employee = await prisma.employee.findUnique({ where: { email } });
  if (!employee) throw unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, employee.passwordHash);
  if (!valid) throw unauthorized('Invalid email or password');

  if (!employee.emailVerified) throw unauthorized('Please verify your email before signing in');

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
    },
  };
}

module.exports = { signup, verifyEmail, signin };
