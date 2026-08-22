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

module.exports = { getCurrent, getHistory, create };
