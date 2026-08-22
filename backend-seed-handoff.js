// HANDOFF FILE — not used by the app, not imported anywhere.
// This is a ready-to-drop-in replacement for backend/prisma/seed.js.
// Generated to match the roster already built and verified in web/src/lib/mock.ts —
// same 150 names, same role/department shape, same shift assignment, same join-date/
// salary/leave logic — so the real database ends up looking like what the frontend
// already demos against in mock mode.
//
// See backend-seed-handoff.md (same folder) for the schema + validator changes this
// depends on, and for what running this will actually do to your data.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

function daysAgo(n) {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - n));
}

// Deterministic PRNG (mulberry32) — re-running this script produces the same roster
// every time instead of a fresh random shuffle, which makes the seed reproducible.
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

function pick(rand, items) {
  return items[Math.floor(rand() * items.length)];
}

// level: 0 = individual contributor, 1 = senior IC, 2 = manager/lead — drives tenure and pay.
const ROLE_PLAN = [
  { department: 'Engineering', designation: 'Software Engineer', count: 8, level: 0 },
  { department: 'Engineering', designation: 'Senior Software Engineer', count: 5, level: 1 },
  { department: 'Engineering', designation: 'Staff Engineer', count: 2, level: 1 },
  { department: 'Engineering', designation: 'QA Engineer', count: 1, level: 0 },
  { department: 'Engineering', designation: 'DevOps Engineer', count: 1, level: 0 },
  { department: 'Engineering', designation: 'Engineering Manager', count: 1, level: 2 },
  { department: 'Sales', designation: 'Sales Development Representative', count: 3, level: 0 },
  { department: 'Sales', designation: 'Account Executive', count: 3, level: 0 },
  { department: 'Sales', designation: 'Senior Account Executive', count: 1, level: 1 },
  { department: 'Sales', designation: 'Sales Manager', count: 1, level: 2 },
  { department: 'Product', designation: 'Product Analyst', count: 1, level: 0 },
  { department: 'Product', designation: 'Associate Product Manager', count: 1, level: 0 },
  { department: 'Product', designation: 'Product Manager', count: 2, level: 1 },
  { department: 'Product', designation: 'Senior Product Manager', count: 1, level: 1 },
  { department: 'Design', designation: 'Product Designer', count: 3, level: 0 },
  { department: 'Design', designation: 'Senior Product Designer', count: 1, level: 1 },
  { department: 'Design', designation: 'Design Manager', count: 1, level: 2 },
  { department: 'Marketing', designation: 'Marketing Associate', count: 2, level: 0 },
  { department: 'Marketing', designation: 'Content Marketer', count: 1, level: 0 },
  { department: 'Marketing', designation: 'Growth Marketer', count: 1, level: 0 },
  { department: 'Marketing', designation: 'Marketing Manager', count: 1, level: 2 },
  { department: 'People Ops', designation: 'HR Generalist', count: 2, level: 0 },
  { department: 'People Ops', designation: 'Talent Acquisition Specialist', count: 1, level: 0 },
  { department: 'People Ops', designation: 'People Ops Coordinator', count: 1, level: 0 },
  { department: 'People Ops', designation: 'HR Manager', count: 1, level: 2 },
  { department: 'Finance', designation: 'Accountant', count: 2, level: 0 },
  { department: 'Finance', designation: 'Financial Analyst', count: 1, level: 1 },
  { department: 'Finance', designation: 'Finance Manager', count: 1, level: 2 },
];

// Same 50-role shape staffed three times over — one crew per shift.
const ROLE_PLAN_EXPANDED = ROLE_PLAN.flatMap((r) => Array.from({ length: r.count }, () => r));
const ROLES = [...ROLE_PLAN_EXPANDED, ...ROLE_PLAN_EXPANDED, ...ROLE_PLAN_EXPANDED];

const SHIFTS_PER_BLOCK = ['Shift 1', 'Shift 2', 'Shift 3'];
function shiftFor(i) {
  return SHIFTS_PER_BLOCK[Math.floor(i / 50)];
}

const NAMES = [
  // Shift 1 roster
  'Aarav Sharma', 'Vivaan Gupta', 'Aditya Verma', 'Vihaan Mehta', 'Arjun Nair',
  'Sai Reddy', 'Reyansh Iyer', 'Krishna Rao', 'Ishaan Kapoor', 'Rohan Malhotra',
  'Kabir Singh', 'Aryan Chauhan', 'Dhruv Rathore', 'Yash Thakur', 'Karan Bose',
  'Rahul Deshmukh', 'Amit Patil', 'Suresh Kulkarni', 'Nikhil Shinde', 'Varun Jadhav',
  'Aakash Bansal', 'Siddharth Agarwal', 'Rajesh Khanna', 'Vikram Sethi', 'Om Prakash Yadav',
  'Deepak Choudhary', 'Manoj Tiwari', 'Ravi Pillai', 'Ganesh Iyer', 'Arun Krishnan',
  'Ananya Iyengar', 'Diya Menon', 'Saanvi Pillai', 'Aadhya Krishnan', 'Myra Bhatt',
  'Anika Joshi', 'Navya Chatterjee', 'Kiara Banerjee', 'Riya Mukherjee', 'Ishita Sengupta',
  'Meera Pillai', 'Priya Nambiar', 'Sneha Subramaniam', 'Divya Krishnamurthy', 'Pooja Venkatesh',
  'Neha Kaur', 'Simran Gill', 'Harpreet Sandhu', 'Kavya Ramesh', 'Tanvi Desai',
  // Shift 2 roster
  'Rajat Malviya', 'Ashwin Pandey', 'Gaurav Mishra', 'Sandeep Yadav', 'Anil Kumar',
  'Vishal Saxena', 'Ajay Chopra', 'Naveen Ahuja', 'Ramesh Iyer', 'Prakash Nayak',
  'Girish Kamath', 'Harish Shetty', 'Vinod Kambli', 'Sanjay Gaikwad', 'Mahesh Bhosale',
  'Ashok Wagh', 'Vijay Naik', 'Ramesh Salvi', 'Prasad Kulkarni', 'Nitin Joshi',
  'Abhishek Tripathi', 'Manish Dubey', 'Anurag Srivastava', 'Kunal Bhatnagar', 'Rohit Saini',
  'Vishnu Prasad', 'Ramachandran Pillai', 'Venkatesh Iyer', 'Srinivasan Raman', 'Gopalakrishnan Nair',
  'Karthik Subramanian', 'Suresh Babu', 'Anand Vaidya', 'Mohan Rao', 'Kiran Kulkarni',
  'Sunil Deshpande', 'Ramesh Gowda', 'Prakash Hegde', 'Nagesh Poojary', 'Vasanth Kumar',
  'Farhan Sheikh', 'Imran Khan', 'Ayaan Ansari', 'Zaid Qureshi', 'Sameer Baig',
  'Tariq Malik', 'Waseem Ahmed', 'Salman Sheikh', 'Irfan Sheikh', 'Rizwan Sayed',
  // Shift 3 roster
  'Pallavi Kelkar', 'Snehal More', 'Vaishali Pawar', 'Manisha Chavan', 'Sarita Gaikwad',
  'Kalpana Naik', 'Rekha Sawant', 'Sushma Rane', 'Sunita Kadam', 'Nalini Bhagat',
  'Lakshmi Narayanan', 'Kavitha Raghavan', 'Deepa Krishnamoorthy', 'Radha Chandrasekaran', 'Uma Balasubramaniam',
  'Shanthi Rajagopal', 'Padma Vishwanathan', 'Geetha Sundaram', 'Malathi Ramaswamy', 'Vidya Ananthakrishnan',
  'Ritu Verma', 'Shalini Kapoor', 'Preeti Chawla', 'Anjali Bhatia', 'Nidhi Arora',
  'Swati Malhotra', 'Rashmi Sharma', 'Sonal Mehra', 'Meenal Kulkarni', 'Aparna Rao',
  'Bhavna Shah', 'Chandni Doshi', 'Falguni Trivedi', 'Hetal Shah', 'Jigna Modi',
  'Komal Vora', 'Mitali Parikh', 'Payal Thakkar', 'Ruchi Bhatt', 'Trishna Patel',
  'Amardeep Bajwa', 'Baljeet Grewal', 'Charanjeet Dhillon', 'Dilpreet Kaur', 'Ekamjot Sidhu',
  'Gagandeep Brar', 'Jasmeet Randhawa', 'Kulwant Sekhon', 'Lovepreet Chahal', 'Mandeep Kaler',
];

if (NAMES.length !== ROLES.length) {
  throw new Error(`seed: NAMES (${NAMES.length}) and ROLES (${ROLES.length}) must be the same length`);
}
if (new Set(NAMES).size !== NAMES.length) {
  throw new Error('seed: NAMES contains a duplicate full name');
}

const CITIES = [
  { city: 'Bengaluru', pin: '560025' },
  { city: 'Mumbai', pin: '400051' },
  { city: 'Pune', pin: '411014' },
  { city: 'Hyderabad', pin: '500081' },
  { city: 'Chennai', pin: '600042' },
  { city: 'Gurugram', pin: '122002' },
  { city: 'Noida', pin: '201301' },
  { city: 'Kolkata', pin: '700091' },
  { city: 'Ahmedabad', pin: '380015' },
];

function slugEmail(name) {
  const parts = name.toLowerCase().split(' ');
  return `${parts[0]}.${parts[parts.length - 1]}@dayflow.dev`;
}

// Tenure by level: managers have been around longest, then senior ICs, then ICs.
function joinDateFor(rand, level) {
  const [minDays, maxDays] = level === 2 ? [730, 1460] : level === 1 ? [365, 1095] : [20, 730];
  const daysAgoCount = Math.round(minDays + rand() * (maxDays - minDays));
  return daysAgo(daysAgoCount);
}

const LEVEL_SALARY_RANGE = { 0: [45000, 72000], 1: [78000, 115000], 2: [125000, 165000] };
const SHIFT_START_HOUR = { 'Shift 1': 6, 'Shift 2': 14, 'Shift 3': 22 };

const LEAVE_REMARKS = {
  PAID: ['Family wedding out of town.', 'Personal travel, booked in advance.', 'Attending a family function.', 'Moving apartments this week.'],
  SICK: ['Fever and body ache.', 'Dental procedure, recovering at home.', 'Down with seasonal flu.', 'Follow-up doctor visit.'],
  UNPAID: ['Extended personal travel.', 'Family emergency back home.', 'Personal reasons.', 'Passport renewal, out of station.'],
};
const APPROVE_COMMENTS = ['Approved, get well soon.', 'Approved, enjoy the trip.', 'Approved — go ahead.', 'Sure, have a good one.'];
const REJECT_COMMENTS = [
  'Team is short-staffed that week — can we look at alternate dates?',
  'Clashes with the release freeze, let’s reschedule.',
  'Too many overlapping requests already approved that week.',
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 10);

  // Wipe anything already in these tables before reseeding — required because employeeId/
  // email are unique, and this script always writes EMP-0000..EMP-0150. Delete children
  // before Employee to satisfy foreign keys. THIS DELETES EVERYTHING, including any
  // employees invited by hand through the app (e.g. test accounts).
  await prisma.auditLog.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.leave.deleteMany({});
  await prisma.payroll.deleteMany({});
  await prisma.employee.deleteMany({});

  const admin = await prisma.employee.create({
    data: {
      id: randomUUID(),
      employeeId: 'EMP-0000',
      email: 'admin@dayflow.dev',
      passwordHash,
      role: 'HR_ADMIN',
      name: 'Ava Admin',
      jobTitle: 'HR Manager',
      department: 'People Ops',
      shift: null,
      emailVerified: true,
    },
  });

  const employees = [];
  for (let i = 0; i < NAMES.length; i += 1) {
    const role = ROLES[i];
    const rand = rngFor(i + 1);
    const place = CITIES[i % CITIES.length];
    const phoneDigits = String(6 + (i % 4)) + String(100000000 + Math.floor(rand() * 899999999)).slice(0, 9);
    const employee = await prisma.employee.create({
      data: {
        id: randomUUID(),
        employeeId: `EMP-${String(i + 1).padStart(4, '0')}`,
        email: slugEmail(NAMES[i]),
        passwordHash,
        role: 'EMPLOYEE',
        name: NAMES[i],
        phone: `+91 ${phoneDigits}`,
        address: `${20 + i} ${['MG Road', 'Park Street', 'Church Street', 'Residency Road', 'Brigade Road'][i % 5]}, ${place.city} ${place.pin}`,
        jobTitle: role.designation,
        department: role.department,
        shift: shiftFor(i),
        emailVerified: true,
        createdAt: joinDateFor(rand, role.level),
      },
    });
    employees.push(employee);
  }

  // Attendance — bulk-inserted per employee (createMany), not one row at a time.
  // Nobody has attendance before their join date; Mon/Fri run a bit more absent than
  // midweek; check-in hour tracks the employee's shift instead of a flat 9am for everyone.
  for (const employee of employees) {
    const rand = rngFor(employee.employeeId.charCodeAt(employee.employeeId.length - 1) + 30);
    const joinedAt = new Date(employee.createdAt);
    joinedAt.setHours(0, 0, 0, 0);
    const rows = [];

    for (let i = 29; i >= 0; i -= 1) {
      const date = daysAgo(i);
      if (date < joinedAt) continue;
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;

      const isToday = i === 0;
      const absenceChance = dow === 1 || dow === 5 ? 0.09 : 0.04;

      if (!isToday && rand() < absenceChance) {
        rows.push({ employeeId: employee.id, date, checkIn: null, checkOut: null, status: 'ABSENT' });
        continue;
      }

      const startHour = SHIFT_START_HOUR[employee.shift] ?? 9;
      const checkIn = new Date(date);
      checkIn.setHours(startHour, Math.floor(rand() * 45), 0, 0);
      const isHalfDay = !isToday && rand() < 0.06;
      const hours = isHalfDay ? 3 + rand() : 8 + rand() * 1.5;
      const checkOut = isToday ? null : new Date(checkIn.getTime() + hours * 3600_000);
      const worked = checkOut ? (checkOut.getTime() - checkIn.getTime()) / 3600_000 : null;
      const status = !checkOut ? 'PRESENT' : worked < 4 ? 'HALF_DAY' : 'PRESENT';

      rows.push({ employeeId: employee.id, date, checkIn, checkOut, status });
    }

    if (rows.length) await prisma.attendance.createMany({ data: rows });
  }

  // Leave — roughly 4 in 10 employees have an active or recent request, spanning two
  // calendar years so a year filter on the frontend has something real to filter.
  for (let i = 0; i < employees.length; i += 1) {
    const rand = rngFor(i * 31 + 7);
    if (rand() >= 0.44) continue;

    const employee = employees[i];
    const type = rand() < 0.45 ? 'PAID' : rand() < 0.7 ? 'SICK' : 'UNPAID';
    const duration = type === 'SICK' ? 1 + (rand() < 0.2 ? 1 : 0) : 1 + Math.floor(rand() * 4);

    const bucket = rand();
    let startOffsetDaysAgo;
    let status;
    if (bucket < 0.15) {
      startOffsetDaysAgo = 200 + Math.floor(rand() * 200);
      status = rand() < 0.75 ? 'APPROVED' : 'REJECTED';
    } else if (bucket < 0.75) {
      startOffsetDaysAgo = 1 + Math.floor(rand() * 55);
      status = rand() < 0.7 ? 'APPROVED' : 'REJECTED';
    } else {
      startOffsetDaysAgo = -(1 + Math.floor(rand() * 21)); // negative = in the future
      status = 'PENDING';
    }

    const startDate = daysAgo(startOffsetDaysAgo);
    const endDate = daysAgo(startOffsetDaysAgo - (duration - 1));

    await prisma.leave.create({
      data: {
        employeeId: employee.id,
        type,
        startDate,
        endDate,
        remarks: pick(rand, LEAVE_REMARKS[type]),
        status,
        decisionById: status === 'PENDING' ? null : admin.id,
        comment: status === 'APPROVED' ? pick(rand, APPROVE_COMMENTS) : status === 'REJECTED' ? pick(rand, REJECT_COMMENTS) : null,
      },
    });
  }

  // Payroll — hire-date base salary by level, with an increment row only for anyone
  // who has actually completed a year (brand-new hires don't have a raise yet).
  const allForPayroll = [{ employee: admin, level: 2, seed: 1000 }, ...employees.map((e, i) => ({ employee: e, level: ROLES[i].level, seed: i + 1001 }))];
  for (const { employee, level, seed } of allForPayroll) {
    const rand = rngFor(seed);
    const [minSalary, maxSalary] = LEVEL_SALARY_RANGE[level];
    const base = Math.round((minSalary + rand() * (maxSalary - minSalary)) / 500) * 500;
    const joinedAt = new Date(employee.createdAt);

    await prisma.payroll.create({
      data: { employeeId: employee.id, baseSalary: base, effectiveDate: joinedAt, createdById: admin.id },
    });

    const tenureDays = Math.floor((Date.now() - joinedAt.getTime()) / 86400000);
    if (tenureDays > 365) {
      const raiseDate = new Date(joinedAt);
      raiseDate.setFullYear(raiseDate.getFullYear() + 1);
      const raised = Math.round((base * (1.08 + rand() * 0.07)) / 500) * 500;
      await prisma.payroll.create({
        data: { employeeId: employee.id, baseSalary: raised, effectiveDate: raiseDate, createdById: admin.id },
      });
    }
  }

  console.log(`Seed complete: 1 admin + ${employees.length} employees across 3 shifts.`);
  console.log('Admin login: admin@dayflow.dev / Password123');
  console.log('Any employee: <firstname>.<lastname>@dayflow.dev / Password123 (e.g. aarav.sharma@dayflow.dev)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
