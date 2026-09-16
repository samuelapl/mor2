/**
 * Reseed script that wipes existing courses (and their dependants) and creates
 * 10 new courses with varied statuses/levels + full curriculum (modules →
 * lessons), sample.jpg covers, **and wires up every demo account so each
 * role's dashboard/catalog is populated**:
 *
 *   • course_owner / COURSE_OWNER  → course_owners rows           (owner@gmail.com + owner@mor.gov.et)
 *   • trainer     / TRAINER        → trainer_assignments rows     (trainer@gmail.com + trainer@mor.gov.et)
 *   • approver    / CONTENT_APPROVER → content_approvals rows     (approver@gmail.com + approver@mor.gov.et)
 *   • learner     / LEARNER        → PUBLISHED courses + enrollments (learner@gmail.com + learner@mor.gov.et)
 *
 * Run:  cd backend && npx ts-node prisma/seed-courses.ts
 */
import {
  ApprovalStatus,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  PrismaClient,
  RoleName,
} from '@prisma/client';

const prisma = new PrismaClient();

type CourseStatusLike =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

type CourseLevelLike = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
type LessonContentTypeLike =
  | 'VIDEO'
  | 'DOCUMENT'
  | 'PRESENTATION'
  | 'INTERACTIVE'
  | 'SCORM'
  | 'EXTERNAL_LINK';

type AssessmentType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

interface ModuleSeed {
  titleEn: string;
  titleAm: string;
  order: number;
  lessons: {
    titleEn: string;
    titleAm: string;
    contentType: LessonContentTypeLike;
    contentEn?: string;
    durationMinutes?: number;
    order: number;
  }[];
}

interface CourseSeed {
  code: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string;
  descriptionAm: string;
  status: CourseStatusLike;
  level: CourseLevelLike;
  estimatedHours: number;
  modules: ModuleSeed[];
  assessment?: {
    titleEn: string;
    titleAm: string;
    passingScore: number;
    questions: {
      type: AssessmentType;
      question: string;
      options: string[];
      correctAnswer: number;
    }[];
  };
}

const COVER = '/sample.jpg';

const courseSeeds: CourseSeed[] = [
  {
    code: 'DIGITAL101',
    titleEn: 'Digital Literacy for Civil Servants',
    titleAm: 'ዲጂታል ማንበብና መጻፍ ለሲቪል ሰርቫንቶች',
    descriptionEn:
      'Essential digital skills: email, file management, and safe internet usage for daily office work.',
    descriptionAm:
      'አስፈላጊ የዲጂታል ክህሎት፡ ኢሜይል፣ የፋይል አስተዳደር እና ደህንነቱ የተጠበቀ የኢንተርኔት አጠቃቀም ለዕለታዊ ቢሮ ስራ።',
    status: 'PUBLISHED',
    level: 'BASIC',
    estimatedHours: 24,
    modules: [
      {
        titleEn: 'Getting Started with Computers',
        titleAm: 'ከኮምፒውተሮች ጋር መጀመር',
        order: 1,
        lessons: [
          {
            titleEn: 'Computer Hardware Basics',
            titleAm: 'የኮምፒውተር ሃርድዌር መሰረታዊ',
            contentType: 'VIDEO',
            contentEn:
              'How to identify and work with the main computer components: CPU, RAM, storage, and peripherals.',
            durationMinutes: 45,
            order: 1,
          },
          {
            titleEn: 'Operating Systems Overview',
            titleAm: 'የኦፕሬቲንግ ሲስተም አጠቃላይ እይታ',
            contentType: 'DOCUMENT',
            contentEn:
              'Introducing Windows and common OS tasks: files, folders, desktop, and settings.',
            durationMinutes: 30,
            order: 2,
          },
        ],
      },
      {
        titleEn: 'Email & Communication',
        titleAm: 'ኢሜይል እና ኮሙኒኬሽን',
        order: 2,
        lessons: [
          {
            titleEn: 'Writing Professional Emails',
            titleAm: 'ፕሮፌሽናል ኢሜይሎችን መጻፍ',
            contentType: 'INTERACTIVE',
            contentEn:
              'Structure, tone, and etiquette for official correspondence within the ministry.',
            durationMinutes: 35,
            order: 1,
          },
          {
            titleEn: 'Managing Attachments & Folders',
            titleAm: 'አባሪዎችን እና ፎልደሮችን ማስተዳደር',
            contentType: 'DOCUMENT',
            contentEn:
              'Organizing email folders and safely sharing large files.',
            durationMinutes: 25,
            order: 2,
          },
        ],
      },
    ],
    assessment: {
      titleEn: 'Digital Literacy Assessment',
      titleAm: 'የዲጂታል ማንበብና መጻፍ ፈተና',
      passingScore: 70,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question:
            'Which component is considered the brain of the computer?',
          options: ['RAM', 'CPU', 'Hard drive', 'Monitor'],
          correctAnswer: 1,
        },
        {
          type: 'MULTIPLE_CHOICE',
          question: 'What is the safest way to send a confidential file?',
          options: [
            'As a regular email attachment',
            'Through an encrypted/secure channel',
            'Via social media',
            'On a shared USB card',
          ],
          correctAnswer: 1,
        },
        {
          type: 'TRUE_FALSE',
          question: 'Public email accounts are suitable for ministry documents.',
          options: ['True', 'False'],
          correctAnswer: 1,
        },
      ],
    },
  },
  {
    code: 'ETHICS201',
    titleEn: 'Public Sector Ethics & Integrity',
    titleAm: 'የህዝብ ሴክተር ስነ-ምግባር እና ታማኝነት',
    descriptionEn:
      'Understanding ethical standards, conflict of interest, and accountability in public service.',
    descriptionAm:
      'በህዝብ አገልግሎት ውስጥ የስነ-ምግባር ደረጃዎችን፣ የጥቅም ግጭት እና ተጠያቂነትን መረዳት።',
    status: 'APPROVED',
    level: 'BASIC',
    estimatedHours: 18,
    modules: [
      {
        titleEn: 'Core Ethical Principles',
        titleAm: 'ዋና የስነ-ምግባር መርሆች',
        order: 1,
        lessons: [
          {
            titleEn: 'Integrity in Public Office',
            titleAm: 'በህዝብ ቢሮ ውስጥ ታማኝነት',
            contentType: 'VIDEO',
            contentEn:
              'Case studies on integrity, honesty, and serving the public interest above personal gain.',
            durationMinutes: 50,
            order: 1,
          },
          {
            titleEn: 'Conflict of Interest',
            titleAm: 'የጥቅም ግጭት',
            contentType: 'DOCUMENT',
            contentEn:
              'How to identify, disclose, and manage situations where personal interests may clash with duty.',
            durationMinutes: 40,
            order: 2,
          },
        ],
      },
    ],
    assessment: {
      titleEn: 'Ethics in Practice Quiz',
      titleAm: 'የስነ-ምግባር ልምምድ ጥያቄ',
      passingScore: 65,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'A relative asks you to fast-track their permit. Best course of action?',
          options: [
            'Fast-track it out of goodwill',
            'Decline and follow the standard process',
            'Ask for an informal fee',
            'Refer them to a different ministry',
          ],
          correctAnswer: 1,
        },
        {
          type: 'TRUE_FALSE',
          question: 'Accepting small gifts from service users is always acceptable.',
          options: ['True', 'False'],
          correctAnswer: 1,
        },
      ],
    },
  },
  {
    code: 'PROJ401',
    titleEn: 'Advanced Project Management',
    titleAm: 'የላቀ የፕሮጀክት አስተዳደር',
    descriptionEn:
      'Deep dive into scheduling, risk management, resource allocation, and stakeholder engagement.',
    descriptionAm:
      'ስለ መርሐግብር አወጣጥ፣ የአደጋ አስተዳደር፣ የግብዓት ድልድል እና የባለድርሻ ተሳትፎ ጥልቅ ትምህርት።',
    status: 'PUBLISHED',
    level: 'ADVANCED',
    estimatedHours: 45,
    modules: [
      {
        titleEn: 'Scope & Scheduling',
        titleAm: 'ወሰን �እና መርሐግብር',
        order: 1,
        lessons: [
          {
            titleEn: 'Work Breakdown Structure',
            titleAm: 'የስራ ክፍፍል መዋቅር',
            contentType: 'DOCUMENT',
            contentEn:
              'Decomposing deliverables into manageable work packages with dependencies.',
            durationMinutes: 55,
            order: 1,
          },
          {
            titleEn: 'Critical Path Method',
            titleAm: 'ወሳኝ መንገድ ዘዴ',
            contentType: 'VIDEO',
            contentEn:
              'Calculating the critical path and float to keep projects on schedule.',
            durationMinutes: 60,
            order: 2,
          },
        ],
      },
      {
        titleEn: 'Risk & Stakeholders',
        titleAm: 'አደጋ እና ባለድርሻ',
        order: 2,
        lessons: [
          {
            titleEn: 'Risk Register Essentials',
            titleAm: 'የአደጋ መዝገብ መሰረታዊ',
            contentType: 'INTERACTIVE',
            contentEn:
              'Identifying, analyzing, and prioritizing project risks with mitigation plans.',
            durationMinutes: 45,
            order: 1,
          },
          {
            titleEn: 'Stakeholder Engagement Matrix',
            titleAm: 'የባለድርሻ ተሳትፎ ማትሪክስ',
            contentType: 'DOCUMENT',
            contentEn:
              'Mapping stakeholders by power and interest to tailor communication.',
            durationMinutes: 35,
            order: 2,
          },
        ],
      },
    ],
    assessment: {
      titleEn: 'Advanced PM Exam',
      titleAm: 'የላቀ PM ፈተና',
      passingScore: 75,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Which is a key output of the risk register?',
          options: [
            'Final budget',
            'Prioritized list of risks',
            'Team charter',
            'Meeting minutes',
          ],
          correctAnswer: 1,
        },
        {
          type: 'TRUE_FALSE',
          question: 'The critical path has zero float.',
          options: ['True', 'False'],
          correctAnswer: 0,
        },
      ],
    },
  },
  {
    code: 'DATA201',
    titleEn: 'Data Privacy & Protection',
    titleAm: 'የመረጃ ግላዊነት እና ጥበቃ',
    descriptionEn:
      'Handling personal and sensitive data in compliance with data protection principles.',
    descriptionAm:
      'የግል እና ሚስጥራዊ መረጃዎችን በመረጃ ጥበቃ መርሆች መሰረት ማስተናገድ።',
    status: 'PENDING_APPROVAL',
    level: 'INTERMEDIATE',
    estimatedHours: 22,
    modules: [
      {
        titleEn: 'Protecting Personal Data',
        titleAm: 'የግል መረጃን መጠበቅ',
        order: 1,
        lessons: [
          {
            titleEn: 'Data Minimization',
            titleAm: 'የመረጃ መቀነሻ',
            contentType: 'DOCUMENT',
            contentEn:
              'Collecting only the data you need and retaining it only as long as required.',
            durationMinutes: 30,
            order: 1,
          },
          {
            titleEn: 'Consent & Lawful Basis',
            titleAm: 'ፍቃድ እና ህጋዊ መሰረት',
            contentType: 'VIDEO',
            contentEn:
              'When and how to obtain consent, and lawful grounds for processing.',
            durationMinutes: 40,
            order: 2,
          },
        ],
      },
    ],
    assessment: {
      titleEn: 'Data Protection Check',
      titleAm: 'የመረጃ ጥበቃ ማረጋገጫ',
      passingScore: 70,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Which principle means collecting only what is necessary?',
          options: [
            'Storage limitation',
            'Data minimization',
            'Transparency',
            'Purpose limitation',
          ],
          correctAnswer: 1,
        },
      ],
    },
  },
  {
    code: 'HRM301',
    titleEn: 'HR Performance Management',
    titleAm: 'የHR የአፈጻጸም አስተዳደር',
    descriptionEn:
      'Setting goals, conducting reviews, and driving continuous improvement in staff performance.',
    descriptionAm:
      'ግቦችን ማውጣት፣ ግምገማዎችን ማካሄድ እና የሰራተኛ አፈጻጸም ተከታታይ መሻሻልን ማስተዳደር።',
    status: 'APPROVED',
    level: 'INTERMEDIATE',
    estimatedHours: 28,
    modules: [
      {
        titleEn: 'Goal Setting & KPIs',
        titleAm: 'ግብ ማውጣት እና KPIs',
        order: 1,
        lessons: [
          {
            titleEn: 'SMART Goals in Action',
            titleAm: 'SMART ግቦች በተግባር',
            contentType: 'PRESENTATION',
            contentEn:
              'Crafting Specific, Measurable, Achievable, Relevant, Time-bound objectives.',
            durationMinutes: 38,
            order: 1,
          },
          {
            titleEn: 'Designing KPIs',
            titleAm: 'KPIs ን መንደፍ',
            contentType: 'DOCUMENT',
            contentEn:
              'Selecting leading and lagging indicators that actually measure performance.',
            durationMinutes: 42,
            order: 2,
          },
        ],
      },
      {
        titleEn: 'Reviews & Feedback',
        titleAm: 'ግምገማ እና ግብረ-መልስ',
        order: 2,
        lessons: [
          {
            titleEn: 'Conducting Performance Reviews',
            titleAm: 'የአፈጻጸም ግምገማዎችን ማካሄድ',
            contentType: 'VIDEO',
            contentEn:
              'Structured 1:1 reviews that are fair, factual, and motivating.',
            durationMinutes: 48,
            order: 1,
          },
          {
            titleEn: 'Giving Constructive Feedback',
            titleAm: 'ገንቢ ግብረ-መልስ መስጠት',
            contentType: 'INTERACTIVE',
            contentEn:
              'Techniques for feedback that improves behavior without damaging morale.',
            durationMinutes: 33,
            order: 2,
          },
        ],
      },
    ],
  },
  {
    code: 'CYBER301',
    titleEn: 'Cybersecurity for Administrators',
    titleAm: 'ሳይበር ደህንነት ለአስተዳዳሪዎች',
    descriptionEn:
      'Securing ministry systems: access controls, phishing defense, and incident response basics.',
    descriptionAm:
      'የሚኒስቴር ስርዓቶችን መጠበቅ፡ የመዳረሻ ቁጥጥር፣ የፊሽንግ መከላከል እና መሰረታዊ የአደጋ ምላሽ።',
    status: 'PUBLISHED',
    level: 'ADVANCED',
    estimatedHours: 32,
    modules: [
      {
        titleEn: 'Access & Identity',
        titleAm: 'መዳረሻ እና ማንነት',
        order: 1,
        lessons: [
          {
            titleEn: 'Multi-Factor Authentication',
            titleAm: 'ባለብዙ-ምክንያት ማረጋገጫ',
            contentType: 'VIDEO',
            contentEn:
              'Why MFA matters and how to roll it out across user accounts.',
            durationMinutes: 40,
            order: 1,
          },
        ],
      },
      {
        titleEn: 'Threat Defense',
        titleAm: 'የአደጋ መከላከል',
        order: 2,
        lessons: [
          {
            titleEn: 'Phishing Simulation',
            titleAm: 'የፊሽንግ ማስመሰል',
            contentType: 'INTERACTIVE',
            contentEn:
              'Recognizing and reporting phishing attempts before they cause damage.',
            durationMinutes: 45,
            order: 1,
          },
          {
            titleEn: 'Incident Response Basics',
            titleAm: 'የአደጋ ምላሽ መሰረታዊ',
            contentType: 'DOCUMENT',
            contentEn:
              'Steps to contain, investigate, and report a security incident.',
            durationMinutes: 50,
            order: 2,
          },
        ],
      },
    ],
    assessment: {
      titleEn: 'Cybersecurity Admin Exam',
      titleAm: 'የሳይበር ደህንነት አስተዳዳሪ ፈተና',
      passingScore: 75,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Best defense against credential theft?',
          options: [
            'Longer passwords only',
            'Multi-factor authentication',
            'Frequent email checks',
            'Public Wi-Fi',
          ],
          correctAnswer: 1,
        },
        {
          type: 'TRUE_FALSE',
          question:
            'A suspicious email asking for your password should be reported.',
          options: ['True', 'False'],
          correctAnswer: 0,
        },
      ],
    },
  },
  {
    code: 'COMM201',
    titleEn: 'Public Communication & PR',
    titleAm: 'ህዝባዊ ኮሙኒኬሽን እና PR',
    descriptionEn:
      'Clear official writing, media relations, and public engagement for ministry spokespeople.',
    descriptionAm:
      'ግልጽ ኦፊሻል ጽሁፍ፣ የሚዲያ ግንኙነት እና የህዝብ ተሳትፎ ለሚኒስቴር ቃል አቀባይዎች።',
    status: 'DRAFT',
    level: 'INTERMEDIATE',
    estimatedHours: 20,
    modules: [
      {
        titleEn: 'Official Writing',
        titleAm: 'ኦፊሻል ጽሁፍ',
        order: 1,
        lessons: [
          {
            titleEn: 'Writing Clear Reports',
            titleAm: 'ግልጽ ሪፖርቶችን መጻፍ',
            contentType: 'DOCUMENT',
            contentEn:
              'Translating complex topics into plain, accurate public language.',
            durationMinutes: 40,
            order: 1,
          },
        ],
      },
      {
        titleEn: 'Media & Public',
        titleAm: 'ሚዲያ እና ህዝብ',
        order: 2,
        lessons: [
          {
            titleEn: 'Handling Media Inquiries',
            titleAm: 'የሚዲያ ጥያቄዎችን ማስተናገድ',
            contentType: 'PRESENTATION',
            contentEn:
              'Preparing key messages and managing interviews with journalists.',
            durationMinutes: 50,
            order: 1,
          },
        ],
      },
    ],
  },
  {
    code: 'FIN401',
    titleEn: 'Public Financial Management',
    titleAm: 'ህዝባዊ የፋይናንስ አስተዳደር',
    descriptionEn:
      'Budgeting, procurement, and accountability in government finance.',
    descriptionAm:
      'በመንግስት ፋይናንስ ውስጥ የበጀት፣ የግዥ እና የተጠያቂነት አስተዳደር።',
    status: 'PENDING_APPROVAL',
    level: 'ADVANCED',
    estimatedHours: 38,
    modules: [
      {
        titleEn: 'Budgeting Basics',
        titleAm: 'የበጀት መሰረታዊ',
        order: 1,
        lessons: [
          {
            titleEn: 'The Budget Cycle',
            titleAm: 'የበጀት ዑደት',
            contentType: 'VIDEO',
            contentEn:
              'From planning and formulation to execution and audit.',
            durationMinutes: 55,
            order: 1,
          },
        ],
      },
      {
        titleEn: 'Procurement',
        titleAm: 'ግዥ',
        order: 2,
        lessons: [
          {
            titleEn: 'Transparent Tendering',
            titleAm: 'ግልጽ ጨረታ',
            contentType: 'DOCUMENT',
            contentEn:
              'Fair, competitive procurement processes and documentation.',
            durationMinutes: 45,
            order: 1,
          },
        ],
      },
    ],
  },
  {
    code: 'DEV301',
    titleEn: 'PHP & Web App Development',
    titleAm: 'PHP እና የድህረ-ገጽ አፕ ልማት',
    descriptionEn:
      'Practical web development: PHP fundamentals and a working CRUD application.',
    descriptionAm:
      'ተግባራዊ የድህረ-ገጽ ልማት፡ የPHP መሰረታዊ እና የሚሰራ CRUD አፕሊኬሽን።',
    status: 'ARCHIVED',
    level: 'ADVANCED',
    estimatedHours: 40,
    modules: [
      {
        titleEn: 'PHP Fundamentals',
        titleAm: 'የPHP መሰረታዊ',
        order: 1,
        lessons: [
          {
            titleEn: 'Variables & Control Structures',
            titleAm: 'ተለዋዋጮች እና የቁጥጥር መዋቅሮች',
            contentType: 'SCORM',
            contentEn: 'PHP syntax, loops, conditionals, and functions.',
            durationMinutes: 65,
            order: 1,
          },
        ],
      },
      {
        titleEn: 'Building a CRUD App',
        titleAm: 'CRUD አፕ መገንባት',
        order: 2,
        lessons: [
          {
            titleEn: 'Database Connectivity',
            titleAm: 'የዳታቤዝ ግንኙነት',
            contentType: 'DOCUMENT',
            contentEn:
              'Connecting PHP to PostgreSQL and performing CRUD operations.',
            durationMinutes: 60,
            order: 1,
          },
        ],
      },
    ],
    assessment: {
      titleEn: 'PHP Development Quiz',
      titleAm: 'የPHP ልማት ጥያቄ',
      passingScore: 70,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Which loop is best when you know the number of iterations?',
          options: ['while', 'for', 'foreach', 'do-while'],
          correctAnswer: 1,
        },
      ],
    },
  },
  {
    code: 'LANG102',
    titleEn: 'English for Professional Communication',
    titleAm: 'እንግሊዝኛ ለፕሮፌሽናል ኮሙኒኬሽን',
    descriptionEn:
      'Improve workplace English: emails, reports, presentations, and meetings.',
    descriptionAm:
      'የስራ ቦታ እንግሊዝኛን ማሻሻል፡ ኢሜይሎች፣ ሪፖርቶች፣ አቀራረቦች እና ስብሰባዎች።',
    status: 'DRAFT',
    level: 'BASIC',
    estimatedHours: 16,
    modules: [
      {
        titleEn: 'Business Writing',
        titleAm: 'የቢዝነስ ጽሁፍ',
        order: 1,
        lessons: [
          {
            titleEn: 'Email Tone & Structure',
            titleAm: 'የኢሜይል ቃና እና መዋቅር',
            contentType: 'EXTERNAL_LINK',
            contentEn:
              'Politeness, clarity, and structure in professional correspondence.',
            durationMinutes: 30,
            order: 1,
          },
        ],
      },
      {
        titleEn: 'Speaking & Meetings',
        titleAm: 'ንግግር እና ስብሰባዎች',
        order: 2,
        lessons: [
          {
            titleEn: 'Presenting in English',
            titleAm: 'በእንግሊዝኛ ማቅረብ',
            contentType: 'PRESENTATION',
            contentEn:
              'Structuring talks and handling Q&A with confidence.',
            durationMinutes: 35,
            order: 1,
          },
        ],
      },
    ],
  },
];

async function main() {
  // 1. Wipe existing courses (cascades modules/lessons/assessments/approvals)
  const deleted = await prisma.course.deleteMany();
  console.log(`🧹 Deleted ${deleted.count} existing course(s)`);

  // 2. Resolve guaranteed demo accounts — gmail.com demo actors only, for now
  const ownerDemo = await prisma.user.findUnique({
    where: { email: 'owner@gmail.com' },
  });
  const trainerDemo = await prisma.user.findUnique({
    where: { email: 'trainer@gmail.com' },
  });
  const approverDemo = await prisma.user.findUnique({
    where: { email: 'approver@gmail.com' },
  });
  const learnerDemo = await prisma.user.findUnique({
    where: { email: 'learner@gmail.com' },
  });

  if (!ownerDemo || !trainerDemo || !approverDemo || !learnerDemo) {
    throw new Error(
      'Missing demo accounts; run `npx prisma db seed` once first so the ' +
        'gmail.com demo users exist, then re-run this script.',
    );
  }

  // 3. Create courses + wire up every actor
  let created = 0;
  for (const c of courseSeeds) {
    const approvalStatus: ApprovalStatus =
      c.status === 'APPROVED' || c.status === 'PUBLISHED'
        ? 'APPROVED'
        : c.status === 'REJECTED' || c.status === 'ARCHIVED'
          ? 'REJECTED'
          : 'PENDING';
    const approvalDecided = c.status !== 'PENDING_APPROVAL' && c.status !== 'DRAFT';

    const course = await prisma.course.create({
      data: {
        code: c.code,
        titleEn: c.titleEn,
        titleAm: c.titleAm,
        descriptionEn: c.descriptionEn,
        descriptionAm: c.descriptionAm,
        estimatedHours: c.estimatedHours,
        status: c.status as CourseStatus,
        level: c.level as CourseLevel,
        thumbnailUrl: COVER,
        publishedAt: c.status === 'PUBLISHED' ? new Date() : null,
        // Owned by the demo Course Owner only, for now.
        owners: {
          create: [{ userId: ownerDemo.id }],
        },
        // Trainer linked to the course → the trainer dashboard lists these
        trainers: {
          create: [{ userId: trainerDemo.id }],
        },
        // Content-approver row → the approver dashboard lists these
        approvals:
          c.status !== 'DRAFT'
            ? {
                create: [
                  {
                    approver: { connect: { id: approverDemo.id } },
                    status: approvalStatus,
                    decidedAt: approvalDecided ? new Date() : null,
                  },
                ],
              }
            : undefined,
        modules: {
          create: c.modules.map((m) => ({
            titleEn: m.titleEn,
            titleAm: m.titleAm,
            order: m.order,
            lessons: {
              create: m.lessons.map((l) => ({
                titleEn: l.titleEn,
                titleAm: l.titleAm,
                contentType: l.contentType,
                contentEn: l.contentEn,
                durationMinutes: l.durationMinutes,
                order: l.order,
              })),
            },
          })),
        },
        assessments: c.assessment
          ? {
              create: {
                titleEn: c.assessment.titleEn,
                titleAm: c.assessment.titleAm,
                passingScore: c.assessment.passingScore,
                maxAttempts: 3,
                questions: c.assessment.questions,
              },
            }
          : undefined,
      },
    });

    // Enroll the demo learner in PUBLISHED courses so their dashboard shows them
    if (c.status === 'PUBLISHED') {
      await prisma.enrollment.create({
        data: {
          userId: learnerDemo.id,
          courseId: course.id,
          status: 'ACTIVE' as EnrollmentStatus,
        },
      });
    }

    const moduleCount = c.modules.length;
    const lessonCount = c.modules.reduce((n, m) => n + m.lessons.length, 0);
    console.log(
      `  ✓ ${c.code} • ${c.titleEn} [${c.status}/${c.level}] — ${moduleCount} modules, ${lessonCount} lessons` +
        (c.assessment ? ', 1 assessment' : ''),
    );
    created++;
  }

  console.log(`\n✅ Created ${created} courses — covers point to "${COVER}"`);
  console.log(
    'Demo logins now see courses: owner@gmail.com (owns all), ' +
      'trainer@gmail.com (assigned all), approver@gmail.com (reviews non-DRAFT), ' +
      'learner@gmail.com (3 PUBLISHED + enrolled).',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
