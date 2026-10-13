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

  // 2.1 Seed at least 2 In-Person Trainers for each branch venue
  console.log('Seeding specialized In-Person Trainers (2 per branch venue)...');
  const seededBranchTrainers: Record<string, any[]> = {};

  for (const venue of venues) {
    seededBranchTrainers[venue.id] = [];
    const branchPrefix = venue.branch.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (let tNum = 1; tNum <= 2; tNum++) {
      const trainerEmail = `trainer.${branchPrefix}.${tNum}@mor.gov.et`;
      const trainerFirstName = `${venue.branch.split(' ')[0]}Trainer`;
      const trainerLastName = `Specialist${tNum}`;

      const tUser = await prisma.user.upsert({
        where: { email: trainerEmail },
        update: {
          primaryVenueId: venue.id,
          trainerType: 'IN_PERSON',
          isActive: true,
          registrationStatus: ApprovalStatus.APPROVED,
        },
        create: {
          email: trainerEmail,
          password: passwordHash,
          firstName: trainerFirstName,
          lastName: trainerLastName,
          phone: `+251911${Math.floor(100000 + Math.random() * 900000)}`,
          locale: 'en',
          isActive: true,
          registrationStatus: ApprovalStatus.APPROVED,
          primaryVenueId: venue.id,
          trainerType: 'IN_PERSON',
          emailVerifiedAt: new Date(),
        },
      });

      await prisma.userRole.upsert({
        where: { userId_role: { userId: tUser.id, role: 'TRAINER' } },
        update: {},
        create: { userId: tUser.id, role: 'TRAINER' },
      });

      seededBranchTrainers[venue.id].push(tUser);
      console.log(`  ✓ Seeded In-Person Trainer ${tUser.email} for "${venue.branch}" (Venue: ${venue.name})`);
    }
  }

  // Also seed dedicated Online Trainers
  for (let oNum = 1; oNum <= 2; oNum++) {
    const onlineEmail = `trainer.online.${oNum}@mor.gov.et`;
    const oUser = await prisma.user.upsert({
      where: { email: onlineEmail },
      update: {
        trainerType: 'ONLINE',
        primaryVenueId: null,
        isActive: true,
        registrationStatus: ApprovalStatus.APPROVED,
      },
      create: {
        email: onlineEmail,
        password: passwordHash,
        firstName: `OnlineTrainer`,
        lastName: `Virtual${oNum}`,
        phone: `+251922${Math.floor(100000 + Math.random() * 900000)}`,
        locale: 'en',
        isActive: true,
        registrationStatus: ApprovalStatus.APPROVED,
        primaryVenueId: null,
        trainerType: 'ONLINE',
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.userRole.upsert({
      where: { userId_role: { userId: oUser.id, role: 'TRAINER' } },
      update: {},
      create: { userId: oUser.id, role: 'TRAINER' },
    });
    console.log(`  ✓ Seeded Pure Online Trainer ${oUser.email}`);
  }

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

  // 5. In-Person Planned Classroom Sessions (CourseSessionPlan)
  const plan1 = await prisma.courseSessionPlan.create({
    data: {
      courseId: course.id,
      order: 0,
      titleEn: 'Classroom Session 1: Practical VAT Filing & Tax Invoice Audit Workshop',
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
      titleEn: 'Classroom Session 2: Branch EFD Compliance & Field Inspection Lab',
      descriptionEn:
        'Classroom case study analyzing disputed tax assessments, non-compliance penalties, and conducting field audit simulations.',
      objectivesEn:
        'Apply statutory penalties for non-filing; conduct audit reconciliation interviews; draft audit assessment notices.',
      trainerId: user.id,
    },
  });

  // Create Formative Quiz for Classroom Session 1 & 2
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
      titleEn: 'Classroom Session 1 Formative Quiz',
      titleAm: 'የመማሪያ ክፍል ክፍለ-ጊዜ 1 ምዘና ፈተና',
      descriptionEn: 'Interactive live quiz conducted by the instructor during Classroom Session 1.',
      descriptionAm: 'በአስተማሪው የሚመራ የክፍል ውስጥ በይነተገናኝ ፈተና።',
      passingScore: 0,
      maxAttempts: 1,
      timeLimitMinutes: 10,
      shuffleQuestions: false,
      weight: 0,
      questions: formativeQuestions as unknown as Prisma.InputJsonValue,
    },
  });
  console.log(`Created 2 planned Classroom Sessions with formative quizzes`);

  // 6. Schedule Round 1 and Round 2 (each Round contains Classroom Session 1 & Classroom Session 2)
  const now = new Date();
  const round1Day1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  round1Day1.setHours(9, 30, 0, 0);
  const round1Day2 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  round1Day2.setHours(9, 30, 0, 0);

  const round2Day1 = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  round2Day1.setHours(14, 0, 0, 0);
  const round2Day2 = new Date(now.getTime() + 96 * 60 * 60 * 1000);
  round2Day2.setHours(14, 0, 0, 0);

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

  const venueA = venues[0];
  const venueB = venues[1] || venues[0];

  const trainerA = seededBranchTrainers[venueA.id]?.[0] || user;
  const trainerB = seededBranchTrainers[venueB.id]?.[0] || user;

  const roundSchedules = [
    {
      roundNumber: 1,
      rescheduleStatus: 'ROUND_1',
      venue: venueA,
      trainer: trainerA,
      isFirstRound: true,
      slots: [
        { plan: plan1, scheduledAt: round1Day1, durationMinutes: 90 },
        { plan: plan2, scheduledAt: round1Day2, durationMinutes: 90 },
      ],
    },
    {
      roundNumber: 1,
      rescheduleStatus: 'ROUND_1',
      venue: venueB,
      trainer: trainerB,
      isFirstRound: false,
      slots: [
        { plan: plan1, scheduledAt: round1Day1, durationMinutes: 90 },
        { plan: plan2, scheduledAt: round1Day2, durationMinutes: 90 },
      ],
    },
    {
      roundNumber: 2,
      rescheduleStatus: 'ROUND_2',
      venue: venueA,
      trainer: trainerA,
      isFirstRound: false,
      slots: [
        { plan: plan1, scheduledAt: round2Day1, durationMinutes: 90 },
        { plan: plan2, scheduledAt: round2Day2, durationMinutes: 90 },
      ],
    },
    {
      roundNumber: 2,
      rescheduleStatus: 'ROUND_2',
      venue: venueB,
      trainer: trainerB,
      isFirstRound: false,
      slots: [
        { plan: plan1, scheduledAt: round2Day1, durationMinutes: 90 },
        { plan: plan2, scheduledAt: round2Day2, durationMinutes: 90 },
      ],
    },
  ];

  for (const round of roundSchedules) {
    for (const slot of round.slots) {
      const liveSession = await prisma.liveSession.create({
        data: {
          courseId: course.id,
          venueId: round.venue.id,
          trainerId: round.trainer.id,
          sessionPlanId: round.isFirstRound ? slot.plan.id : null,
          originalPlanId: slot.plan.id,
          plannedOrder: slot.plan.order,
          rescheduleStatus: round.rescheduleStatus,
          titleEn: slot.plan.titleEn,
          titleAm: slot.plan.titleEn,
          descriptionEn: slot.plan.descriptionEn,
          descriptionAm: slot.plan.descriptionEn,
          objectivesEn: slot.plan.objectivesEn,
          sessionType: SessionType.IN_PERSON,
          platform: SessionPlatform.IN_PERSON,
          status: SessionStatus.SCHEDULED,
          scheduledAt: slot.scheduledAt,
          durationMinutes: slot.durationMinutes,
          allowViewAttendance: true,
        },
      });

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
        `Scheduled [Round ${round.roundNumber}] "${slot.plan.titleEn}" at venue "${round.venue.name}" (${round.venue.branch}) with Trainer ${round.trainer.firstName} ${round.trainer.lastName}, date: ${slot.scheduledAt.toISOString()}`,
      );
    }
  }

  console.log(`\n======================================================`);
  console.log(`SUCCESS! MULTI-BRANCH IN-PERSON TEST COURSE & TRAINERS SEEDED:`);
  console.log(`  Course Code : ${course.code}`);
  console.log(`  Title       : ${course.title}`);
  console.log(`  Delivery    : ${course.deliveryMode}`);
  console.log(`  Status      : ${course.status}`);
  console.log(`  Account     : ${user.email} (Password: Password123!)`);
  console.log(`  Roles       : ${roles.join(', ')}`);
  console.log(`  Rounds      : Round 1 at "${venueA.branch}" & Round 2 at "${venueB.branch}"`);
  console.log(`  Trainers    : 2 In-Person Trainers seeded for each branch venue`);
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
