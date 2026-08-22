const prisma = require('../lib/prisma');

async function upload({ employeeId, uploadedById, name, url }) {
  return prisma.document.create({ data: { employeeId, uploadedById, name, url } });
}

async function listForEmployee(employeeId) {
  return prisma.document.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
}

module.exports = { upload, listForEmployee };
