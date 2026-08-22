const prisma = require('../lib/prisma');
const { notFound } = require('../lib/errors');

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

module.exports = { getById, updateSelf, updateAsAdmin, list, PUBLIC_FIELDS };
