import {
  ApprovalStatus,
  AssessmentType,
  CourseDeliveryMode,
  CourseLevel,
  CourseStatus,
  LessonContentType,
  Prisma,
  PrismaClient,
  SessionPlatform,
  SessionStatus,
  SessionType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding in-person course like VAT101 for samueltiruneh123@gmail.com...');

  // 1. Ensure user samueltiruneh123@gmail.com exists
  const targetEmail = 'samueltiruneh123@gmail.com';
  let user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash('Password123!', saltRounds);

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: targetEmail,
        password: passwordHash,
        firstName: 'Samuel',
        lastName: 'Tiruneh',
        locale: 'en',
        isActive: true,
        registrationStatus: ApprovalStatus.APPROVED,
        emailVerifiedAt: new Date(),
        emailNotifications: true,
      },
    });
    console.log(`Created user ${user.email} with id ${user.id}`);
  } else {
    // Ensure active and verified
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        registrationStatus: ApprovalStatus.APPROVED,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });
    console.log(`User ${user.email} already exists (id: ${user.id})`);
  }

  // Ensure user has LEARNER, COURSE_OWNER, and TRAINER roles
  const roles = ['LEARNER', 'COURSE_OWNER', 'TRAINER'];
  for (const role of roles) {
    await prisma.userRole.upsert({
      where: {
        userId_role: {
          userId: user.id,
          role,
        },
      },
      update: {},
      create: {
        userId: user.id,
        role,
      },
    });
  }
  console.log(`Assigned roles [${roles.join(', ')}] to ${user.email}`);

  // 2. Fetch venues for in-person allocation
  const venues = await prisma.venue.findMany({
    where: { isActive: true },
    orderBy: { capacity: 'desc' },
  });
  if (venues.length === 0) {
    throw new Error('No active venues found in database to schedule sessions!');
  }
  console.log(`Found ${venues.length} active physical venues`);

  // 3. Upsert Course VAT102 (In-Person Classroom version of VAT101)
  const courseCode = 'VAT102';

  // Check if course already exists
  const existingCourse = await prisma.course.findUnique({
    where: { code: courseCode },
  });

  if (existingCourse) {
    console.log(`Deleting existing ${courseCode} to create a clean fresh in-person delivery test course...`);
    await prisma.course.delete({ where: { id: existingCourse.id } });
  }

  const course = await prisma.course.create({
    data: {
      code: courseCode,
      title: 'VAT Practical Classroom Training & Field Compliance Lab',
      description:
        'An intensive in-person practical course on Value Added Tax: hands-on calculation of net VAT payable, verification of electronic tax invoices, and real-world taxpayer audit simulations.',
      objectives:
        'Conduct practical VAT declarations; calculate standard and zero-rated supplies; verify valid input tax documentation; perform on-site taxpayer compliance inspections.',
      level: CourseLevel.BASIC,
      category: 'Tax Administration',
      department: 'Domestic Tax Operations',
      targetAudience: 'Revenue officers, domestic tax auditors, and branch compliance staff.',
      deliveryMethod: 'classroom',
      deliveryMode: CourseDeliveryMode.IN_PERSON_ONLY,
      hasOnlineSessions: true,
      estimatedHours: 2.0,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      thumbnailUrl: '/sample.jpg',
      owners: {
        create: [{ userId: user.id }],
      },
      trainers: {
        create: [{ userId: user.id }],
      },
      approvals: {
        create: [
          {
            approverId: user.id,
            status: ApprovalStatus.APPROVED,
            decidedAt: new Date(),
            comments: 'Approved for in-person classroom delivery across MoR regional branch venues.',
          },
        ],
      },
    },
  });
  console.log(`Created course ${course.code} (id: ${course.id}) with deliveryMode: ${course.deliveryMode}`);

  // 4. Create Modules and Lessons
  const module1 = await prisma.curriculumModule.create({
    data: {
      courseId: course.id,
      title: 'Module 1: Understanding VAT & Practical Invoicing',
      description: 'Foundations of Value Added Tax and electronic tax invoice validation.',
      objectives: 'Understand standard 15% rate, exemptions, and input/output tax netting.',
      order: 0,
      durationMinutes: 40,
      passingScore: 70,
    },
  });

  const lesson11 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: '1.1 What Is VAT? Mechanics & Legal Framework',
      contentType: LessonContentType.DOCUMENT,
      durationMinutes: 20,
      order: 0,
      content: `<h2>What is VAT?</h2>
<p>Value Added Tax (VAT) is an <strong>indirect tax</strong> charged on the value added at each stage of the supply of goods and services.</p>
<ul>
  <li><p>Registered businesses <strong>collect</strong> VAT from their customers on behalf of the Ministry of Revenues.</p></li>
  <li><p>The <strong>final consumer</strong> bears the economic burden of the tax.</p></li>
  <li><p>The <strong>standard VAT rate</strong> in Ethiopia is <strong>15%</strong>.</p></li>
</ul>
<h2>Supply Classifications</h2>
<ol>
  <li><strong>Standard-rated (15%)</strong>: Taxable at standard rate.</li>
  <li><strong>Zero-rated (0%)</strong>: Taxable at 0% (e.g. exports, qualifying international transport). Input VAT is deductible.</li>
  <li><strong>Exempt supplies</strong>: No VAT charged, but related input VAT cannot be credited.</li>
</ol>`,
    },
  });

  const lesson12 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: '1.2 Practical Calculation of Net VAT Payable',
      contentType: LessonContentType.PRESENTATION,
      durationMinutes: 20,
      order: 1,
      content: `<h2>Output VAT vs Input VAT</h2>
<ul>
  <li><strong>Output VAT:</strong> VAT collected on sales supplies.</li>
  <li><strong>Input VAT:</strong> VAT paid on business purchases and imports.</li>
</ul>
<h2>Net VAT Payable Formula</h2>
<p><strong>Net VAT Payable = Output VAT − Input VAT</strong></p>
<p>If Output VAT exceeds Input VAT, the difference is paid to the Ministry. If Input VAT exceeds Output VAT, the credit is carried forward or refunded under the VAT Proclamation.</p>`,
    },
  });

  // Assessments for Module 1
  const mod1Questions = [
    {
      id: 'vat-m1-q1',
      type: 'MULTIPLE_CHOICE',
      question: 'What is the standard Value Added Tax (VAT) rate in Ethiopia?',
      options: ['15%', '10%', '20%', '5%'],
      correctAnswer: 0,
      points: 10,
    },
    {
      id: 'vat-m1-q2',
      type: 'MULTIPLE_CHOICE',
      question: 'What is the formula to calculate Net VAT Payable?',
      options: ['Output VAT − Input VAT', 'Input VAT + Output VAT', 'Sales × 10%', 'Purchases − Sales'],
      correctAnswer: 0,
      points: 10,
    },
  ];

  await prisma.assessment.create({
    data: {
      courseId: course.id,
      moduleId: module1.id,
      type: AssessmentType.MODULE_ASSESSMENT,
      titleEn: 'Module 1 Knowledge Check: VAT Mechanics',
      titleAm: 'ሞጁል 1 የዕውቀት ፍተሻ፡ የቫት አሰራር',
      descriptionEn: 'Knowledge check assessment for Module 1.',
      descriptionAm: 'የሞጁል 1 የዕውቀት ፍተሻ ፈተና።',
      passingScore: 70,
      maxAttempts: 3,
      timeLimitMinutes: 15,
      shuffleQuestions: false,
      weight: 30,
      questions: mod1Questions as unknown as Prisma.InputJsonValue,
    },
  });

  // Final Assessment
  const finalQuestions = [
    {
      id: 'vat-final-q1',
      type: 'MULTIPLE_CHOICE',
      question: 'If a business makes ETB 10,000 in sales (excl. VAT) and incurred ETB 600 in deductible Input VAT, what is the Net VAT Payable?',
      options: ['ETB 900', 'ETB 1,500', 'ETB 600', 'ETB 2,100'],
      correctAnswer: 0,
      points: 50,
    },
    {
      id: 'vat-final-q2',
      type: 'TRUE_FALSE',
      question: 'A valid fiscal tax invoice with machine-printed fiscal information is mandatory to claim Input VAT deductions.',
      options: ['True', 'False'],
      correctAnswer: 0,
      points: 50,
    },
  ];

  await prisma.assessment.create({
    data: {
      courseId: course.id,
      type: AssessmentType.FINAL_ASSESSMENT,
      titleEn: 'Final Assessment: In-Person VAT Practicum',
      titleAm: 'የመጨረሻ ፈተና፡ የቫት የተግባር ልምምድ',
      descriptionEn: 'Comprehensive final exam for the VAT In-Person Training Course.',
      descriptionAm: 'ለቫት በአካል ስልጠና ኮርስ አጠቃላይ የመጨረሻ ፈተና።',
      passingScore: 75,
      maxAttempts: 3,
      timeLimitMinutes: 30,
      shuffleQuestions: false,
      weight: 70,
      questions: finalQuestions as unknown as Prisma.InputJsonValue,
    },
  });

  // 5. In-Person Planned Sessions (CourseSessionPlan)
  const plan1 = await prisma.courseSessionPlan.create({
    data: {
      courseId: course.id,
      order: 0,
      titleEn: 'Round 1: Practical VAT Declaration & Tax Invoice Audit Lab',
      descriptionEn:
        'Hands-on classroom lab calculating net VAT, auditing tax invoices with electronic fiscal registers (FMR/CIS), and reconciling monthly returns.',
      objectivesEn:
        'Demonstrate practical calculation of net VAT payable; identify invalid tax invoices; complete electronic declaration forms accurately.',
      trainerId: user.id,
    },
  });

  const plan2 = await prisma.courseSessionPlan.create({
    data: {
      courseId: course.id,
      order: 1,
      titleEn: 'Round 2: Field Audit Simulation & Taxpayer Dispute Resolution',
      descriptionEn:
        'Classroom case study analyzing disputed tax assessments, non-compliance penalties, and conducting field audit simulations.',
      objectivesEn:
        'Apply statutory penalties for non-filing; conduct audit reconciliation interviews; draft audit assessment notices.',
      trainerId: user.id,
    },
  });

  // Create Formative Quiz for Session Plan 1
  const formativeQuestions = [
    {
      id: 'formative-q1',
      type: 'MULTIPLE_CHOICE',
      question: 'Which document is strictly required to claim an input tax deduction?',
      options: ['Valid Tax Invoice', 'Informal Cash Receipt', 'Bank Deposit Slip Only', 'Proforma Invoice'],
      correctAnswer: 0,
      points: 10,
    },
  ];

  await prisma.assessment.create({
    data: {
      courseId: course.id,
      sessionPlanId: plan1.id,
      type: AssessmentType.SESSION_ASSESSMENT,
      titleEn: 'Round 1 Formative Classroom Quiz',
      titleAm: 'ዙር 1 የክፍል ውስጥ ምዘና ፈተና',
      descriptionEn: 'Interactive live quiz conducted by the instructor during Round 1 classroom lab.',
      descriptionAm: 'በአስተማሪው የሚመራ የክፍል ውስጥ በይነተገናኝ ፈተና።',
      passingScore: 0,
      maxAttempts: 1,
      timeLimitMinutes: 10,
      shuffleQuestions: false,
      weight: 0,
      questions: formativeQuestions as unknown as Prisma.InputJsonValue,
    },
  });
  console.log(`Created 2 course session plans with formative quizzes`);

  // 6. Schedule Live In-Person Classroom Sessions across branch venues
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowAfternoon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrowAfternoon.setHours(14, 0, 0, 0);

  const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  dayAfterTomorrow.setHours(10, 0, 0, 0);

  const sessionAllocations = [
    {
      venue: venues[0], // Addis Ababa HQ - Training Hall A
      scheduledAt: tomorrow,
      titleEn: 'Round 1: Practical VAT Declaration Lab — Addis Ababa HQ',
      titleAm: 'ዙር 1፡ የተግባር የቫት ማስታወቂያ ልምምድ — አዲስ አበባ ዋና መ/ቤት',
    },
    {
      venue: venues[1] || venues[0], // Executive Lab / Hawassa
      scheduledAt: tomorrowAfternoon,
      titleEn: 'Round 1: Practical VAT Declaration Lab — Executive Lab',
      titleAm: 'ዙር 1፡ የተግባር የቫት ማስታወቂያ ልምምድ — ኤግዚክዩቲቭ ላብ',
    },
    {
      venue: venues[2] || venues[0], // Hawassa / Bahir Dar
      scheduledAt: dayAfterTomorrow,
      titleEn: 'Round 1: Practical VAT Declaration Lab — Regional Branch',
      titleAm: 'ዙር 1፡ የተግባር የቫት ማስታወቂያ ልምምድ — የክልል ቅርንጫፍ',
    },
  ];

  // Question for formative session quiz
  const qbQuestion = await prisma.questionBankQuestion.create({
    data: {
      courseId: course.id,
      createdById: user.id,
      type: 'MULTIPLE_CHOICE',
      question: 'Which document is strictly required to claim an input tax deduction?',
      options: ['Valid Tax Invoice', 'Informal Cash Receipt', 'Bank Deposit Slip Only', 'Proforma Invoice'],
      correctAnswer: '0',
      points: 10,
      category: 'VAT Invoicing',
    },
  });

  for (const alloc of sessionAllocations) {
    const liveSession = await prisma.liveSession.create({
      data: {
        courseId: course.id,
        venueId: alloc.venue.id,
        trainerId: user.id,
        originalPlanId: plan1.id,
        plannedOrder: plan1.order,
        titleEn: alloc.titleEn,
        titleAm: alloc.titleAm,
        descriptionEn: plan1.descriptionEn,
        descriptionAm: plan1.descriptionEn,
        objectivesEn: plan1.objectivesEn,
        sessionType: SessionType.IN_PERSON,
        platform: SessionPlatform.IN_PERSON,
        status: SessionStatus.SCHEDULED,
        scheduledAt: alloc.scheduledAt,
        durationMinutes: 90,
        allowViewAttendance: true,
      },
    });

    // Also attach the formative quiz to this physical session for the instructor to project
    await prisma.sessionPreparedQuiz.create({
      data: {
        sessionId: liveSession.id,
        title: 'Classroom VAT Verification Quiz',
        questions: {
          create: [
            {
              questionId: qbQuestion.id,
              order: 0,
              points: 10,
            },
          ],
        },
      },
    });

    console.log(
      `Scheduled in-person session "${alloc.titleEn}" at venue "${alloc.venue.name}" (${alloc.venue.branch}), seats: ${alloc.venue.capacity}, date: ${alloc.scheduledAt.toISOString()}`
    );
  }

  console.log(`\n======================================================`);
  console.log(`SUCCESS! IN-PERSON TEST COURSE SEEDED:`);
  console.log(`  Course Code : ${course.code}`);
  console.log(`  Title       : ${course.title}`);
  console.log(`  Delivery    : ${course.deliveryMode}`);
  console.log(`  Status      : ${course.status}`);
  console.log(`  Account     : ${user.email} (Password: Password123!)`);
  console.log(`  Roles       : ${roles.join(', ')}`);
  console.log(`  Venues      : ${sessionAllocations.length} branch classroom sessions scheduled`);
  console.log(`======================================================\n`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
