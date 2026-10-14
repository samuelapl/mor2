import { PrismaClient, QuestionType } from '@prisma/client';

export async function seedQuestionBank(prisma: PrismaClient) {
  console.log('  ❓ Seeding dedicated Question Bank questions...');

  // Identify Creator User
  const samuelUser = await prisma.user.findFirst({
    where: { email: 'samueltiruneh12@gmail.com' },
  });
  const fallbackUser = await prisma.user.findFirst({
    where: { email: 'owner@gmail.com' },
  });
  const adminUser = await prisma.user.findFirst({
    where: { email: 'sadministrator@gmail.com' },
  });

  const creatorId = samuelUser?.id || fallbackUser?.id || adminUser?.id;
  if (!creatorId) {
    console.warn('  ⚠️ No suitable user found to author question bank items. Skipping question bank seed.');
    return;
  }

  // Target VAT Courses: VAT101, VAT102, and VAT103 (if present)
  const targetCodes = ['VAT101', 'VAT102', 'VAT103'];
  const courses = await prisma.course.findMany({
    where: { code: { in: targetCodes } },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (courses.length === 0) {
    console.warn('  ⚠️ No target VAT courses found. Seed courses first.');
    return;
  }

  let totalQuestionsCount = 0;

  for (const course of courses) {
    console.log(`    Seeding 20 Question Bank questions for ${course.code}: "${course.title}"...`);

    const module1 = course.modules[0];
    const lesson1 = module1?.lessons?.[0];
    const lesson2 = module1?.lessons?.[1];

    const questionsData: Array<{
      type: QuestionType;
      question: string;
      options: string[];
      correctAnswer: string;
      points: number;
      category: string;
      courseId: string;
      moduleId: string | null;
      lessonId: string | null;
    }> = [
      // ════════════════════════════════════════════════════════════════════════
      // 1. COURSE-LEVEL QUESTIONS (10 total: 5 MCQ + 5 T/F)
      // ════════════════════════════════════════════════════════════════════════
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code}] What is the statutory standard rate of Value Added Tax (VAT) in Ethiopia?`,
        options: ['10%', '15%', '18%', '20%'],
        correctAnswer: '1',
        points: 10,
        category: 'Tax Rates & Framework',
      },
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code}] Who ultimately bears the economic burden of Value Added Tax?`,
        options: [
          'The registered supplier',
          'The Ministry of Revenues',
          'The final consumer',
          'The clearing agent',
        ],
        correctAnswer: '2',
        points: 10,
        category: 'Economic Incidence',
      },
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code}] Value Added Tax (VAT) is legally categorized as which type of tax?`,
        options: [
          'A progressive direct income tax',
          'A multi-stage broad-based consumption tax',
          'A single-stage local retail sales tax',
          'An annual corporate capital gains tax',
        ],
        correctAnswer: '1',
        points: 10,
        category: 'Tax Classification',
      },
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code}] Which fundamental mechanism prevents the cascading effect (tax on tax) in VAT?`,
        options: [
          'Withholding tax certificates',
          'Input tax deduction and credit netting',
          'Complete exemption of all wholesale distributors',
          'Annual turnover rebates',
        ],
        correctAnswer: '1',
        points: 10,
        category: 'Netting Mechanism',
      },
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code}] Which federal authority is directly mandated with administering and auditing VAT in Ethiopia?`,
        options: [
          'National Bank of Ethiopia (NBE)',
          'Ministry of Revenues (MoR)',
          'Federal Audit Commission',
          'Ministry of Trade and Regional Integration',
        ],
        correctAnswer: '1',
        points: 10,
        category: 'Tax Administration',
      },
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.TRUE_FALSE,
        question: `[${course.code}] VAT is collected incrementally at each distinct stage of production and distribution based on value added.`,
        options: ['True', 'False'],
        correctAnswer: '0',
        points: 10,
        category: 'Core Principles',
      },
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.TRUE_FALSE,
        question: `[${course.code}] Unregistered businesses are legally permitted to collect VAT on invoices provided they remit it annually.`,
        options: ['True', 'False'],
        correctAnswer: '1',
        points: 10,
        category: 'Registration Rules',
      },
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.TRUE_FALSE,
        question: `[${course.code}] Businesses that make exclusively exempt supplies are entitled to claim input VAT refunds on operational purchases.`,
        options: ['True', 'False'],
        correctAnswer: '1',
        points: 10,
        category: 'Exemptions',
      },
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.TRUE_FALSE,
        question: `[${course.code}] Commercial imported goods arriving at Ethiopian customs are subject to VAT unless specifically exempt by proclamation.`,
        options: ['True', 'False'],
        correctAnswer: '0',
        points: 10,
        category: 'Customs Imports',
      },
      {
        courseId: course.id,
        moduleId: null,
        lessonId: null,
        type: QuestionType.TRUE_FALSE,
        question: `[${course.code}] All businesses in Ethiopia must register for VAT immediately upon trade license issuance, regardless of turnover threshold.`,
        options: ['True', 'False'],
        correctAnswer: '1',
        points: 10,
        category: 'Threshold Compliance',
      },

      // ════════════════════════════════════════════════════════════════════════
      // 2. LESSON 1 LEVEL QUESTIONS (5 total: 3 MCQ + 2 T/F)
      // ════════════════════════════════════════════════════════════════════════
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson1?.id ?? null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code} - Lesson 1.1] Which statutory tax rate applies to qualifying international exports of goods and services?`,
        options: [
          'Standard Rate (15%)',
          'Zero Rate (0%)',
          'Reduced Rate (5%)',
          'Withholding Flat Rate (2%)',
        ],
        correctAnswer: '1',
        points: 10,
        category: 'Supply Classification',
      },
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson1?.id ?? null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code} - Lesson 1.1] What is the legal distinction between zero-rated supplies and exempt supplies?`,
        options: [
          'Zero-rated supplies pay 15% later; exempt supplies never pay',
          'Zero-rated supplies allow input tax credits; exempt supplies do not',
          'Exempt supplies allow input tax refunds; zero-rated supplies do not',
          'There is no difference; both terms are legally interchangeable',
        ],
        correctAnswer: '1',
        points: 10,
        category: 'Zero-Rated vs Exempt',
      },
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson1?.id ?? null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code} - Lesson 1.1] Which of the following supplies is legally classified as exempt under Ethiopian VAT law?`,
        options: [
          'Commercial hotel and luxury catering services',
          'Public domestic passenger transport and basic healthcare services',
          'Retail sales of manufactured leather goods',
          'Consulting and legal advisory services to domestic corporations',
        ],
        correctAnswer: '1',
        points: 10,
        category: 'Exempt Supply Types',
      },
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson1?.id ?? null,
        type: QuestionType.TRUE_FALSE,
        question: `[${course.code} - Lesson 1.1] A zero-rated supply is a taxable transaction, but the rate of tax applied is 0%.`,
        options: ['True', 'False'],
        correctAnswer: '0',
        points: 10,
        category: 'Zero-Rating Principles',
      },
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson1?.id ?? null,
        type: QuestionType.TRUE_FALSE,
        question: `[${course.code} - Lesson 1.1] Healthcare institutions providing exempt medical services are legally required to add 15% VAT on patient invoices.`,
        options: ['True', 'False'],
        correctAnswer: '1',
        points: 10,
        category: 'Invoicing Rules',
      },

      // ════════════════════════════════════════════════════════════════════════
      // 3. LESSON 2 LEVEL QUESTIONS (5 total: 3 MCQ + 2 T/F)
      // ════════════════════════════════════════════════════════════════════════
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson2?.id ?? null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code} - Lesson 1.2] What document is strictly mandatory to support a valid Input Tax deduction claim?`,
        options: [
          'An unverified commercial proforma invoice',
          'An official Electronic Fiscal Device (EFD) tax invoice displaying supplier and buyer TINs',
          'A handwritten debit receipt without tax breakdown',
          'A plain bank transfer receipt with no invoice attachment',
        ],
        correctAnswer: '1',
        points: 10,
        category: 'Input Tax Substantiation',
      },
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson2?.id ?? null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code} - Lesson 1.2] What is the standard statutory tax accounting period for VAT filing in Ethiopia?`,
        options: [
          'One calendar week',
          'One calendar month',
          'One fiscal quarter',
          'One fiscal tax year',
        ],
        correctAnswer: '1',
        points: 10,
        category: 'Filing Periods',
      },
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson2?.id ?? null,
        type: QuestionType.MULTIPLE_CHOICE,
        question: `[${course.code} - Lesson 1.2] By what deadline must periodic electronic VAT returns be submitted via the revenue portal?`,
        options: [
          'Within 5 days after each taxable sale',
          'On the 15th of each calendar month',
          'No later than the last day of the month following the end of the tax period',
          'At the end of the fiscal year audit cycle',
        ],
        correctAnswer: '2',
        points: 10,
        category: 'Return Deadlines',
      },
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson2?.id ?? null,
        type: QuestionType.TRUE_FALSE,
        question: `[${course.code} - Lesson 1.2] Input tax incurred on raw materials directly used to manufacture standard-rated goods is fully deductible.`,
        options: ['True', 'False'],
        correctAnswer: '0',
        points: 10,
        category: 'Deduction Entitlement',
      },
      {
        courseId: course.id,
        moduleId: module1?.id ?? null,
        lessonId: lesson2?.id ?? null,
        type: QuestionType.TRUE_FALSE,
        question: `[${course.code} - Lesson 1.2] Late filing of an electronic VAT return incurs automated statutory penalties even if the return reflects a nil balance.`,
        options: ['True', 'False'],
        correctAnswer: '0',
        points: 10,
        category: 'Compliance Penalties',
      },
    ];

    // Clean up any existing questions for this course to ensure clean idempotency
    await prisma.questionBankQuestion.deleteMany({
      where: { courseId: course.id },
    });

    for (const q of questionsData) {
      await prisma.questionBankQuestion.create({
        data: {
          courseId: q.courseId,
          moduleId: q.moduleId,
          lessonId: q.lessonId,
          subLessonId: null,
          createdById: creatorId,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          category: q.category,
        },
      });
      totalQuestionsCount++;
    }
  }

  console.log(`  ✓ Successfully seeded ${totalQuestionsCount} questions into Question Bank!`);
}

if (require.main === module) {
  const standalonePrisma = new PrismaClient();
  seedQuestionBank(standalonePrisma)
    .catch((err) => {
      console.error('❌ Error during standalone question bank seeding:', err);
      process.exit(1);
    })
    .finally(async () => {
      await standalonePrisma.$disconnect();
    });
}

