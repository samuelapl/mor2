import { PrismaClient, LawDomain, LawInstrumentType, LawStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedLaws() {
  console.log('--- Seeding Tax & Customs Laws Categories and Documents ---');

  const admin = await prisma.user.findFirst({
    where: { email: 'system.admin@mor.gov.et' },
  });

  if (!admin) {
    console.warn('System admin user not found; skipping law document seeding.');
    return;
  }

  // 1. Tax Law Categories - Proclamations (Matching reference UI)
  const taxProclamationCategories = [
    {
      nameEn: 'Sharing of Revenue Proclamation',
      nameAm: 'የገቢ ክፍፍል አዋጅ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 1,
    },
    {
      nameEn: 'Federal Tax Administration Proclamation',
      nameAm: 'የፌዴራል የታክስ አስተዳደር አዋጅ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 2,
    },
    {
      nameEn: 'Turn Over Tax Proclamation',
      nameAm: 'የትርን ኦቨር ታክስ አዋጅ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 3,
    },
    {
      nameEn: 'Higher Education Cost Sharing Proclamation',
      nameAm: 'የከፍተኛ ትምህርት የወጪ መጋራት አዋጅ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 4,
    },
    {
      nameEn: 'Federal Income Tax Proclamation',
      nameAm: 'የፌዴራል የገቢ ግብር አዋጅ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 5,
    },
    {
      nameEn: 'Value Added Tax Proclamation',
      nameAm: 'የተጨማሪ እሴት ታክስ አዋጅ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 6,
    },
    {
      nameEn: 'Stamp Duty Proclamation',
      nameAm: 'የቴምብር ቀረጥ አዋጅ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 7,
    },
    {
      nameEn: 'Excise Tax Proclamation',
      nameAm: 'የኤክሳይዝ ታክስ አዋጅ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 8,
    },
  ];

  // 2. Tax Law Regulations
  const taxRegulationCategories = [
    {
      nameEn: 'Federal Income Tax Regulation',
      nameAm: 'የፌዴራል የገቢ ግብር ደንብ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.REGULATION,
      order: 1,
    },
    {
      nameEn: 'Value Added Tax Regulation',
      nameAm: 'የተጨማሪ እሴት ታክስ ደንብ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.REGULATION,
      order: 2,
    },
    {
      nameEn: 'Tax Administration Regulation',
      nameAm: 'የታክስ አስተዳደር ደንብ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.REGULATION,
      order: 3,
    },
  ];

  // 3. Tax Law Directives
  const taxDirectiveCategories = [
    {
      nameEn: 'Tax Clearance Directive',
      nameAm: 'የታክስ ክሊራንስ መመሪያ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.DIRECTIVE,
      order: 1,
    },
    {
      nameEn: 'Withholding Tax Directive',
      nameAm: 'የዊዝሆልዲንግ ታክስ መመሪያ',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.DIRECTIVE,
      order: 2,
    },
  ];

  // 4. Customs Law Categories
  const customsCategories = [
    {
      nameEn: 'Customs Proclamation',
      nameAm: 'የጉምሩክ አዋጅ',
      domain: LawDomain.CUSTOMS_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 1,
    },
    {
      nameEn: 'Customs Valuation Regulation',
      nameAm: 'የጉምሩክ ዋጋ አወሳሰን ደንብ',
      domain: LawDomain.CUSTOMS_LAW,
      instrumentType: LawInstrumentType.REGULATION,
      order: 2,
    },
    {
      nameEn: 'Customs Clearing Agents Directive',
      nameAm: 'የጉምሩክ አስተላላፊዎች መመሪያ',
      domain: LawDomain.CUSTOMS_LAW,
      instrumentType: LawInstrumentType.DIRECTIVE,
      order: 3,
    },
  ];

  // 5. Draft Laws & Other Documents
  const draftAndOtherCategories = [
    {
      nameEn: 'Draft Tax Legislation',
      nameAm: 'ረቂቅ የታክስ ሕጎች',
      domain: LawDomain.DRAFT_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      order: 1,
    },
    {
      nameEn: 'Tax Treaties and International Agreements',
      nameAm: 'ዓለም አቀፍ የታክስ ስምምነቶች',
      domain: LawDomain.OTHER_DOCUMENTS,
      instrumentType: LawInstrumentType.OTHER,
      order: 1,
    },
  ];

  const allCategories = [
    ...taxProclamationCategories,
    ...taxRegulationCategories,
    ...taxDirectiveCategories,
    ...customsCategories,
    ...draftAndOtherCategories,
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of allCategories) {
    const existing = await prisma.lawCategory.findFirst({
      where: {
        domain: cat.domain,
        instrumentType: cat.instrumentType,
        nameEn: cat.nameEn,
      },
    });

    if (existing) {
      categoryMap.set(cat.nameEn, existing.id);
    } else {
      const created = await prisma.lawCategory.create({
        data: cat,
      });
      categoryMap.set(cat.nameEn, created.id);
    }
  }

  console.log(`  ✓ Seeded/verified ${allCategories.length} legal categories`);

  // Seed sample legal documents
  const sharingRevenueCatId = categoryMap.get('Sharing of Revenue Proclamation');
  if (sharingRevenueCatId) {
    const existingDoc33 = await prisma.legalDocument.findFirst({
      where: { documentNumber: '33/1984', categoryId: sharingRevenueCatId },
    });

    if (!existingDoc33) {
      await prisma.legalDocument.create({
        data: {
          categoryId: sharingRevenueCatId,
          documentNumber: '33/1984',
          titleEn: 'Joint Distribution of Revenue Proclamation',
          titleAm: 'የገቢ ክፍፍልን በተመለከተ የወጣ አዋጅ ቁጥር 33/1984',
          descriptionEn: 'Proclamation to provide for the joint distribution of revenues between the central government and regional administrations.',
          descriptionAm: 'በማዕከላዊ መንግስትና በክልል መስተዳድሮች መካከል የሚደረገውን የገቢ ክፍፍል ለመወሰን የወጣ አዋጅ።',
          status: LawStatus.REPEALED,
          yearIssued: 1984,
          pdfUrl: '/file-sample.pdf',
          fileName: 'Proclamation_33_1984.pdf',
          fileSize: 142786,
          createdById: admin.id,
        },
      });
      console.log('  ✓ Created sample document: Proclamation 33/1984 (Sharing of Revenue)');
    }
  }

  const taxAdminCatId = categoryMap.get('Federal Tax Administration Proclamation');
  if (taxAdminCatId) {
    const existingDoc979 = await prisma.legalDocument.findFirst({
      where: { documentNumber: '979/2016', categoryId: taxAdminCatId },
    });

    if (!existingDoc979) {
      await prisma.legalDocument.create({
        data: {
          categoryId: taxAdminCatId,
          documentNumber: '979/2016',
          titleEn: 'Federal Tax Administration Proclamation',
          titleAm: 'የፌዴራል የታክስ አስተዳደር አዋጅ ቁጥር 979/2008',
          descriptionEn: 'Proclamation to provide for the administration of domestic taxes, assessment, collection, and penalties.',
          descriptionAm: 'የሀገር ውስጥ ታክሶችን አስተዳደር፣ አወሳሰን፣ አሰባሰብ እና ቅጣቶችን በተመለከተ የወጣ አዋጅ።',
          status: LawStatus.IN_FORCE,
          yearIssued: 2016,
          pdfUrl: '/file-sample.pdf',
          fileName: 'Proclamation_979_2016.pdf',
          fileSize: 285400,
          createdById: admin.id,
        },
      });
      console.log('  ✓ Created sample document: Proclamation 979/2016 (Tax Administration)');
    }
  }

  const vatCatId = categoryMap.get('Value Added Tax Proclamation');
  if (vatCatId) {
    const existingDoc1341 = await prisma.legalDocument.findFirst({
      where: { documentNumber: '1341/2024', categoryId: vatCatId },
    });

    if (!existingDoc1341) {
      await prisma.legalDocument.create({
        data: {
          categoryId: vatCatId,
          documentNumber: '1341/2024',
          titleEn: 'Value Added Tax Proclamation (Revised)',
          titleAm: 'የተሻሻለው የተጨማሪ እሴት ታክስ አዋጅ ቁጥር 1341/2016',
          descriptionEn: 'The revised Value Added Tax Proclamation modernizing the VAT base and electronic transactions.',
          descriptionAm: 'የተጨማሪ እሴት ታክስ መሰረትን እና የኤሌክትሮኒክስ ግብይቶችን ለማዘመን የወጣ አዲስ የተሻሻለ አዋጅ።',
          status: LawStatus.IN_FORCE,
          yearIssued: 2024,
          pdfUrl: '/file-sample.pdf',
          fileName: 'VAT_Proclamation_1341_2024.pdf',
          fileSize: 450120,
          createdById: admin.id,
        },
      });
      console.log('  ✓ Created sample document: Proclamation 1341/2024 (VAT)');
    }
  }

  console.log('✓ Tax & Customs Laws seeding complete.');
}

if (require.main === module) {
  seedLaws()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

