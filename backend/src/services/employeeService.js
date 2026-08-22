const bcrypt = require('bcryptjs');
const { randomInt } = require('crypto');
const prisma = require('../lib/prisma');
const { notFound, conflict } = require('../lib/errors');
const { recordAudit } = require('./auditService');

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
  shift: true,
  isActive: true,
  emailVerified: true,
  mustChangePassword: true,
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

async function list({ search, includeInactive, page, limit } = {}) {
  const where = {
    ...(includeInactive ? {} : { isActive: true }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employeeId: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  if (!page && !limit) {
    return prisma.employee.findMany({ where, select: PUBLIC_FIELDS, orderBy: { name: 'asc' } });
  }

  const pageNum = Math.max(1, page || 1);
  const limitNum = Math.min(200, Math.max(1, limit || 25));

  const [data, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      select: PUBLIC_FIELDS,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.employee.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum };
}

async function nextEmployeeId(tx) {
  const rows = await tx.employee.findMany({ select: { employeeId: true } });
  const max = rows.reduce((m, r) => {
    const match = /^EMP-(\d+)$/.exec(r.employeeId);
    return match ? Math.max(m, parseInt(match[1], 10)) : m;
  }, 0);
  return `EMP-${String(max + 1).padStart(4, '0')}`;
}

async function invite({ email, name, role, jobTitle, department, shift }) {
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.employee.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw conflict('An account with this email already exists');

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const employee = await prisma.$transaction(async (tx) => {
    const employeeId = await nextEmployeeId(tx);
    return tx.employee.create({
      data: {
        employeeId,
        email: normalizedEmail,
        passwordHash,
        role: role || 'EMPLOYEE',
        name,
        jobTitle,
        department,
        shift,
        emailVerified: true,
        mustChangePassword: true,
      },
      select: PUBLIC_FIELDS,
    });
  });

  // Returned once, here only — never stored or logged in plaintext elsewhere.
  // The admin is responsible for relaying it to the new employee out of band.
  return { employee, tempPassword };
}

async function deactivate(id, actorId) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id } });
    if (!employee) throw notFound('Employee not found');

    const updated = await tx.employee.update({
      where: { id },
      data: { isActive: false },
      select: PUBLIC_FIELDS,
    });

    await recordAudit(tx, {
      actorId,
      action: 'EMPLOYEE_DEACTIVATE',
      entity: 'Employee',
      entityId: id,
      meta: null,
    });

    return updated;
  });
}

module.exports = { getById, updateSelf, updateAsAdmin, list, invite, deactivate, PUBLIC_FIELDS };
