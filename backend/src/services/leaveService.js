const prisma = require('../lib/prisma');
const { conflict, badRequest, notFound } = require('../lib/errors');
const { recordAudit } = require('./auditService');

async function apply(employeeId, { type, startDate, endDate, remarks }) {
  return prisma.$transaction(async (tx) => {
    const overlapping = await tx.leave.findFirst({
      where: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping) throw conflict('You already have a leave request overlapping these dates');

    const leave = await tx.leave.create({
      data: { employeeId, type, startDate, endDate, remarks },
    });

    await recordAudit(tx, {
      actorId: employeeId,
      action: 'LEAVE_APPLY',
      entity: 'Leave',
      entityId: leave.id,
      meta: { type, startDate, endDate },
    });

    return leave;
  });
}

async function listForEmployee(employeeId) {
  return prisma.leave.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
}

async function listAll({ status } = {}) {
  return prisma.leave.findMany({
    where: status ? { status } : undefined,
    include: { employee: { select: { id: true, name: true, employeeId: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function decide(leaveId, decidedById, { status, comment }) {
  return prisma.$transaction(async (tx) => {
    const leave = await tx.leave.findUnique({ where: { id: leaveId } });
    if (!leave) throw notFound('Leave request not found');
    if (leave.status !== 'PENDING') throw badRequest('Only pending requests can be decided');

    const updated = await tx.leave.update({
      where: { id: leaveId },
      data: { status, comment, decisionById: decidedById },
    });

    if (status === 'APPROVED') {
      const dates = [];
      const cursor = new Date(leave.startDate);
      while (cursor <= leave.endDate) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      await Promise.all(
        dates.map((date) =>
          tx.attendance.upsert({
            where: { employeeId_date: { employeeId: leave.employeeId, date } },
            create: { employeeId: leave.employeeId, date, status: 'LEAVE' },
            update: { status: 'LEAVE' },
          })
        )
      );
    }

    await recordAudit(tx, {
      actorId: decidedById,
      action: `LEAVE_${status}`,
      entity: 'Leave',
      entityId: leaveId,
      meta: { comment },
    });

    return updated;
  });
}

module.exports = { apply, listForEmployee, listAll, decide };
