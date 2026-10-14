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
import { SeededVenues } from './seed-venues';
import { SeededUsers } from './seed-users';

const COVER = '/sample.jpg';
const PDF_FILE_KEY = 'attachments/file-sample.pdf';
const PDF_FILE_URL = '/file-sample.pdf';
const PDF_SIZE_BYTES = 142786;

export async function seedCourses(
  prisma: PrismaClient,
  users: SeededUsers,
  venues: SeededVenues,
): Promise<void> {
  console.log('📚 Seeding Clean Courses (ONLINE_ONLY and IN_PERSON_ONLY)...');

  const ownerId = users.courseOwner.id;
  const approverId = users.approver.id;
  const onlineTrainer = users.onlineTrainers[0];

  // Helper for creating attachments
  async function addCourseAttachment(courseId: string, title: string) {
    await prisma.attachment.create({
      data: {
        courseId,
        fileName: `${title} - Curriculum Syllabus.pdf`,
        fileKey: PDF_FILE_KEY,
        fileUrl: PDF_FILE_URL,
        fileType: 'application/pdf',
        sizeBytes: PDF_SIZE_BYTES,
        uploadedById: ownerId,
      },
    });
  }

    // ────────────────────────────────────────────────────────────
  // 1. VAT101: Pure Online Course (ONLINE_ONLY)
  // ────────────────────────────────────────────────────────────
  console.log("  📌 [ONLINE_ONLY] Seeding VAT101: VAT Fundamentals for Revenue Officers...");
  const vat101 = await prisma.course.create({
    data: {
      code: "VAT101",
      title: "VAT Fundamentals for Revenue Officers",
      description: "A comprehensive, self-paced digital course designed specifically for revenue officials to master the core principles and practical applications of the Ethiopian Value Added Tax (VAT) framework. This course provides an in-depth analysis of the current VAT proclamation, guiding learners through taxable transactions, statutory rates, and complex input/output tax netting mechanisms. Participants will gain practical expertise in evaluating complex exemption scenarios, identifying zero-rated versus exempt supplies, and enforcing compliance through modern electronic filing systems. By the end of this course, officers will be fully equipped to conduct accurate tax assessments, lead precise audits, and confidently minimize revenue leakage.",
      objectives: "<ul><li><p><strong>Interpret Legal Frameworks:</strong> Analyze and apply the fundamental legal principles of the Ethiopian VAT Proclamation to real-world tax scenarios.</p></li><li><p><strong>Determine Taxability:</strong> Accurately classify taxable supplies, apply correct statutory rates, and determine the time and place of supply.</p></li><li><p><strong>Calculate Netting Mechanisms:</strong> Perform precise calculations for input tax deductions, output tax liabilities, and complex apportionment rules.</p></li><li><p><strong>Distinguish Exemptions:</strong> Differentiate between zero-rated and exempt supplies to prevent erroneous tax credit claims.</p></li><li><p><strong>Master Digital Compliance:</strong> Direct and verify electronic tax filing and return procedures using the online revenue portal.</p></li><li><p><strong>Conduct Audits:</strong> Identify common risk areas, errors, and fraudulent patterns during VAT assessments and audit investigations.</p></li></ul>",
      level: CourseLevel.INTERMEDIATE,
      category: "Tax Administration",
      department: "Domestic Tax Operations",
      targetAudience: "Tax assessment officers, audit investigators, and branch filing staff.",
      deliveryMethod: "self_paced",
      deliveryMode: CourseDeliveryMode.ONLINE_ONLY,
      hasOnlineSessions: true,
      estimatedHours: 0.92,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      thumbnailUrl: COVER,
      owners: { create: [{ userId: ownerId }] },
      trainers: { create: [{ userId: onlineTrainer.id }] },
      approvals: {
        create: [
          {
            approverId,
            status: ApprovalStatus.APPROVED,
            decidedAt: new Date(),
            comments: "Fully verified and approved for digital online delivery.",
          },
        ],
      },
    },
  });
  await addCourseAttachment(vat101.id, "VAT101");

  // Curriculum for VAT101
  const vat101M1 = await prisma.curriculumModule.create({
    data: {
      courseId: vat101.id,
      title: "Module 1: Foundations of Value Added Tax",
      description: "Core concepts of Ethiopian VAT, economic incidence, and supply categories.",
      objectives: "Identify taxable supplies, calculate gross amounts, and review legal exemptions.",
      order: 0,
      passingScore: 50,
    },
  });

  const vat101L1 = await prisma.lesson.create({
    data: {
      moduleId: vat101M1.id,
      title: "1.1 Taxable Supplies & Statutory Rates",
      contentType: LessonContentType.DOCUMENT,
      durationMinutes: 25,
      order: 0,
      content: "<!--eltms-blocks:[{\"id\":\"block-video-1791923572082\",\"type\":\"VIDEO\",\"title\":\"Video Lecture\",\"url\":\"http://localhost:9000/eltms-files/undefined/24cd576f-15a7-4050-965e-60b14cfcef5c.mp4\",\"fileName\":\"sample.mp4\",\"fileSize\":1570024},{\"id\":\"block-doc-1791923514162-0\",\"type\":\"DOCUMENT\",\"title\":\"Lecture Notes & Study Material\",\"content\":\"<p><strong>1. Core Principles of Value Added Tax (VAT)</strong></p><p><strong>Value Added Tax (VAT)</strong> is a broad-based consumption tax levied at each stage of the production and distribution chain. It is collected on the value added to goods and services by businesses at each stage. While registered businesses collect and remit the tax, the ultimate economic burden of VAT is borne by the final consumer.</p><p><strong>2. Statutory VAT Rates &amp; Classifications</strong></p><p>Under the <strong>Ethiopian VAT framework</strong>, supplies are categorized into three distinct tax treatments:</p><p><strong>Standard Rate (15%)</strong></p><p>The standard rate of <strong>15%</strong> applies to all taxable supplies of goods and services manufactured or provided within the country, as well as on all imported goods, unless explicitly specified otherwise by law.</p><ul><li><p><strong>Key Feature:</strong> Businesses charging the standard rate are entitled to claim input tax deductions on their business inputs.</p></li></ul><p><strong>Zero-Rated Supplies (0%)</strong></p><p>Zero-rated supplies are technically taxable, but the rate applied is <strong>0%</strong>. This treatment is primarily used to encourage specific economic behaviors, such as boosting local production competitiveness in global markets.</p><ul><li><p><strong>Key Feature:</strong> Registered taxpayers can fully deduct or claim a refund for the input VAT incurred while producing zero-rated supplies.</p></li><li><p><strong>Examples:</strong> Qualifying exports of goods and services, and international transport or logistics.</p></li></ul><p><strong>Exempt Supplies</strong></p><p>Exempt supplies are completely outside the scope of VAT and are not subject to tax.</p><ul><li><p><strong>Key Feature:</strong> Unlike zero-rated supplies, businesses supplying exempt goods or services cannot deduct or reclaim any input tax incurred during production. This cost is absorbed by the business or passed on to consumers as part of the cost price.</p></li><li><p><strong>Examples:</strong> Specified financial services, medical and educational services, and essential public utilities.</p></li></ul>\"}]-->\n<p><strong>1. Core Principles of Value Added Tax (VAT)</strong></p><p><strong>Value Added Tax (VAT)</strong> is a broad-based consumption tax levied at each stage of the production and distribution chain. It is collected on the value added to goods and services by businesses at each stage. While registered businesses collect and remit the tax, the ultimate economic burden of VAT is borne by the final consumer.</p><p><strong>2. Statutory VAT Rates &amp; Classifications</strong></p><p>Under the <strong>Ethiopian VAT framework</strong>, supplies are categorized into three distinct tax treatments:</p><p><strong>Standard Rate (15%)</strong></p><p>The standard rate of <strong>15%</strong> applies to all taxable supplies of goods and services manufactured or provided within the country, as well as on all imported goods, unless explicitly specified otherwise by law.</p><ul><li><p><strong>Key Feature:</strong> Businesses charging the standard rate are entitled to claim input tax deductions on their business inputs.</p></li></ul><p><strong>Zero-Rated Supplies (0%)</strong></p><p>Zero-rated supplies are technically taxable, but the rate applied is <strong>0%</strong>. This treatment is primarily used to encourage specific economic behaviors, such as boosting local production competitiveness in global markets.</p><ul><li><p><strong>Key Feature:</strong> Registered taxpayers can fully deduct or claim a refund for the input VAT incurred while producing zero-rated supplies.</p></li><li><p><strong>Examples:</strong> Qualifying exports of goods and services, and international transport or logistics.</p></li></ul><p><strong>Exempt Supplies</strong></p><p>Exempt supplies are completely outside the scope of VAT and are not subject to tax.</p><ul><li><p><strong>Key Feature:</strong> Unlike zero-rated supplies, businesses supplying exempt goods or services cannot deduct or reclaim any input tax incurred during production. This cost is absorbed by the business or passed on to consumers as part of the cost price.</p></li><li><p><strong>Examples:</strong> Specified financial services, medical and educational services, and essential public utilities.</p></li></ul>",
    },
  });

  const vat101L2 = await prisma.lesson.create({
    data: {
      moduleId: vat101M1.id,
      title: "1.2 Input Tax Deductions & Electronic Return Filing",
      contentType: LessonContentType.DOCUMENT,
      durationMinutes: 30,
      order: 1,
      content: "<!--eltms-blocks:[{\"id\":\"block-presentation-1791949123145\",\"type\":\"PRESENTATION\",\"title\":\"Slide Deck Presentation\",\"url\":\"http://localhost:9000/eltms-files/undefined/3ee06927-f81b-4f2b-a727-b0f39e2d4160.pdf\",\"fileName\":\"file-sample_150kB.pdf\",\"fileSize\":142786},{\"id\":\"block-doc-1791924291292-0\",\"type\":\"DOCUMENT\",\"title\":\"Lecture Notes & Study Material\",\"content\":\"<p><strong>1. Input Tax Deduction Mechanisms</strong></p><p>Registered taxpayers are legally permitted to claim credits or deductions for Input VAT incurred on business-related purchases. This mechanism ensures that tax is only levied on the actual value added at each stage of production and distribution, effectively preventing tax cascading.</p><p>Input tax credits can be claimed on:</p><ul><li><p>Goods or raw materials purchased locally or imported for direct use in manufacturing or commercial operations.</p></li><li><p>Capital assets acquired to facilitate taxable business activities.</p></li><li><p>Commercial services procured from other registered taxpayers that directly support the generation of taxable supplies.</p></li></ul><p><strong>2. Mandatory Compliance and Substantiation Requirements</strong></p><p>To qualify for an input tax deduction, the transaction must fulfill strict statutory requirements enforced by the tax authority. Deductions will be disallowed unless the following criteria are met:</p><ul><li><p><strong>Valid Electronic Tax Invoices:</strong> Taxpayers must possess an approved electronic tax invoice or a receipt generated by an authorized Electronic Fiscal Device (EFD) or fiscal cash register.</p></li><li><p><strong>Identification Details:</strong> The electronic invoice must explicitly display both the supplier's and the buyer's official corporate names and unique Tax Identification Numbers (TIN).</p></li><li><p><strong>Direct Business Link:</strong> The underlying goods or services must be explicitly utilized or intended for use in making taxable supplies (standard-rated or zero-rated). Input tax allocated to exempt supplies is non-deductible.</p></li></ul><p><strong>3. Electronic Filing Procedures and Deadlines</strong></p><p>The administrative framework dictates specific protocols for accounting and reporting VAT collections to ensure transparency and electronic compliance:</p><ul><li><p><strong>Accounting Period:</strong> Under the current proclamation framework, the standard tax accounting period is one calendar month.</p></li><li><p><strong>Statutory Filing Deadline:</strong> Periodic VAT returns and corresponding net payments must be compiled and submitted electronically through the Integrated Tax Administration System (ITAS) portal no later than the last day of the month following the end of the tax period.</p></li><li><p><strong>Consequences of Non-Compliance:</strong> Failure to file within the statutory timeframe or submitting inaccurate figures triggers automated penalties, including fixed monthly late-filing fines and cumulative interest charges on outstanding liabilities.</p></li></ul>\"}]-->\n<p><strong>1. Input Tax Deduction Mechanisms</strong></p><p>Registered taxpayers are legally permitted to claim credits or deductions for Input VAT incurred on business-related purchases. This mechanism ensures that tax is only levied on the actual value added at each stage of production and distribution, effectively preventing tax cascading.</p><p>Input tax credits can be claimed on:</p><ul><li><p>Goods or raw materials purchased locally or imported for direct use in manufacturing or commercial operations.</p></li><li><p>Capital assets acquired to facilitate taxable business activities.</p></li><li><p>Commercial services procured from other registered taxpayers that directly support the generation of taxable supplies.</p></li></ul><p><strong>2. Mandatory Compliance and Substantiation Requirements</strong></p><p>To qualify for an input tax deduction, the transaction must fulfill strict statutory requirements enforced by the tax authority. Deductions will be disallowed unless the following criteria are met:</p><ul><li><p><strong>Valid Electronic Tax Invoices:</strong> Taxpayers must possess an approved electronic tax invoice or a receipt generated by an authorized Electronic Fiscal Device (EFD) or fiscal cash register.</p></li><li><p><strong>Identification Details:</strong> The electronic invoice must explicitly display both the supplier's and the buyer's official corporate names and unique Tax Identification Numbers (TIN).</p></li><li><p><strong>Direct Business Link:</strong> The underlying goods or services must be explicitly utilized or intended for use in making taxable supplies (standard-rated or zero-rated). Input tax allocated to exempt supplies is non-deductible.</p></li></ul><p><strong>3. Electronic Filing Procedures and Deadlines</strong></p><p>The administrative framework dictates specific protocols for accounting and reporting VAT collections to ensure transparency and electronic compliance:</p><ul><li><p><strong>Accounting Period:</strong> Under the current proclamation framework, the standard tax accounting period is one calendar month.</p></li><li><p><strong>Statutory Filing Deadline:</strong> Periodic VAT returns and corresponding net payments must be compiled and submitted electronically through the Integrated Tax Administration System (ITAS) portal no later than the last day of the month following the end of the tax period.</p></li><li><p><strong>Consequences of Non-Compliance:</strong> Failure to file within the statutory timeframe or submitting inaccurate figures triggers automated penalties, including fixed monthly late-filing fines and cumulative interest charges on outstanding liabilities.</p></li></ul>",
    },
  });

  // Assessments for VAT101
  await prisma.assessment.create({
    data: {
      courseId: vat101.id,
      moduleId: vat101M1.id,
      type: AssessmentType.MODULE_ASSESSMENT,
      titleEn: "Module Assessment",
      titleAm: "Module Assessment",
      passingScore: 50,
      weight: 20,
      timeLimitMinutes: 30,
      questions: [{"id":"q-1791949332949-16","type":"MULTIPLE_CHOICE","points":4,"options":["The transaction is zero-rated (0%), and the business is fully entitled to deduct the related input tax.","The transaction is exempt, and the business cannot claim any input tax deductions.","The transaction is standard-rated (15%), and the international buyer must pay the tax.","The transaction is out of scope, meaning no input tax can be deducted or tracked."],"question":"<p>An Ethiopian business exports standard-rated agricultural processing machinery to an international buyer. How should the revenue official evaluate the VAT treatment on this transaction and its related input costs?</p>","correctAnswer":0},{"id":"q-1791949379875-17","type":"MULTIPLE_CHOICE","points":4,"options":["The taxpayer will face automated late-filing penalties, and the input credits from manual receipts will be disallowed.","The taxpayer is granted an automatic 30-day filing extension if they are waiting for supplier invoices.","The taxpayer can claim the input tax using any receipt format, provided the tax amount is accurate.","The taxpayer is legally exempt from penalties if they can prove the transaction was purely for business purposes."],"category":"","question":"<p>A registered taxpayer files their monthly VAT return late because they were waiting for manual, non-electronic receipts from a supplier to claim input credits. Which statement accurately reflects their legal standing under compliance rules?</p>","correctAnswer":0},{"id":"q-1791949419958-18","type":"MULTIPLE_CHOICE","points":4,"options":["It can only deduct input tax for expenses directly linked to the commercial skincare products.","It can deduct all input tax across both operations because it is a registered corporate entity.","It cannot claim any input tax deductions whatsoever because its primary business is exempt.","It can deduct all input tax, but only if it files its electronic returns quarterly instead of monthly."],"category":"","question":"<p>A private medical clinic provides healthcare services (an exempt supply) but also sells premium, commercial skincare products in its lobby. How must the clinic handle its input tax deductions?</p>","correctAnswer":0},{"id":"q-1791949459508-19","type":"TRUE_FALSE","points":4,"options":["True","False"],"category":"","question":"<p>While a zero-rated supply allows a registered taxpayer to fully reclaim incurred input VAT from the revenue portal, an exempt supply forces the business to absorb that input tax as a cost.</p>","correctAnswer":0},{"id":"q-1791949476975-20","type":"TRUE_FALSE","points":4,"options":["True","False"],"category":"","question":"<p>Under the current compliance framework, if a business files its monthly VAT return on the 15th day of the following month, it will automatically trigger electronic late-filing fines.</p>","correctAnswer":0}] as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.assessment.create({
    data: {
      courseId: vat101.id,
      moduleId: vat101M1.id,
      lessonId: vat101L1.id,
      type: AssessmentType.LESSON_ASSESSMENT,
      titleEn: "Lesson 1.1 Assessment",
      titleAm: "Lesson 1.1 Assessment",
      passingScore: 50,
      weight: 10,
      timeLimitMinutes: 15,
      questions: [{"id":"q-1791923858922-2","type":"MULTIPLE_CHOICE","points":2,"options":["The final consumer","The registered manufacturer","The retail distributor"," The revenue officer"],"category":"","question":"<p>Who ultimately bears the economic burden of Value Added Tax (VAT)?</p>","correctAnswer":0},{"id":"q-1791923947118-3","type":"MULTIPLE_CHOICE","points":2,"options":["Registered taxpayers can fully deduct or claim a refund for the input VAT incurred.","Taxpayers are prohibited from claiming any input tax credit on business inputs.","The supply is entirely outside the scope of VAT and requires no tax documentation.","The tax rate fluctuates automatically based on the volume of local production."],"category":"","question":"<p>What is a key operational characteristic of zero-rated supplies (0%) under the Ethiopian VAT framework?</p>","correctAnswer":0},{"id":"q-1791924108405-4","type":"MULTIPLE_CHOICE","points":2,"options":["15%","10%","5%","0%"],"category":"","question":"<p>What is the standard VAT rate applied to most taxable goods, services, and imports in Ethiopia?</p>","correctAnswer":0},{"id":"q-1791924147169-5","type":"TRUE_FALSE","points":2,"options":["True","False"],"category":"","question":"<p>Businesses supplying exempt goods or services are legally entitled to claim input tax deductions for the VAT incurred during production.</p>","correctAnswer":0},{"id":"q-1791924171693-6","type":"TRUE_FALSE","points":2,"options":["True","False"],"category":"","question":"<p>Value Added Tax (VAT) is collected on the value added to goods and services at each stage of the production and distribution chain.</p>","correctAnswer":0}] as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.assessment.create({
    data: {
      courseId: vat101.id,
      moduleId: vat101M1.id,
      lessonId: vat101L2.id,
      type: AssessmentType.LESSON_ASSESSMENT,
      titleEn: "Lesson  1.2 Assessment",
      titleAm: "Lesson  1.2 Assessment",
      passingScore: 50,
      weight: 10,
      timeLimitMinutes: 15,
      questions: [{"id":"q-1791924394330-8","type":"MULTIPLE_CHOICE","points":2,"options":["It prevents tax cascading by ensuring VAT is only levied on the actual value added.","It exempts businesses from having to collect output tax from their customers.","It allows businesses to claim refunds on goods used exclusively for exempt supplies.","It eliminates the requirement to maintain monthly transaction records."],"category":"","question":"<p>What is the primary operational benefit of the input tax deduction mechanism for registered taxpayers?</p>","correctAnswer":0},{"id":"q-1791924443652-9","type":"MULTIPLE_CHOICE","points":2,"options":["The unique Tax Identification Numbers (TIN) of both the supplier and the buyer","The commercial banking account details of the purchasing business","The projected retail profit margin of the items purchased","The income tax clearance certificate number of the seller"],"category":"","question":"<p>Which of the following must be explicitly displayed on an electronic invoice for an input tax credit to be legally valid?</p>","correctAnswer":0},{"id":"q-1791924502615-10","type":"MULTIPLE_CHOICE","points":2,"options":["• The last day of the calendar month following the end of the tax period"," Within five working days after the close of the transaction week","• The fifteenth day of the concurrent tax accounting period","Exactly ninety days after the close of the fiscal year"],"category":"","question":"<p>What is the statutory deadline for electronically filing monthly VAT returns through the tax portal?</p>","correctAnswer":0},{"id":"q-1791948916310-11","type":"TRUE_FALSE","points":2,"options":["True","False"],"category":"","question":"<p>Input tax incurred on goods or services used directly to produce exempt supplies can be fully claimed as a deduction by a registered taxpayer.</p>","correctAnswer":0},{"id":"q-1791948940412-12","type":"TRUE_FALSE","points":2,"options":["True","False"],"category":"","question":"<p>Failure to electronically submit a VAT return by the mandatory statutory deadline results in automated administrative penalties and late-filing fines.</p>","correctAnswer":0}] as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.assessment.create({
    data: {
      courseId: vat101.id,
      type: AssessmentType.FINAL_ASSESSMENT,
      titleEn: "Final Assessment: VAT Fundamentals",
      titleAm: "Final Assessment: VAT Fundamentals",
      passingScore: 75,
      weight: 60,
      timeLimitMinutes: 30,
      questions: [{"id":"vat101-q1","type":"MULTIPLE_CHOICE","points":30,"options":["15%","10%","20%","5%"],"category":"VAT Rates","question":"What is the standard VAT rate in Ethiopia?","correctAnswer":0},{"id":"vat101-q2","type":"MULTIPLE_CHOICE","points":30,"options":["Zero-rated supplies","Exempt supplies","Out-of-scope transactions","Personal consumption"],"category":"Input VAT","question":"Which supply category allows full credit deduction of input VAT?","correctAnswer":0}] as unknown as Prisma.InputJsonValue,
    },
  });

  // 1 Virtual Live Session for VAT101
  await prisma.liveSession.create({
    data: {
      courseId: vat101.id,
      trainerId: onlineTrainer.id,
      titleEn: "VAT101 Live Webinar: Practical Electronic Return Reconciliation",
      titleAm: "የቫት 101 የቀጥታ ስርጭት ስልጠና፡ የኤሌክትሮኒክስ ታክስ ማስታወቂያ እርቅ",
      descriptionEn: "Interactive virtual session resolving common reconciliation discrepancies on e-Tax.",
      descriptionAm: "በኢ-ታክስ ስርዓት የሚከሰቱ የተለመዱ የታክስ ማስታወቂያ ስህተቶችን መፍታት።",
      platform: SessionPlatform.LIVEKIT,
      sessionType: SessionType.VIRTUAL,
      status: SessionStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      durationMinutes: 60,
      allowViewAttendance: true,
    },
  });

  // ────────────────────────────────────────────────────────────
  // 2. VAT102: Pure In-Person Course (IN_PERSON_ONLY)
  // ────────────────────────────────────────────────────────────
  console.log("  🏢 [IN_PERSON_ONLY] Seeding VAT102: VAT Practical Classroom Training & Field Compliance Lab...");
  const vat102 = await prisma.course.create({
    data: {
      code: "VAT102",
      title: "VAT Practical Classroom Training & Field Compliance Lab",
      description: "A comprehensive, self-paced digital course designed specifically for revenue officials to master the core principles and practical applications of the Ethiopian Value Added Tax (VAT) framework. This course provides an in-depth analysis of the current VAT proclamation, guiding learners through taxable transactions, statutory rates, and complex input/output tax netting mechanisms. Participants will gain practical expertise in evaluating complex exemption scenarios, identifying zero-rated versus exempt supplies, and enforcing compliance through modern electronic filing systems. By the end of this course, officers will be fully equipped to conduct accurate tax assessments, lead precise audits, and confidently minimize revenue leakage.",
      objectives: "<ul><li><p><strong>Interpret Legal Frameworks:</strong> Analyze and apply the fundamental legal principles of the Ethiopian VAT Proclamation to real-world tax scenarios.</p></li><li><p><strong>Determine Taxability:</strong> Accurately classify taxable supplies, apply correct statutory rates, and determine the time and place of supply.</p></li><li><p><strong>Calculate Netting Mechanisms:</strong> Perform precise calculations for input tax deductions, output tax liabilities, and complex apportionment rules.</p></li><li><p><strong>Distinguish Exemptions:</strong> Differentiate between zero-rated and exempt supplies to prevent erroneous tax credit claims.</p></li><li><p><strong>Master Digital Compliance:</strong> Direct and verify electronic tax filing and return procedures using the online revenue portal.</p></li><li><p><strong>Conduct Audits:</strong> Identify common risk areas, errors, and fraudulent patterns during VAT assessments and audit investigations.</p></li></ul>",
      level: CourseLevel.INTERMEDIATE,
      category: "Tax Administration",
      department: "Domestic Tax Operations",
      targetAudience: "Revenue officers, domestic tax auditors, and branch compliance staff.",
      deliveryMethod: "classroom",
      deliveryMode: CourseDeliveryMode.IN_PERSON_ONLY,
      hasOnlineSessions: true,
      estimatedHours: 0.92,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      thumbnailUrl: COVER,
      owners: { create: [{ userId: ownerId }] },
      trainers: { create: [{ userId: users.branchTrainers["Adama Branch Office"][0].id }] },
      approvals: {
        create: [
          {
            approverId,
            status: ApprovalStatus.APPROVED,
            decidedAt: new Date(),
            comments: "Approved for in-person classroom delivery across MoR regional branch venues.",
          },
        ],
      },
    },
  });
  await addCourseAttachment(vat102.id, "VAT102");

  // VAT102 Modules
  const vat102M1 = await prisma.curriculumModule.create({
    data: {
      courseId: vat102.id,
      title: "Module 1: Foundations of Value Added Tax",
      description: "Core concepts of Ethiopian VAT, economic incidence, and supply categories.",
      objectives: "Identify taxable supplies, calculate gross amounts, and review legal exemptions.",
      order: 0,
      passingScore: 50,
    },
  });

  const vat102L1 = await prisma.lesson.create({
    data: {
      moduleId: vat102M1.id,
      title: "1.1 Taxable Supplies & Statutory Rates",
      contentType: LessonContentType.DOCUMENT,
      durationMinutes: 25,
      order: 0,
      content: "<!--eltms-blocks:[{\"id\":\"block-video-1791923572082\",\"type\":\"VIDEO\",\"title\":\"Video Lecture\",\"url\":\"http://localhost:9000/eltms-files/undefined/24cd576f-15a7-4050-965e-60b14cfcef5c.mp4\",\"fileName\":\"sample.mp4\",\"fileSize\":1570024},{\"id\":\"block-doc-1791923514162-0\",\"type\":\"DOCUMENT\",\"title\":\"Lecture Notes & Study Material\",\"content\":\"<p><strong>1. Core Principles of Value Added Tax (VAT)</strong></p><p><strong>Value Added Tax (VAT)</strong> is a broad-based consumption tax levied at each stage of the production and distribution chain. It is collected on the value added to goods and services by businesses at each stage. While registered businesses collect and remit the tax, the ultimate economic burden of VAT is borne by the final consumer.</p><p><strong>2. Statutory VAT Rates &amp; Classifications</strong></p><p>Under the <strong>Ethiopian VAT framework</strong>, supplies are categorized into three distinct tax treatments:</p><p><strong>Standard Rate (15%)</strong></p><p>The standard rate of <strong>15%</strong> applies to all taxable supplies of goods and services manufactured or provided within the country, as well as on all imported goods, unless explicitly specified otherwise by law.</p><ul><li><p><strong>Key Feature:</strong> Businesses charging the standard rate are entitled to claim input tax deductions on their business inputs.</p></li></ul><p><strong>Zero-Rated Supplies (0%)</strong></p><p>Zero-rated supplies are technically taxable, but the rate applied is <strong>0%</strong>. This treatment is primarily used to encourage specific economic behaviors, such as boosting local production competitiveness in global markets.</p><ul><li><p><strong>Key Feature:</strong> Registered taxpayers can fully deduct or claim a refund for the input VAT incurred while producing zero-rated supplies.</p></li><li><p><strong>Examples:</strong> Qualifying exports of goods and services, and international transport or logistics.</p></li></ul><p><strong>Exempt Supplies</strong></p><p>Exempt supplies are completely outside the scope of VAT and are not subject to tax.</p><ul><li><p><strong>Key Feature:</strong> Unlike zero-rated supplies, businesses supplying exempt goods or services cannot deduct or reclaim any input tax incurred during production. This cost is absorbed by the business or passed on to consumers as part of the cost price.</p></li><li><p><strong>Examples:</strong> Specified financial services, medical and educational services, and essential public utilities.</p></li></ul>\"}]-->\n<p><strong>1. Core Principles of Value Added Tax (VAT)</strong></p><p><strong>Value Added Tax (VAT)</strong> is a broad-based consumption tax levied at each stage of the production and distribution chain. It is collected on the value added to goods and services by businesses at each stage. While registered businesses collect and remit the tax, the ultimate economic burden of VAT is borne by the final consumer.</p><p><strong>2. Statutory VAT Rates &amp; Classifications</strong></p><p>Under the <strong>Ethiopian VAT framework</strong>, supplies are categorized into three distinct tax treatments:</p><p><strong>Standard Rate (15%)</strong></p><p>The standard rate of <strong>15%</strong> applies to all taxable supplies of goods and services manufactured or provided within the country, as well as on all imported goods, unless explicitly specified otherwise by law.</p><ul><li><p><strong>Key Feature:</strong> Businesses charging the standard rate are entitled to claim input tax deductions on their business inputs.</p></li></ul><p><strong>Zero-Rated Supplies (0%)</strong></p><p>Zero-rated supplies are technically taxable, but the rate applied is <strong>0%</strong>. This treatment is primarily used to encourage specific economic behaviors, such as boosting local production competitiveness in global markets.</p><ul><li><p><strong>Key Feature:</strong> Registered taxpayers can fully deduct or claim a refund for the input VAT incurred while producing zero-rated supplies.</p></li><li><p><strong>Examples:</strong> Qualifying exports of goods and services, and international transport or logistics.</p></li></ul><p><strong>Exempt Supplies</strong></p><p>Exempt supplies are completely outside the scope of VAT and are not subject to tax.</p><ul><li><p><strong>Key Feature:</strong> Unlike zero-rated supplies, businesses supplying exempt goods or services cannot deduct or reclaim any input tax incurred during production. This cost is absorbed by the business or passed on to consumers as part of the cost price.</p></li><li><p><strong>Examples:</strong> Specified financial services, medical and educational services, and essential public utilities.</p></li></ul>",
    },
  });

  const vat102L2 = await prisma.lesson.create({
    data: {
      moduleId: vat102M1.id,
      title: "1.2 Input Tax Deductions & Electronic Return Filing",
      contentType: LessonContentType.DOCUMENT,
      durationMinutes: 30,
      order: 1,
      content: "<!--eltms-blocks:[{\"id\":\"block-presentation-1791949123145\",\"type\":\"PRESENTATION\",\"title\":\"Slide Deck Presentation\",\"url\":\"http://localhost:9000/eltms-files/undefined/3ee06927-f81b-4f2b-a727-b0f39e2d4160.pdf\",\"fileName\":\"file-sample_150kB.pdf\",\"fileSize\":142786},{\"id\":\"block-doc-1791924291292-0\",\"type\":\"DOCUMENT\",\"title\":\"Lecture Notes & Study Material\",\"content\":\"<p><strong>1. Input Tax Deduction Mechanisms</strong></p><p>Registered taxpayers are legally permitted to claim credits or deductions for Input VAT incurred on business-related purchases. This mechanism ensures that tax is only levied on the actual value added at each stage of production and distribution, effectively preventing tax cascading.</p><p>Input tax credits can be claimed on:</p><ul><li><p>Goods or raw materials purchased locally or imported for direct use in manufacturing or commercial operations.</p></li><li><p>Capital assets acquired to facilitate taxable business activities.</p></li><li><p>Commercial services procured from other registered taxpayers that directly support the generation of taxable supplies.</p></li></ul><p><strong>2. Mandatory Compliance and Substantiation Requirements</strong></p><p>To qualify for an input tax deduction, the transaction must fulfill strict statutory requirements enforced by the tax authority. Deductions will be disallowed unless the following criteria are met:</p><ul><li><p><strong>Valid Electronic Tax Invoices:</strong> Taxpayers must possess an approved electronic tax invoice or a receipt generated by an authorized Electronic Fiscal Device (EFD) or fiscal cash register.</p></li><li><p><strong>Identification Details:</strong> The electronic invoice must explicitly display both the supplier's and the buyer's official corporate names and unique Tax Identification Numbers (TIN).</p></li><li><p><strong>Direct Business Link:</strong> The underlying goods or services must be explicitly utilized or intended for use in making taxable supplies (standard-rated or zero-rated). Input tax allocated to exempt supplies is non-deductible.</p></li></ul><p><strong>3. Electronic Filing Procedures and Deadlines</strong></p><p>The administrative framework dictates specific protocols for accounting and reporting VAT collections to ensure transparency and electronic compliance:</p><ul><li><p><strong>Accounting Period:</strong> Under the current proclamation framework, the standard tax accounting period is one calendar month.</p></li><li><p><strong>Statutory Filing Deadline:</strong> Periodic VAT returns and corresponding net payments must be compiled and submitted electronically through the Integrated Tax Administration System (ITAS) portal no later than the last day of the month following the end of the tax period.</p></li><li><p><strong>Consequences of Non-Compliance:</strong> Failure to file within the statutory timeframe or submitting inaccurate figures triggers automated penalties, including fixed monthly late-filing fines and cumulative interest charges on outstanding liabilities.</p></li></ul>\"}]-->\n<p><strong>1. Input Tax Deduction Mechanisms</strong></p><p>Registered taxpayers are legally permitted to claim credits or deductions for Input VAT incurred on business-related purchases. This mechanism ensures that tax is only levied on the actual value added at each stage of production and distribution, effectively preventing tax cascading.</p><p>Input tax credits can be claimed on:</p><ul><li><p>Goods or raw materials purchased locally or imported for direct use in manufacturing or commercial operations.</p></li><li><p>Capital assets acquired to facilitate taxable business activities.</p></li><li><p>Commercial services procured from other registered taxpayers that directly support the generation of taxable supplies.</p></li></ul><p><strong>2. Mandatory Compliance and Substantiation Requirements</strong></p><p>To qualify for an input tax deduction, the transaction must fulfill strict statutory requirements enforced by the tax authority. Deductions will be disallowed unless the following criteria are met:</p><ul><li><p><strong>Valid Electronic Tax Invoices:</strong> Taxpayers must possess an approved electronic tax invoice or a receipt generated by an authorized Electronic Fiscal Device (EFD) or fiscal cash register.</p></li><li><p><strong>Identification Details:</strong> The electronic invoice must explicitly display both the supplier's and the buyer's official corporate names and unique Tax Identification Numbers (TIN).</p></li><li><p><strong>Direct Business Link:</strong> The underlying goods or services must be explicitly utilized or intended for use in making taxable supplies (standard-rated or zero-rated). Input tax allocated to exempt supplies is non-deductible.</p></li></ul><p><strong>3. Electronic Filing Procedures and Deadlines</strong></p><p>The administrative framework dictates specific protocols for accounting and reporting VAT collections to ensure transparency and electronic compliance:</p><ul><li><p><strong>Accounting Period:</strong> Under the current proclamation framework, the standard tax accounting period is one calendar month.</p></li><li><p><strong>Statutory Filing Deadline:</strong> Periodic VAT returns and corresponding net payments must be compiled and submitted electronically through the Integrated Tax Administration System (ITAS) portal no later than the last day of the month following the end of the tax period.</p></li><li><p><strong>Consequences of Non-Compliance:</strong> Failure to file within the statutory timeframe or submitting inaccurate figures triggers automated penalties, including fixed monthly late-filing fines and cumulative interest charges on outstanding liabilities.</p></li></ul>",
    },
  });

  // Assessments for VAT102
  await prisma.assessment.create({
    data: {
      courseId: vat102.id,
      moduleId: vat102M1.id,
      type: AssessmentType.MODULE_ASSESSMENT,
      titleEn: "Module Assessment",
      titleAm: "Module Assessment",
      passingScore: 50,
      weight: 20,
      timeLimitMinutes: 30,
      questions: [{"id":"q-1791949332949-16","type":"MULTIPLE_CHOICE","points":4,"options":["The transaction is zero-rated (0%), and the business is fully entitled to deduct the related input tax.","The transaction is exempt, and the business cannot claim any input tax deductions.","The transaction is standard-rated (15%), and the international buyer must pay the tax.","The transaction is out of scope, meaning no input tax can be deducted or tracked."],"question":"<p>An Ethiopian business exports standard-rated agricultural processing machinery to an international buyer. How should the revenue official evaluate the VAT treatment on this transaction and its related input costs?</p>","correctAnswer":0},{"id":"q-1791949379875-17","type":"MULTIPLE_CHOICE","points":4,"options":["The taxpayer will face automated late-filing penalties, and the input credits from manual receipts will be disallowed.","The taxpayer is granted an automatic 30-day filing extension if they are waiting for supplier invoices.","The taxpayer can claim the input tax using any receipt format, provided the tax amount is accurate.","The taxpayer is legally exempt from penalties if they can prove the transaction was purely for business purposes."],"category":"","question":"<p>A registered taxpayer files their monthly VAT return late because they were waiting for manual, non-electronic receipts from a supplier to claim input credits. Which statement accurately reflects their legal standing under compliance rules?</p>","correctAnswer":0},{"id":"q-1791949419958-18","type":"MULTIPLE_CHOICE","points":4,"options":["It can only deduct input tax for expenses directly linked to the commercial skincare products.","It can deduct all input tax across both operations because it is a registered corporate entity.","It cannot claim any input tax deductions whatsoever because its primary business is exempt.","It can deduct all input tax, but only if it files its electronic returns quarterly instead of monthly."],"category":"","question":"<p>A private medical clinic provides healthcare services (an exempt supply) but also sells premium, commercial skincare products in its lobby. How must the clinic handle its input tax deductions?</p>","correctAnswer":0},{"id":"q-1791949459508-19","type":"TRUE_FALSE","points":4,"options":["True","False"],"category":"","question":"<p>While a zero-rated supply allows a registered taxpayer to fully reclaim incurred input VAT from the revenue portal, an exempt supply forces the business to absorb that input tax as a cost.</p>","correctAnswer":0},{"id":"q-1791949476975-20","type":"TRUE_FALSE","points":4,"options":["True","False"],"category":"","question":"<p>Under the current compliance framework, if a business files its monthly VAT return on the 15th day of the following month, it will automatically trigger electronic late-filing fines.</p>","correctAnswer":0}] as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.assessment.create({
    data: {
      courseId: vat102.id,
      moduleId: vat102M1.id,
      lessonId: vat102L1.id,
      type: AssessmentType.LESSON_ASSESSMENT,
      titleEn: "Lesson 1.1 Assessment",
      titleAm: "Lesson 1.1 Assessment",
      passingScore: 50,
      weight: 10,
      timeLimitMinutes: 15,
      questions: [{"id":"q-1791923858922-2","type":"MULTIPLE_CHOICE","points":2,"options":["The final consumer","The registered manufacturer","The retail distributor"," The revenue officer"],"category":"","question":"<p>Who ultimately bears the economic burden of Value Added Tax (VAT)?</p>","correctAnswer":0},{"id":"q-1791923947118-3","type":"MULTIPLE_CHOICE","points":2,"options":["Registered taxpayers can fully deduct or claim a refund for the input VAT incurred.","Taxpayers are prohibited from claiming any input tax credit on business inputs.","The supply is entirely outside the scope of VAT and requires no tax documentation.","The tax rate fluctuates automatically based on the volume of local production."],"category":"","question":"<p>What is a key operational characteristic of zero-rated supplies (0%) under the Ethiopian VAT framework?</p>","correctAnswer":0},{"id":"q-1791924108405-4","type":"MULTIPLE_CHOICE","points":2,"options":["15%","10%","5%","0%"],"category":"","question":"<p>What is the standard VAT rate applied to most taxable goods, services, and imports in Ethiopia?</p>","correctAnswer":0},{"id":"q-1791924147169-5","type":"TRUE_FALSE","points":2,"options":["True","False"],"category":"","question":"<p>Businesses supplying exempt goods or services are legally entitled to claim input tax deductions for the VAT incurred during production.</p>","correctAnswer":0},{"id":"q-1791924171693-6","type":"TRUE_FALSE","points":2,"options":["True","False"],"category":"","question":"<p>Value Added Tax (VAT) is collected on the value added to goods and services at each stage of the production and distribution chain.</p>","correctAnswer":0}] as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.assessment.create({
    data: {
      courseId: vat102.id,
      moduleId: vat102M1.id,
      lessonId: vat102L2.id,
      type: AssessmentType.LESSON_ASSESSMENT,
      titleEn: "Lesson  1.2 Assessment",
      titleAm: "Lesson  1.2 Assessment",
      passingScore: 50,
      weight: 10,
      timeLimitMinutes: 15,
      questions: [{"id":"q-1791924394330-8","type":"MULTIPLE_CHOICE","points":2,"options":["It prevents tax cascading by ensuring VAT is only levied on the actual value added.","It exempts businesses from having to collect output tax from their customers.","It allows businesses to claim refunds on goods used exclusively for exempt supplies.","It eliminates the requirement to maintain monthly transaction records."],"category":"","question":"<p>What is the primary operational benefit of the input tax deduction mechanism for registered taxpayers?</p>","correctAnswer":0},{"id":"q-1791924443652-9","type":"MULTIPLE_CHOICE","points":2,"options":["The unique Tax Identification Numbers (TIN) of both the supplier and the buyer","The commercial banking account details of the purchasing business","The projected retail profit margin of the items purchased","The income tax clearance certificate number of the seller"],"category":"","question":"<p>Which of the following must be explicitly displayed on an electronic invoice for an input tax credit to be legally valid?</p>","correctAnswer":0},{"id":"q-1791924502615-10","type":"MULTIPLE_CHOICE","points":2,"options":["• The last day of the calendar month following the end of the tax period"," Within five working days after the close of the transaction week","• The fifteenth day of the concurrent tax accounting period","Exactly ninety days after the close of the fiscal year"],"category":"","question":"<p>What is the statutory deadline for electronically filing monthly VAT returns through the tax portal?</p>","correctAnswer":0},{"id":"q-1791948916310-11","type":"TRUE_FALSE","points":2,"options":["True","False"],"category":"","question":"<p>Input tax incurred on goods or services used directly to produce exempt supplies can be fully claimed as a deduction by a registered taxpayer.</p>","correctAnswer":0},{"id":"q-1791948940412-12","type":"TRUE_FALSE","points":2,"options":["True","False"],"category":"","question":"<p>Failure to electronically submit a VAT return by the mandatory statutory deadline results in automated administrative penalties and late-filing fines.</p>","correctAnswer":0}] as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.assessment.create({
    data: {
      courseId: vat102.id,
      type: AssessmentType.FINAL_ASSESSMENT,
      titleEn: "Final Assessment: VAT Fundamentals",
      titleAm: "Final Assessment: VAT Fundamentals",
      passingScore: 75,
      weight: 60,
      timeLimitMinutes: 30,
      questions: [{"id":"vat101-q1","type":"MULTIPLE_CHOICE","points":30,"options":["15%","10%","20%","5%"],"category":"VAT Rates","question":"What is the standard VAT rate in Ethiopia?","correctAnswer":0},{"id":"vat101-q2","type":"MULTIPLE_CHOICE","points":30,"options":["Zero-rated supplies","Exempt supplies","Out-of-scope transactions","Personal consumption"],"category":"Input VAT","question":"Which supply category allows full credit deduction of input VAT?","correctAnswer":0}] as unknown as Prisma.InputJsonValue,
    },
  });

  // VAT102 Planned Classroom Sessions
  const plan1 = await prisma.courseSessionPlan.create({
    data: {
      courseId: vat102.id,
      order: 0,
      titleEn: 'Classroom Session 1: Practical VAT Filing & Tax Invoice Audit Workshop',
      descriptionEn:
        'Hands-on classroom lab calculating net VAT, auditing tax invoices with electronic fiscal registers (FMR/CIS), and reconciling monthly returns.',
      objectivesEn:
        'Demonstrate practical calculation of net VAT payable; identify invalid tax invoices; complete electronic declaration forms accurately.',
      trainerId: users.branchTrainers['Adama Branch Office'][0].id,
    },
  });

  const plan2 = await prisma.courseSessionPlan.create({
    data: {
      courseId: vat102.id,
      order: 1,
      titleEn: 'Classroom Session 2: Branch EFD Compliance & Field Inspection Lab',
      descriptionEn:
        'Classroom case study analyzing disputed tax assessments, non-compliance penalties, and conducting field audit simulations.',
      objectivesEn:
        'Apply statutory penalties for non-filing; conduct audit reconciliation interviews; draft audit assessment notices.',
      trainerId: users.branchTrainers['Adama Branch Office'][1].id,
    },
  });

  // Formative quiz for classroom session 1
  await prisma.assessment.create({
    data: {
      courseId: vat102.id,
      sessionPlanId: plan1.id,
      type: AssessmentType.SESSION_ASSESSMENT,
      titleEn: 'Classroom Session 1 Formative Quiz',
      titleAm: 'የመማሪያ ክፍል ክፍለ-ጊዜ 1 ምዘና ፈተና',
      passingScore: 0,
      weight: 0,
      questions: [
        {
          id: 'vat102-p1-q1',
          type: 'MULTIPLE_CHOICE',
          question: 'Which document is strictly required to claim an input tax deduction?',
          options: ['Valid Fiscal Tax Invoice', 'Informal Cash Receipt', 'Bank Deposit Slip Only', 'Proforma Invoice'],
          correctAnswer: 0,
          points: 10,
          category: 'Tax Invoicing',
        },
      ] as unknown as Prisma.InputJsonValue,
    },
  });

  // Schedule Multi-Round In-Person Sessions for all venues
  const now = new Date();
  const branchList = [
    { name: 'Adama Branch Office', venue: venues.adamaCenter, trainers: users.branchTrainers['Adama Branch Office'] },
    { name: 'Addis Ababa Head Office', venue: venues.addisHQHallA, trainers: users.branchTrainers['Addis Ababa Head Office'] },
    { name: 'Hawassa Branch Office', venue: venues.hawassaHub, trainers: users.branchTrainers['Hawassa Branch Office'] },
    { name: 'Bahir Dar Branch Office', venue: venues.bahirDarRoom, trainers: users.branchTrainers['Bahir Dar Branch Office'] },
    { name: 'Dire Dawa Branch Office', venue: venues.direDawaLab, trainers: users.branchTrainers['Dire Dawa Branch Office'] },
  ];

  for (let bIndex = 0; bIndex < branchList.length; bIndex++) {
    const b = branchList[bIndex];
    const isFirstBranch = bIndex === 0;
    const tSpecialist1 = b.trainers[0];
    const tSpecialist2 = b.trainers[1] || b.trainers[0];

    // ROUND 1: Morning Sessions (Session 1 on Day 1, Session 2 on Day 2)
    const r1Date1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    r1Date1.setHours(9, 30, 0, 0);
    const r1Date2 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    r1Date2.setHours(9, 30, 0, 0);

    await prisma.liveSession.create({
      data: {
        courseId: vat102.id,
        venueId: b.venue.id,
        trainerId: tSpecialist1.id,
        sessionPlanId: isFirstBranch ? plan1.id : null,
        originalPlanId: plan1.id,
        plannedOrder: 0,
        rescheduleStatus: 'ROUND_1',
        titleEn: plan1.titleEn,
        titleAm: plan1.titleEn,
        descriptionEn: plan1.descriptionEn,
        descriptionAm: plan1.descriptionEn,
        sessionType: SessionType.IN_PERSON,
        platform: SessionPlatform.IN_PERSON,
        status: SessionStatus.SCHEDULED,
        scheduledAt: r1Date1,
        durationMinutes: 90,
        allowViewAttendance: true,
      },
    });

    await prisma.liveSession.create({
      data: {
        courseId: vat102.id,
        venueId: b.venue.id,
        trainerId: tSpecialist2.id,
        sessionPlanId: isFirstBranch ? plan2.id : null,
        originalPlanId: plan2.id,
        plannedOrder: 1,
        rescheduleStatus: 'ROUND_1',
        titleEn: plan2.titleEn,
        titleAm: plan2.titleEn,
        descriptionEn: plan2.descriptionEn,
        descriptionAm: plan2.descriptionEn,
        sessionType: SessionType.IN_PERSON,
        platform: SessionPlatform.IN_PERSON,
        status: SessionStatus.SCHEDULED,
        scheduledAt: r1Date2,
        durationMinutes: 90,
        allowViewAttendance: true,
      },
    });

    // ROUND 2: Afternoon Sessions (Session 1 on Day 3, Session 2 on Day 4)
    const r2Date1 = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    r2Date1.setHours(14, 0, 0, 0);
    const r2Date2 = new Date(now.getTime() + 96 * 60 * 60 * 1000);
    r2Date2.setHours(14, 0, 0, 0);

    await prisma.liveSession.create({
      data: {
        courseId: vat102.id,
        venueId: b.venue.id,
        trainerId: tSpecialist1.id,
        sessionPlanId: null, // Secondary cohort round links to plan via originalPlanId
        originalPlanId: plan1.id,
        plannedOrder: 0,
        rescheduleStatus: 'ROUND_2',
        titleEn: plan1.titleEn,
        titleAm: plan1.titleEn,
        descriptionEn: plan1.descriptionEn,
        descriptionAm: plan1.descriptionEn,
        sessionType: SessionType.IN_PERSON,
        platform: SessionPlatform.IN_PERSON,
        status: SessionStatus.SCHEDULED,
        scheduledAt: r2Date1,
        durationMinutes: 90,
        allowViewAttendance: true,
      },
    });

    await prisma.liveSession.create({
      data: {
        courseId: vat102.id,
        venueId: b.venue.id,
        trainerId: tSpecialist2.id,
        sessionPlanId: null,
        originalPlanId: plan2.id,
        plannedOrder: 1,
        rescheduleStatus: 'ROUND_2',
        titleEn: plan2.titleEn,
        titleAm: plan2.titleEn,
        descriptionEn: plan2.descriptionEn,
        descriptionAm: plan2.descriptionEn,
        sessionType: SessionType.IN_PERSON,
        platform: SessionPlatform.IN_PERSON,
        status: SessionStatus.SCHEDULED,
        scheduledAt: r2Date2,
        durationMinutes: 90,
        allowViewAttendance: true,
      },
    });
  }
  console.log(`  ✓ Successfully scheduled Round 1 & Round 2 Classroom Sessions for VAT102 across all 5 branches.`);

  // ────────────────────────────────────────────────────────────
  // 3. TAX101: Pure Online Course (ONLINE_ONLY)
  // ────────────────────────────────────────────────────────────
  console.log('  📌 [ONLINE_ONLY] Seeding TAX101: Ethiopian Tax System Fundamentals...');
  const tax101 = await prisma.course.create({
    data: {
      code: 'TAX101',
      title: 'Ethiopian Tax System Fundamentals & Digital Filing Standards',
      description:
        'Introduction to domestic taxation framework in Ethiopia, direct vs indirect tax heads, and digital tax declaration via the e-Tax portal.',
      objectives:
        'Understand federal tax powers; navigate domestic tax schedules; calculate employment and business profit taxes.',
      level: CourseLevel.BASIC,
      category: 'Tax Administration',
      department: 'Domestic Tax Operations',
      targetAudience: 'New recruits, revenue assessment officers, and public sector accounting staff.',
      deliveryMethod: 'online',
      deliveryMode: CourseDeliveryMode.ONLINE_ONLY,
      hasOnlineSessions: true,
      estimatedHours: 4.0,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      thumbnailUrl: COVER,
      owners: { create: [{ userId: ownerId }] },
      trainers: { create: [{ userId: onlineTrainer.id }] },
      approvals: {
        create: [
          {
            approverId,
            status: ApprovalStatus.APPROVED,
            decidedAt: new Date(),
            comments: 'Approved for digital learning catalog.',
          },
        ],
      },
    },
  });
  await addCourseAttachment(tax101.id, 'TAX101');

  // ────────────────────────────────────────────────────────────
  // 4. CYBER301: Pure Online Course (ONLINE_ONLY)
  // ────────────────────────────────────────────────────────────
  console.log('  📌 [ONLINE_ONLY] Seeding CYBER301: Cybersecurity Awareness in Ministry Systems...');
  const cyber301 = await prisma.course.create({
    data: {
      code: 'CYBER301',
      title: 'Cybersecurity Awareness & Information Protection in Ministry Systems',
      description:
        'Essential cyber defense protocols for revenue staff: identifying spear phishing, securing confidential taxpayer records, and incident escalation.',
      objectives:
        'Recognize social engineering tactics; handle government credentials securely; respond to cyber security alerts.',
      level: CourseLevel.INTERMEDIATE,
      category: 'Information Security',
      department: 'Information Technology Division',
      targetAudience: 'All Ministry personnel accessing SIGTAS, e-Tax, and institutional networks.',
      deliveryMethod: 'online',
      deliveryMode: CourseDeliveryMode.ONLINE_ONLY,
      hasOnlineSessions: false,
      estimatedHours: 2.5,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      thumbnailUrl: COVER,
      owners: { create: [{ userId: ownerId }] },
      approvals: {
        create: [
          {
            approverId,
            status: ApprovalStatus.APPROVED,
            decidedAt: new Date(),
            comments: 'Approved security awareness curriculum.',
          },
        ],
      },
    },
  });
  await addCourseAttachment(cyber301.id, 'CYBER301');

  // ────────────────────────────────────────────────────────────
  // 5. INSP101: Pure In-Person Course (IN_PERSON_ONLY)
  // ────────────────────────────────────────────────────────────
  console.log('  🏢 [IN_PERSON_ONLY] Seeding INSP101: Physical Customs Cargo Inspection Practicum...');
  const insp101 = await prisma.course.create({
    data: {
      code: 'INSP101',
      title: 'Physical Customs Inspection & Valuation Field Practicum',
      description:
        'Intensive hands-on border post simulation: cargo container examination, high-security seal verification, tariff classification, and anti-smuggling inspection protocols.',
      objectives:
        'Apply physical cargo examination standards; detect fraudulent seals and manifests; execute formal valuation dispute procedures.',
      level: CourseLevel.INTERMEDIATE,
      category: 'Customs Enforcement',
      department: 'Customs & Border Control',
      targetAudience: 'Border terminal inspectors, customs valuation officers, and verification teams.',
      deliveryMethod: 'classroom',
      deliveryMode: CourseDeliveryMode.IN_PERSON_ONLY,
      hasOnlineSessions: true,
      estimatedHours: 4.0,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      thumbnailUrl: COVER,
      owners: { create: [{ userId: ownerId }] },
      trainers: { create: [{ userId: users.branchTrainers['Dire Dawa Branch Office'][0].id }] },
      approvals: {
        create: [
          {
            approverId,
            status: ApprovalStatus.APPROVED,
            decidedAt: new Date(),
            comments: 'Approved for customs terminal simulation labs.',
          },
        ],
      },
    },
  });
  await addCourseAttachment(insp101.id, 'INSP101');

  // INSP101 Physical Sessions in Executive Lab and Dire Dawa
  await prisma.liveSession.create({
    data: {
      courseId: insp101.id,
      venueId: venues.addisHQExecutiveLab.id,
      trainerId: users.branchTrainers['Addis Ababa Head Office'][0].id,
      titleEn: 'Customs Cargo Seal Verification & Security Simulation',
      titleAm: 'የጉምሩክ ጭነት ማሸጊያ ማረጋገጫ እና የደህንነት ማስመሰያ ልምምድ',
      descriptionEn: 'Physical container inspection and high-security seal verification.',
      descriptionAm: 'የኮንቴይነር ምርመራ እና ከፍተኛ የደህንነት ማህተም ማረጋገጫ።',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      status: SessionStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      durationMinutes: 150,
      allowViewAttendance: true,
    },
  });

  await prisma.liveSession.create({
    data: {
      courseId: insp101.id,
      venueId: venues.direDawaLab.id,
      trainerId: users.branchTrainers['Dire Dawa Branch Office'][0].id,
      titleEn: 'Border Freight Physical Examination Clinic - Dire Dawa',
      titleAm: 'የድንበር ጭነት ምርመራ ክሊኒክ - ድሬዳዋ',
      descriptionEn: 'Regional customs valuation and physical inspection practicum.',
      descriptionAm: 'የክልላዊ ጉምሩክ ዋጋ አወሳሰን እና ተግባራዊ ምርመራ።',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      status: SessionStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      durationMinutes: 120,
      allowViewAttendance: true,
    },
  });

  // ────────────────────────────────────────────────────────────
  // 6. CSERV101: Pure In-Person Course (IN_PERSON_ONLY)
  // ────────────────────────────────────────────────────────────
  console.log('  🏢 [IN_PERSON_ONLY] Seeding CSERV101: Citizen Service Excellence & Front-Office Standards...');
  const cserv101 = await prisma.course.create({
    data: {
      code: 'CSERV101',
      title: 'Citizen Service Excellence & Front-Office Standards',
      description:
        'In-person interactive workshop for frontline tax center personnel: conflict de-escalation, customer empathy, taxpayer charter standards, and queue management.',
      objectives:
        'Apply customer service standards; resolve complex taxpayer disputes calmly; streamline front-office query handoffs.',
      level: CourseLevel.BASIC,
      category: 'Customer Service',
      department: 'Taxpayer Education & Service',
      targetAudience: 'Front-desk officers, tax center receptionists, and taxpayer service personnel.',
      deliveryMethod: 'classroom',
      deliveryMode: CourseDeliveryMode.IN_PERSON_ONLY,
      hasOnlineSessions: true,
      estimatedHours: 3.0,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      thumbnailUrl: COVER,
      owners: { create: [{ userId: ownerId }] },
      trainers: { create: [{ userId: users.branchTrainers['Hawassa Branch Office'][0].id }] },
      approvals: {
        create: [
          {
            approverId,
            status: ApprovalStatus.APPROVED,
            decidedAt: new Date(),
            comments: 'Approved for nationwide front-office excellence workshop delivery.',
          },
        ],
      },
    },
  });
  await addCourseAttachment(cserv101.id, 'CSERV101');

  // CSERV101 Physical Sessions in Addis and Bahir Dar
  await prisma.liveSession.create({
    data: {
      courseId: cserv101.id,
      venueId: venues.addisHQHallA.id,
      trainerId: users.branchTrainers['Addis Ababa Head Office'][1].id,
      titleEn: 'Front-Office Taxpayer Conflict De-escalation Workshop',
      titleAm: 'የፊት ለፊት አገልግሎት የግጭት አፈታት እና የደንበኞች አያያዝ ስልጠና',
      descriptionEn: 'Interactive role-play on queue management and complaint resolution.',
      descriptionAm: 'በቅሬታ አፈታት እና የተገልጋዮች አያያዝ ዙሪያ የተዘጋጀ የተግባር ስልጠና።',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      status: SessionStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      durationMinutes: 180,
      allowViewAttendance: true,
    },
  });

  await prisma.liveSession.create({
    data: {
      courseId: cserv101.id,
      venueId: venues.bahirDarRoom.id,
      trainerId: users.branchTrainers['Bahir Dar Branch Office'][0].id,
      titleEn: 'Customer Service Excellence Field Seminar - Bahir Dar',
      titleAm: 'የደንበኞች አገልግሎት ጥራት አውደ ጥናት - ባሕር ዳር',
      descriptionEn: 'Regional front-desk taxpayer care standards workshop.',
      descriptionAm: 'የክልላዊ ግብር ከፋዮች አገልግሎት አሰጣጥ ደረጃዎች አውደ ጥናት።',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      status: SessionStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      durationMinutes: 120,
      allowViewAttendance: true,
    },
  });

  console.log('  ✓ All 6 courses successfully seeded with clean mode separation:');
  console.log('    • ONLINE_ONLY:    VAT101, TAX101, CYBER301');
  console.log('    • IN_PERSON_ONLY: VAT102, INSP101, CSERV101');
}
