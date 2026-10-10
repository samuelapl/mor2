import { PrismaClient, LookupCategoryType } from '@prisma/client';

interface SeedLookupCategory {
  type: LookupCategoryType;
  value: string;
  labelEn: string;
  labelAm: string;
  description?: string;
  isActive?: boolean;
  sortOrder: number;
}

const CATEGORIES: SeedLookupCategory[] = [
  // ── Course Categories ──
  {
    type: LookupCategoryType.COURSE_CATEGORY,
    value: 'TAX',
    labelEn: 'Tax',
    labelAm: 'ታክስ',
    description: 'Tax legislation, assessment, and collection procedures.',
    sortOrder: 1,
  },
  {
    type: LookupCategoryType.COURSE_CATEGORY,
    value: 'CUSTOMS',
    labelEn: 'Customs',
    labelAm: 'ጉምሩክ',
    description: 'Tariffs, customs clearance, and border trade enforcement.',
    sortOrder: 2,
  },
  {
    type: LookupCategoryType.COURSE_CATEGORY,
    value: 'EXCISE',
    labelEn: 'Excise',
    labelAm: 'ኤክሳይዝ',
    description: 'Excise duty assessment, stamps, and regulated goods monitoring.',
    sortOrder: 3,
  },
  {
    type: LookupCategoryType.COURSE_CATEGORY,
    value: 'COMPLIANCE',
    labelEn: 'Compliance',
    labelAm: 'ተገዢነት',
    description: 'Voluntary compliance, taxpayer education, and statutory guidelines.',
    sortOrder: 4,
  },
  {
    type: LookupCategoryType.COURSE_CATEGORY,
    value: 'SYSTEMS',
    labelEn: 'Systems',
    labelAm: 'ሥርዓቶች / ሲስተሞች',
    description: 'SIGTAS, e-Tax, electronic filing, and revenue digital infrastructure.',
    sortOrder: 5,
  },
  {
    type: LookupCategoryType.COURSE_CATEGORY,
    value: 'AUDIT',
    labelEn: 'Audit & Investigation',
    labelAm: 'ኦዲት እና ምርመራ',
    description: 'Comprehensive and desk audits, risk profiling, and forensic methods.',
    sortOrder: 6,
  },
  {
    type: LookupCategoryType.COURSE_CATEGORY,
    value: 'LEADERSHIP',
    labelEn: 'Leadership & Management',
    labelAm: 'አመራር እና አስተዳደር',
    description: 'Organizational leadership, ethics, and strategic ministry operations.',
    sortOrder: 7,
  },
  {
    type: LookupCategoryType.COURSE_CATEGORY,
    value: 'CUSTOMER_SERVICE',
    labelEn: 'Customer Service',
    labelAm: 'የደንበኞች አገልግሎት',
    description: 'Front-office conduct, taxpayer query resolution, and service standards.',
    sortOrder: 8,
  },

  // ── Course Difficulty Levels ──
  {
    type: LookupCategoryType.COURSE_LEVEL,
    value: 'BASIC',
    labelEn: 'Basic',
    labelAm: 'መሠረታዊ',
    description: 'Foundational concepts and introductory frameworks.',
    sortOrder: 1,
  },
  {
    type: LookupCategoryType.COURSE_LEVEL,
    value: 'INTERMEDIATE',
    labelEn: 'Intermediate',
    labelAm: 'መካከለኛ',
    description: 'Practical operational workflows and case application.',
    sortOrder: 2,
  },
  {
    type: LookupCategoryType.COURSE_LEVEL,
    value: 'ADVANCED',
    labelEn: 'Advanced',
    labelAm: 'ከፍተኛ',
    description: 'Specialized analysis, investigation, and strategic execution.',
    sortOrder: 3,
  },

  // ── Assessment Question Formats ──
  {
    type: LookupCategoryType.QUESTION_TYPE,
    value: 'MULTIPLE_CHOICE',
    labelEn: 'Multiple Choice',
    labelAm: 'ባለብዙ ምርጫ',
    description: 'Single-answer or multiple-select objective questions.',
    sortOrder: 1,
  },
  {
    type: LookupCategoryType.QUESTION_TYPE,
    value: 'TRUE_FALSE',
    labelEn: 'True / False',
    labelAm: 'እውነት / ሐሰት',
    description: 'Binary verification questions.',
    sortOrder: 2,
  },
  {
    type: LookupCategoryType.QUESTION_TYPE,
    value: 'SHORT_ANSWER',
    labelEn: 'Short Answer',
    labelAm: 'አጭር መልስ',
    description: 'Text-based open or calculated responses.',
    sortOrder: 3,
  },
];

export async function seedCategories(prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? new PrismaClient();
  console.log('🏷️  Seeding dynamic lookup categories (categories, levels, question types)...');

  for (const cat of CATEGORIES) {
    await prisma.lookupCategory.upsert({
      where: {
        type_value: {
          type: cat.type,
          value: cat.value,
        },
      },
      update: {
        labelEn: cat.labelEn,
        labelAm: cat.labelAm,
        description: cat.description,
        isActive: cat.isActive ?? true,
        sortOrder: cat.sortOrder,
      },
      create: {
        type: cat.type,
        value: cat.value,
        labelEn: cat.labelEn,
        labelAm: cat.labelAm,
        description: cat.description,
        isActive: cat.isActive ?? true,
        sortOrder: cat.sortOrder,
      },
    });
  }

  console.log(`  ✓ Seeded ${CATEGORIES.length} lookup categories successfully!`);
}


if (require.main === module) {
  const prisma = new PrismaClient();
  seedCategories(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
