const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 10);

  const admin = await prisma.employee.create({
    data: {
      employeeId: 'EMP-000',
      email: 'admin@dayflow.dev',
      passwordHash,
      role: 'HR_ADMIN',
      name: 'Ava Admin',
      jobTitle: 'HR Manager',
      department: 'People Ops',
      emailVerified: true,
    },
  });

  const employees = [];
  for (let i = 1; i <= 8; i += 1) {
    const employee = await prisma.employee.create({
      data: {
        employeeId: `EMP-00${i}`,
        email: `employee${i}@dayflow.dev`,
        passwordHash,
        role: 'EMPLOYEE',
        name: `Employee ${i}`,
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        emailVerified: true,
      },
    });
    employees.push(employee);
  }

  for (const employee of employees) {
    for (let d = 0; d < 30; d += 1) {
      const date = daysAgo(d);
      const isWeekend = [0, 6].includes(date.getDay());
      if (isWeekend) continue;

      const roll = Math.random();
      let status = 'PRESENT';
      let checkIn = new Date(date);
      checkIn.setHours(9, 0, 0, 0);
      let checkOut = new Date(date);
      checkOut.setHours(18, 0, 0, 0);

      if (roll < 0.05) {
        status = 'ABSENT';
        checkIn = null;
        checkOut = null;
      } else if (roll < 0.1) {
        status = 'HALF_DAY';
        checkOut.setHours(13, 0, 0, 0);
      }

      await prisma.attendance.create({
        data: { employeeId: employee.id, date, checkIn, checkOut, status },
      });
    }
  }

  const leaveSeeds = [
    { employee: employees[0], type: 'SICK', status: 'APPROVED', offset: 10 },
    { employee: employees[1], type: 'PAID', status: 'PENDING', offset: -3 },
    { employee: employees[2], type: 'UNPAID', status: 'REJECTED', offset: 5 },
    { employee: employees[3], type: 'PAID', status: 'PENDING', offset: -7 },
    { employee: employees[4], type: 'SICK', status: 'APPROVED', offset: 2 },
  ];

  for (const seed of leaveSeeds) {
    const start = daysAgo(seed.offset);
    const end = daysAgo(seed.offset - 1 < 0 ? seed.offset - 1 : seed.offset);
    await prisma.leave.create({
      data: {
        employeeId: seed.employee.id,
        type: seed.type,
        startDate: start,
        endDate: end > start ? end : start,
        remarks: 'Seeded leave request',
        status: seed.status,
        decisionById: seed.status === 'PENDING' ? null : admin.id,
        comment: seed.status === 'PENDING' ? null : 'Reviewed by HR',
      },
    });
  }

  for (const employee of employees.slice(0, 2)) {
    await prisma.payroll.create({
      data: {
        employeeId: employee.id,
        baseSalary: 60000,
        effectiveDate: daysAgo(180),
        createdById: admin.id,
      },
    });
    await prisma.payroll.create({
      data: {
        employeeId: employee.id,
        baseSalary: 66000,
        effectiveDate: daysAgo(30),
        createdById: admin.id,
      },
    });
  }

  console.log('Seed complete. Admin login: admin@dayflow.dev / Password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
