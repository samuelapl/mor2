import * as bcrypt from 'bcrypt';
import { PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);

  // ── Users (one per role + extras) ─────────────────────
  const users = [
    { email: 'system.admin@mor.gov.et', firstName: 'Sami', lastName: 'Admin', role: RoleName.SYSTEM_ADMIN },
    { email: 'training.admin@mor.gov.et', firstName: 'Aisha', lastName: 'Mohammed', role: RoleName.TRAINING_ADMIN },
    { email: 'owner@mor.gov.et', firstName: 'Bereket', lastName: 'Tadesse', role: RoleName.COURSE_OWNER },
    { email: 'approver@mor.gov.et', firstName: 'Selam', lastName: 'Hailu', role: RoleName.CONTENT_APPROVER },
    { email: 'trainer@mor.gov.et', firstName: 'Kebede', lastName: 'Alem', role: RoleName.TRAINER },
    { email: 'learner1@mor.gov.et', firstName: 'Meron', lastName: 'Kassa', role: RoleName.LEARNER },
    { email: 'learner2@mor.gov.et', firstName: 'Dawit', lastName: 'Tesfaye', role: RoleName.LEARNER },
    { email: 'learner3@mor.gov.et', firstName: 'Hanna', lastName: 'Girmay', role: RoleName.LEARNER },
    { email: 'learner4@mor.gov.et', firstName: 'Yonatan', lastName: 'Wolde', role: RoleName.LEARNER },
    { email: 'learner5@mor.gov.et', firstName: 'Liya', lastName: 'Birhan', role: RoleName.LEARNER },
  ];

  // Frontend demo accounts (password: password) — map directly onto seed users
  const demoAccounts = [
    { email: 'sadministrator@gmail.com', firstName: 'Sami', lastName: 'Admin', role: RoleName.SYSTEM_ADMIN },
    { email: 'tadministrator@gmail.com', firstName: 'Aisha', lastName: 'Mohammed', role: RoleName.TRAINING_ADMIN },
    { email: 'owner@gmail.com', firstName: 'Bereket', lastName: 'Tadesse', role: RoleName.COURSE_OWNER },
    { email: 'approver@gmail.com', firstName: 'Selam', lastName: 'Hailu', role: RoleName.CONTENT_APPROVER },
    { email: 'trainer@gmail.com', firstName: 'Kebede', lastName: 'Alem', role: RoleName.TRAINER },
    { email: 'learner@gmail.com', firstName: 'Meron', lastName: 'Kassa', role: RoleName.LEARNER },
  ];
  const demoPasswordHash = await bcrypt.hash('password', BCRYPT_ROUNDS);
  for (const d of demoAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) {
      console.log(`  • ${d.email} already exists — skipping`);
      continue;
    }
    const user = await prisma.user.create({
      data: {
        email: d.email,
        password: demoPasswordHash,
        firstName: d.firstName,
        lastName: d.lastName,
        isActive: true,
        roles: {
          create: { role: d.role },
        },
      },
    });
    console.log(`  ✓ ${d.email} (${d.role})`);
  }

  const createdUsers: Record<string, string> = {};
  for (const u of users) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });

    if (user) {
      console.log(`  • ${u.email} already exists — skipping`);
      createdUsers[u.role] = user.id;
      continue;
    }

    user = await prisma.user.create({
      data: {
        email: u.email,
        password: passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: true,
        roles: {
          create: { role: u.role },
        },
      },
    });
    createdUsers[u.role] = user.id;
    console.log(`  ✓ ${u.email} (${u.role})`);
  }

  // ── Courses ───────────────────────────────────────────
  const courseTemplates = [
    {
      code: 'CS101',
      titleEn: 'Computer Basics',
      titleAm: 'የኮምፒውተር መሰረታዊ ትምህርት',
      descriptionEn: 'Foundational computer literacy for Ministry staff.',
      descriptionAm: 'ለሚኒስቴሩ ሰራተኞች መሰረታዊ የኮምፒውተር እውቀት።',
      estimatedHours: 20,
    },
    {
      code: 'EXCEL101',
      titleEn: 'Advanced Excel Skills',
      titleAm: 'የላቀ የExcel ችሎታ',
      descriptionEn: 'Spreadsheet mastery: formulas, pivots, dashboards.',
      descriptionAm: 'የስፕሬድሼት ክህሎት፡ ቀመሮች፣ ፒቮት፣ ዳሽቦርዶች።',
      estimatedHours: 30,
    },
    {
      code: 'HRM101',
      titleEn: 'HR Management Fundamentals',
      titleAm: 'የሰው ሃይል አስተዳደር መሰረታዊ',
      descriptionEn: 'Core HR principles and best practices.',
      descriptionAm: 'መሰረታዊ የHR መርሆች እና ምርጥ ተሞክሮዎች።',
      estimatedHours: 25,
    },
    {
      code: 'ETHICS101',
      titleEn: 'Public Sector Ethics',
      titleAm: 'የመንግስት ሴክተር ስነምግባር',
      descriptionEn: 'Ethical conduct and integrity in public service.',
      descriptionAm: 'በህዝብ አገልግሎት ውስጥ ስነምግባር እና ታማኝነት።',
      estimatedHours: 15,
    },
    {
      code: 'CYBER101',
      titleEn: 'Cybersecurity Awareness',
      titleAm: 'የሳይበር ደህንነት ግንዛቤ',
      descriptionEn: 'Protecting ministry data and systems from threats.',
      descriptionAm: 'የሚኒስቴር መረጃዎችን እና ስርዓቶችን ከአደጋዎች መጠበቅ።',
      estimatedHours: 18,
    },
    {
      code: 'PROJ101',
      titleEn: 'Project Management Essentials',
      titleAm: 'የፕሮጀክት አስተዳደር መሰረታዊ',
      descriptionEn: 'Planning, executing, and monitoring projects.',
      descriptionAm: 'ፕሮጀክቶችን ማቀድ፣ ማስፈጸም እና መከታተል።',
      estimatedHours: 40,
    },
  ];

  for (const t of courseTemplates) {
    const existing = await prisma.course.findUnique({ where: { code: t.code } });
    if (existing) {
      console.log(`  • Course ${t.code} already exists — skipping`);
      continue;
    }

    const course = await prisma.course.create({
      data: {
        code: t.code,
        titleAm: t.titleAm,
        titleEn: t.titleEn,
        descriptionAm: t.descriptionAm,
        descriptionEn: t.descriptionEn,
        estimatedHours: t.estimatedHours,
        status: 'DRAFT',
        owners: {
          create: {
            userId: createdUsers[RoleName.COURSE_OWNER],
          },
        },
      },
    });

    console.log(`  ✓ Course ${course.code} (${t.titleEn})`);
  }

  console.log('✅ Seed complete!');
  console.log('\nDemo accounts (password: Password123!):');
  for (const u of users) {
    console.log(`  ${u.email} → ${u.role}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });