const bcrypt = require('bcryptjs');
const { randomInt } = require('crypto');
const prisma = require('../lib/prisma');
const { notFound, conflict } = require('../lib/errors');

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';

function pick(charset) {
  return charset[randomInt(charset.length)];
}

function generateTempPassword(length = 12) {
  const all = UPPER + LOWER + DIGITS;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  for (let i = chars.length; i < length; i += 1) chars.push(pick(all));

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const PUBLIC_FIELDS = {
  id: true,
  employeeId: true,
  email: true,
  role: true,
  name: true,
  phone: true,
  address: true,
  photoUrl: true,
  jobTitle: true,
  department: true,
  emailVerified: true,
  createdAt: true,
};

async function getById(id) {
  const employee = await prisma.employee.findUnique({ where: { id }, select: PUBLIC_FIELDS });
  if (!employee) throw notFound('Employee not found');
  return employee;
}

async function updateSelf(id, data) {
  return prisma.employee.update({ where: { id }, data, select: PUBLIC_FIELDS });
}

async function updateAsAdmin(id, data) {
  await getById(id);
  return prisma.employee.update({ where: { id }, data, select: PUBLIC_FIELDS });
}

async function list({ search }) {
  return prisma.employee.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employeeId: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: PUBLIC_FIELDS,
    orderBy: { name: 'asc' },
  });
}

async function invite({ employeeId, email, name, role, jobTitle, department }) {
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.employee.findFirst({
    where: { OR: [{ email: normalizedEmail }, { employeeId }] },
  });
  if (existing) throw conflict('An account with this email or employee ID already exists');

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const employee = await prisma.employee.create({
    data: {
      employeeId,
      email: normalizedEmail,
      passwordHash,
      role: role || 'EMPLOYEE',
      name,
      jobTitle,
      department,
      emailVerified: true,
      mustChangePassword: true,
    },
    select: PUBLIC_FIELDS,
  });

  // Returned once, here only — never stored or logged in plaintext elsewhere.
  // The admin is responsible for relaying it to the new employee out of band.
  return { employee, tempPassword };
}

module.exports = { getById, updateSelf, updateAsAdmin, list, invite, PUBLIC_FIELDS };
