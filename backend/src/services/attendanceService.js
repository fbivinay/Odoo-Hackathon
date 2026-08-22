const prisma = require('../lib/prisma');
const { badRequest, conflict } = require('../lib/errors');

// Prisma stores `@db.Date` columns using the UTC date portion of the JS Date,
// so the day boundary must be computed in UTC — using local setHours() shifted
// the stored date by a day whenever the server's local timezone wasn't UTC.
function startOfDay(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Demo data is generated on the fly instead of frozen at seed time, so the
// dashboard always has a real trailing 35-day window no matter when the app
// is opened — the seed script only ever covers days up to when it last ran.
const BACKFILL_WINDOW_DAYS = 35;
const SHIFT_START_HOUR = { 'Shift 1': 6, 'Shift 2': 14, 'Shift 3': 22 };

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// Deterministic PRNG (mulberry32) keyed on employee + date, so the same day
// always backfills to the same present/absent outcome no matter who triggers it.
function rngFor(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function ensureBackfilledForDate(date) {
  const today = startOfDay();
  const daysAgo = Math.round((today - date) / 86400000);
  if (daysAgo < 0 || daysAgo >= BACKFILL_WINDOW_DAYS) return; // outside the rolling window

  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return; // weekend — no shifts scheduled

  const employees = await prisma.employee.findMany({ where: { isActive: true } });
  if (!employees.length) return;

  const existingCount = await prisma.attendance.count({ where: { date } });
  if (existingCount >= employees.length) return; // already backfilled, fast path

  const existingIds = new Set(
    (await prisma.attendance.findMany({ where: { date }, select: { employeeId: true } })).map(
      (r) => r.employeeId,
    ),
  );

  const isToday = daysAgo === 0;
  const nowHour = new Date().getUTCHours();
  const isoDate = date.toISOString().slice(0, 10);
  const rows = [];

  for (const employee of employees) {
    if (existingIds.has(employee.id)) continue;
    if (new Date(employee.createdAt) > date) continue; // not hired yet

    const rand = rngFor(hashSeed(`${employee.id}:${isoDate}`));
    const absenceChance = dow === 1 || dow === 5 ? 0.09 : 0.04;
    if (!isToday && rand() < absenceChance) {
      rows.push({ employeeId: employee.id, date, checkIn: null, checkOut: null, status: 'ABSENT' });
      continue;
    }

    const startHour = SHIFT_START_HOUR[employee.shift] ?? 9;
    if (isToday && startHour > nowHour) continue; // shift hasn't started yet today

    const checkIn = new Date(date);
    checkIn.setUTCHours(startHour, Math.floor(rand() * 45), 0, 0);
    const isHalfDay = !isToday && rand() < 0.06;
    const hours = isHalfDay ? 3 + rand() : 8 + rand() * 1.5;
    const checkOut = isToday ? null : new Date(checkIn.getTime() + hours * 3600_000);
    const worked = checkOut ? (checkOut.getTime() - checkIn.getTime()) / 3600_000 : null;
    const status = !checkOut ? 'PRESENT' : worked < 4 ? 'HALF_DAY' : 'PRESENT';

    rows.push({ employeeId: employee.id, date, checkIn, checkOut, status });
  }

  if (rows.length) await prisma.attendance.createMany({ data: rows, skipDuplicates: true });
}

async function ensureBackfilledRange(from, to) {
  const today = startOfDay();
  const start = from ? startOfDay(from) : startOfDay(new Date(today.getTime() - (BACKFILL_WINDOW_DAYS - 1) * 86400_000));
  const end = to ? startOfDay(to) : today;

  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400_000)) {
    // eslint-disable-next-line no-await-in-loop
    await ensureBackfilledForDate(d);
  }
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
  await ensureBackfilledRange(from ? new Date(from) : undefined, to ? new Date(to) : undefined);

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
  const day = startOfDay(new Date(date));
  await ensureBackfilledForDate(day);

  return prisma.attendance.findMany({
    where: { date: day },
    include: { employee: { select: { id: true, name: true, employeeId: true } } },
    orderBy: { employee: { name: 'asc' } },
  });
}

module.exports = { checkIn, checkOut, listForEmployee, listForDate, deriveStatus };
