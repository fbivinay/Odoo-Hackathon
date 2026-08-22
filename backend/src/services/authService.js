const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID, createHash } = require('crypto');
const prisma = require('../lib/prisma');
const { badRequest, unauthorized, conflict } = require('../lib/errors');

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function signup({ employeeId, email, password, name }) {
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.employee.findFirst({
    where: { OR: [{ email: normalizedEmail }, { employeeId }] },
  });
  if (existing) throw conflict('An account with this email or employee ID already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = randomUUID();
  const verifyExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  const employee = await prisma.employee.create({
    data: {
      employeeId,
      email: normalizedEmail,
      passwordHash,
      role: 'EMPLOYEE',
      name,
      verifyToken: hashToken(verifyToken),
      verifyExpires,
    },
  });

  // Hackathon scope: no email provider wired up — log the verify link instead.
  // The raw token is only ever exposed here; the DB stores just its hash.
  console.log(`[dev] Verify email for ${normalizedEmail}: /api/auth/verify-email?token=${verifyToken}`);

  return { id: employee.id, employeeId: employee.employeeId, email: employee.email };
}

async function verifyEmail(token) {
  const employee = await prisma.employee.findFirst({ where: { verifyToken: hashToken(token) } });
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
  const employee = await prisma.employee.findUnique({ where: { email: email.toLowerCase() } });
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
