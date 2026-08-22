const prisma = require('../lib/prisma');
const { notFound } = require('../lib/errors');
const { recordAudit } = require('./auditService');

async function getCurrent(employeeId) {
  const row = await prisma.payroll.findFirst({
    where: { employeeId },
    orderBy: { effectiveDate: 'desc' },
  });
  if (!row) throw notFound('No payroll record found');
  return row;
}

async function getHistory(employeeId) {
  return prisma.payroll.findMany({ where: { employeeId }, orderBy: { effectiveDate: 'desc' } });
}

async function create(createdById, { employeeId, baseSalary, effectiveDate }) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.payroll.create({
      data: { employeeId, baseSalary, effectiveDate, createdById },
    });

    await recordAudit(tx, {
      actorId: createdById,
      action: 'PAYROLL_UPDATE',
      entity: 'Payroll',
      entityId: row.id,
      meta: { employeeId, baseSalary, effectiveDate },
    });

    return row;
  });
}

async function listCurrentForAll() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, employeeId: true, name: true, department: true, jobTitle: true },
    orderBy: { name: 'asc' },
  });

  const rows = await prisma.payroll.findMany({
    where: { employeeId: { in: employees.map((e) => e.id) } },
    orderBy: { effectiveDate: 'desc' },
  });

  const latestByEmployee = new Map();
  for (const row of rows) {
    if (!latestByEmployee.has(row.employeeId)) latestByEmployee.set(row.employeeId, row);
  }

  return employees.map((e) => ({ ...e, payroll: latestByEmployee.get(e.id) ?? null }));
}

module.exports = { getCurrent, getHistory, create, listCurrentForAll };
