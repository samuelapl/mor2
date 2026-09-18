/**
 * ADDITIVE seed: creates 6 new courses (one per CourseStatus) owned/taught by
 * the EXISTING gmail.com demo actors already in this DB — does NOT touch or
 * delete any existing course/user/progress data. Each course gets 2 modules
 * (4 lessons total), a MODULE_ASSESSMENT, a LESSON_ASSESSMENT, and a
 * FINAL_ASSESSMENT, plus a "/sample.jpg" cover, so real curriculum content
 * (with all three assessment levels) can be exercised end to end.
 *
 * Run:  cd backend && npx ts-node prisma/seed-more-courses.ts
 */
import {
  AssessmentType,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();
const COVER = '/sample.jpg';

interface QuestionSeed {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  correctAnswer: number | string;
}

interface CourseSeed {
  code: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string;
  status: CourseStatus;
  level: CourseLevel;
  estimatedHours: number;
}

const MCQ = (id: string, question: string, options: string[], correctAnswer: number): QuestionSeed => ({
  id,
  type: 'MULTIPLE_CHOICE',
  question,
  options,
  correctAnswer,
});

const asQuestions = (qs: QuestionSeed[]): Prisma.InputJsonValue => qs as unknown as Prisma.InputJsonValue;

const COURSE_SEEDS: CourseSeed[] = [
  {
    code: 'GRAPH101',
    titleEn: 'Graphic Design Fundamentals',
    titleAm: 'የግራፊክ ዲዛይን መሰረታዊ',
    descriptionEn: 'Core visual design principles: color theory, typography, and layout for government publications.',
    status: CourseStatus.DRAFT,
    level: CourseLevel.BASIC,
    estimatedHours: 18,
  },
  {
    code: 'NEG201',
    titleEn: 'Negotiation Skills for Public Servants',
    titleAm: 'ለሲቪል ሰርቫንቶች የድርድር ክህሎት',
    descriptionEn: 'Practical negotiation techniques for inter-agency agreements and vendor contracts.',
    status: CourseStatus.PENDING_APPROVAL,
    level: CourseLevel.INTERMEDIATE,
    estimatedHours: 14,
  },
  {
    code: 'TAX301',
    titleEn: 'Tax Administration Systems',
    titleAm: 'የግብር አስተዳደር ስርዓቶች',
    descriptionEn: 'Modern e-filing, assessment, and audit workflows used across the Ministry of Revenues.',
    status: CourseStatus.APPROVED,
    level: CourseLevel.ADVANCED,
    estimatedHours: 30,
  },
  {
    code: 'SOC201',
    titleEn: 'Social Media for Government Communication',
    titleAm: 'ለመንግስት ኮሙኒኬሽን ማህበራዊ ሚዲያ',
    descriptionEn: 'Crafting clear, accurate public announcements across official social channels.',
    status: CourseStatus.REJECTED,
    level: CourseLevel.BASIC,
    estimatedHours: 10,
  },
  {
    code: 'CLOUD201',
    titleEn: 'Cloud Computing Basics',
    titleAm: 'የክላውድ ኮምፒዩቲንግ መሰረታዊ',
    descriptionEn: 'Understanding cloud storage, virtual machines, and basic security for office IT staff.',
    status: CourseStatus.PUBLISHED,
    level: CourseLevel.INTERMEDIATE,
    estimatedHours: 22,
  },
  {
    code: 'LEGACY101',
    titleEn: 'Legacy Systems Migration',
    titleAm: 'የነባር ስርዓቶች ሽግግር',
    descriptionEn: 'Planning a safe migration off end-of-life record-keeping systems.',
    status: CourseStatus.ARCHIVED,
    level: CourseLevel.ADVANCED,
    estimatedHours: 26,
  },
];

async function main() {
  const [owner, trainer, approver, learner] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'owner@gmail.com' } }),
    prisma.user.findUnique({ where: { email: 'trainer@gmail.com' } }),
    prisma.user.findUnique({ where: { email: 'approver@gmail.com' } }),
    prisma.user.findUnique({ where: { email: 'learner@gmail.com' } }),
  ]);

  if (!owner || !trainer || !approver || !learner) {
    throw new Error(
      'Missing gmail.com demo actors (owner@/trainer@/approver@/learner@gmail.com). ' +
        'These must already exist — this script does not create new actors.',
    );
  }
  console.log(`Using actors: owner=${owner.email}, trainer=${trainer.email}, approver=${approver.email}, learner=${learner.email}`);

  let created = 0;
  for (const c of COURSE_SEEDS) {
    const existing = await prisma.course.findUnique({ where: { code: c.code } });
    if (existing) {
      console.log(`  ⏭  ${c.code} already exists — skipping`);
      continue;
    }

    const approvalStatus =
      c.status === CourseStatus.APPROVED || c.status === CourseStatus.PUBLISHED
        ? 'APPROVED'
        : c.status === CourseStatus.REJECTED || c.status === CourseStatus.ARCHIVED
          ? 'REJECTED'
          : 'PENDING';

    // 1. Course + modules + lessons (no assessments yet — need module/lesson ids first).
    const course = await prisma.course.create({
      data: {
        code: c.code,
        titleEn: c.titleEn,
        titleAm: c.titleAm,
        descriptionEn: c.descriptionEn,
        descriptionAm: c.descriptionEn,
        estimatedHours: c.estimatedHours,
        status: c.status,
        level: c.level,
        thumbnailUrl: COVER,
        publishedAt: c.status === CourseStatus.PUBLISHED ? new Date() : null,
        owners: { create: [{ userId: owner.id }] },
        trainers: { create: [{ userId: trainer.id }] },
        approvals:
          c.status !== CourseStatus.DRAFT
            ? {
                create: [
                  {
                    approverId: approver.id,
                    status: approvalStatus,
                    decidedAt: approvalStatus !== 'PENDING' ? new Date() : null,
                  },
                ],
              }
            : undefined,
        modules: {
          create: [
            {
              titleEn: 'Foundations',
              titleAm: 'መሰረቶች',
              order: 1,
              durationMinutes: 40,
              lessons: {
                create: [
                  {
                    titleEn: `Introduction to ${c.titleEn}`,
                    titleAm: c.titleAm,
                    contentType: 'DOCUMENT',
                    contentEn: `An overview of ${c.titleEn.toLowerCase()} and why it matters for your role.`,
                    durationMinutes: 20,
                    order: 1,
                  },
                  {
                    titleEn: 'Core Concepts',
                    titleAm: 'መሰረታዊ ጽንሰ-ሀሳቦች',
                    contentType: 'VIDEO',
                    contentEn: 'Key terminology and the workflow you will use day to day.',
                    durationMinutes: 25,
                    order: 2,
                  },
                ],
              },
            },
            {
              titleEn: 'Applied Practice',
              titleAm: 'ተግባራዊ ልምምድ',
              order: 2,
              durationMinutes: 35,
              lessons: {
                create: [
                  {
                    titleEn: 'Hands-On Walkthrough',
                    titleAm: 'ተግባራዊ መመሪያ',
                    contentType: 'PRESENTATION',
                    contentEn: 'A worked example applying what you learned in Module 1.',
                    durationMinutes: 30,
                    order: 1,
                  },
                  {
                    titleEn: 'Common Pitfalls',
                    titleAm: 'የተለመዱ ስህተቶች',
                    contentType: 'DOCUMENT',
                    contentEn: 'Mistakes to avoid, drawn from real office cases.',
                    durationMinutes: 15,
                    order: 2,
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
      },
    });

    const module1 = course.modules[0];
    const lessonForAssessment = module1.lessons[1]; // "Core Concepts"

    // 2. Module assessment (Module 1), lesson assessment (Module 1 / Lesson 2), final assessment.
    await prisma.assessment.createMany({
      data: [
        {
          courseId: course.id,
          moduleId: module1.id,
          type: AssessmentType.MODULE_ASSESSMENT,
          titleEn: `${module1.titleEn} Knowledge Check`,
          titleAm: 'የሞዱል ፈተና',
          passingScore: 60,
          maxAttempts: 3,
          questions: asQuestions([
            MCQ('m1', `What is the main focus of "${module1.titleEn}"?`, [
              'Unrelated trivia',
              'Foundational concepts for this course',
              'Advanced edge cases only',
              'None of the above',
            ], 1),
            MCQ('m2', 'Should you complete lessons in order?', ['No', 'Yes'], 1),
          ]),
        },
        {
          courseId: course.id,
          moduleId: module1.id,
          lessonId: lessonForAssessment.id,
          type: AssessmentType.LESSON_ASSESSMENT,
          titleEn: `${lessonForAssessment.titleEn} Check`,
          titleAm: 'የትምህርት ፈተና',
          passingScore: 60,
          maxAttempts: 3,
          questions: asQuestions([
            MCQ('l1', 'Does this lesson build on the introduction?', ['No', 'Yes'], 1),
            MCQ('l2', 'Is hands-on practice covered in the next module?', ['Yes', 'No'], 0),
          ]),
        },
        {
          courseId: course.id,
          type: AssessmentType.FINAL_ASSESSMENT,
          titleEn: `${c.titleEn} Final Assessment`,
          titleAm: 'የመጨረሻ ፈተና',
          passingScore: 60,
          maxAttempts: 3,
          questions: asQuestions([
            MCQ('f1', `"${c.titleEn}" is primarily about:`, [
              c.titleEn,
              'Something else entirely',
              'A different course',
              'None of the above',
            ], 0),
            MCQ('f2', 'Did you complete every module before this final assessment?', ['Yes', 'No'], 0),
            MCQ('f3', 'Applied practice comes before or after foundations?', ['After', 'Before'], 0),
          ]),
        },
      ],
    });

    // 3. Enroll the demo learner in PUBLISHED courses.
    if (c.status === CourseStatus.PUBLISHED) {
      await prisma.enrollment.create({
        data: { userId: learner.id, courseId: course.id, status: EnrollmentStatus.ACTIVE },
      });
    }

    console.log(
      `  ✓ ${c.code} • ${c.titleEn} [${c.status}] — 2 modules, 4 lessons, module+lesson+final assessments`,
    );
    created++;
  }

  console.log(`\n✅ Created ${created} new course(s). Covers point to "${COVER}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
