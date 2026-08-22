const prisma = require('../lib/prisma');
const { badRequest, conflict } = require('../lib/errors');

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function deriveStatus({ checkIn, checkOut }) {
  if (!checkIn) return 'ABSENT';
  if (checkIn && !checkOut) return 'PRESENT';

  const hours = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
  return hours < 4 ? 'HALF_DAY' : 'PRESENT';
}

async function checkIn(employeeId) {
  const date = startOfDay();
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (existing?.checkIn) throw conflict('Already checked in today');

  return prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date } },
    create: { employeeId, date, checkIn: new Date(), status: 'PRESENT' },
    update: { checkIn: new Date(), status: 'PRESENT' },
  });
}

async function checkOut(employeeId) {
  const date = startOfDay();
  const record = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (!record?.checkIn) throw badRequest('Must check in before checking out');
  if (record.checkOut) throw conflict('Already checked out today');

  const checkOutTime = new Date();
  return prisma.attendance.update({
    where: { employeeId_date: { employeeId, date } },
    data: {
      checkOut: checkOutTime,
      status: deriveStatus({ checkIn: record.checkIn, checkOut: checkOutTime }),
    },
  });
}

async function listForEmployee(employeeId, { from, to } = {}) {
  return prisma.attendance.findMany({
    where: {
      employeeId,
      date: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    orderBy: { date: 'desc' },
  });
}

async function listForDate(date) {
  return prisma.attendance.findMany({
    where: { date: startOfDay(new Date(date)) },
    include: { employee: { select: { id: true, name: true, employeeId: true } } },
    orderBy: { employee: { name: 'asc' } },
  });
}

module.exports = { checkIn, checkOut, listForEmployee, listForDate, deriveStatus };
