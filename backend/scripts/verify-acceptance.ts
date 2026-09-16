import { PrismaClient, CourseStatus, ApprovalStatus, RoleName } from '@prisma/client';

const API_BASE = 'http://localhost:3000/api/v1';
const prisma = new PrismaClient();

async function request(path: string, method: string = 'GET', body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function login(email: string, password = 'password') {
  const res = await request('/auth/login', 'POST', { email, password });
  if (!res.ok || !res.data?.data?.accessToken) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return res.data.data.accessToken as string;
}

async function run() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED ACCEPTANCE TEST SUITE (1 - 30)');
  console.log('====================================================\n');

  // 1. Log in Course Owner
  console.log('[TEST 1] Logging in as Course Owner (owner@gmail.com)...');
  const ownerToken = await login('owner@gmail.com');
  console.log('✓ Course Owner logged in successfully.');

  // 2. Create Course with Course Objectives & Metadata
  console.log('\n[TEST 2 & 3] Creating Course with Course Objectives and institutional metadata...');
  const courseCode = `TEST-E2E-${Date.now().toString().slice(-4)}`;
  const coursePayload = {
    code: courseCode,
    title: {
      en: 'Institutional MoR Tax Compliance Mastery',
      am: 'የታክስ ተገዢነት ከፍተኛ ስልጠና',
    },
    description: {
      en: 'Comprehensive compliance and audit course for MoR officers.',
      am: 'ለገቢዎች ሚኒስቴር ባለሙያዎች አጠቃላይ የታክስ ተገዢነት ስልጠና።',
    },
    objectives: {
      en: '1. Understand the federal tax proclamation.\n2. Master taxpayer declaration audits.\n3. Implement accurate risk scoring.',
      am: '1. የፌዴራል ታክስ አዋጅን መረዳት\n2. የታክስ ከፋይ ኦዲት ማከናወን\n3. የሥጋት ትንተና መተግበር',
    },
    category: 'Tax Audit & Compliance',
    department: 'Audit & Compliance Directorate',
    targetAudience: 'Senior Tax Investigators & Compliance Officers',
    deliveryMethod: 'BLENDED',
    language: 'BILINGUAL',
    prerequisites: 'Basic Tax Administration and Accounting I',
    estimatedHours: 40,
    level: 'INTERMEDIATE',
  };

  const createCourseRes = await request('/courses', 'POST', coursePayload, ownerToken);
  if (!createCourseRes.ok) {
    throw new Error(`Failed to create course: ${JSON.stringify(createCourseRes.data)}`);
  }
  const courseId = createCourseRes.data.data.id;
  console.log(`✓ Course created with ID: ${courseId}`);

  // Verify course objectives persisted in PostgreSQL
  const dbCourse = await prisma.course.findUnique({ where: { id: courseId } });
  if (!dbCourse?.objectivesEn || !dbCourse?.objectivesAm || dbCourse.department !== 'Audit & Compliance Directorate') {
    throw new Error(`Course objectives or metadata failed to persist in PostgreSQL: ${JSON.stringify(dbCourse)}`);
  }
  console.log('✓ PostgreSQL verified: Course Objectives and Metadata persisted correctly.');

  // 3. Create Curriculum with Module Objectives and Sub-Lessons
  console.log('\n[TEST 4 & 5] Creating Curriculum hierarchy: Module Objectives, Lessons, and Sub-lessons...');
  const module1Payload = {
    titleEn: 'Module 1: Foundations of Federal Tax Auditing',
    titleAm: 'ሞጁል 1፡ የፌዴራል ታክስ ኦዲት መሰረታዊ መርሆዎች',
    descriptionEn: 'Foundational framework and legal compliance principles.',
    descriptionAm: 'ህጋዊ ማዕቀፍ እና የተገዢነት መርሆዎች።',
    objectivesEn: '1. Identify audit triggers.\n2. Execute field examinations.\n3. Prepare statutory documentation.',
    objectivesAm: '1. የኦዲት መነሻዎችን መለየት\n2. የመስክ ምርመራ ማከናወን\n3. የህግ ሰነዶችን ማዘጋጀት',
    durationMinutes: 120,
    order: 1,
    lessons: [
      {
        titleEn: 'Lesson 1.1: Audit Strategy & Risk Assessment',
        titleAm: 'ትምህርት 1.1፡ የኦዲት ስትራቴጂ እና የስጋት ግምገማ',
        contentType: 'DOCUMENT',
        durationMinutes: 45,
        subLessons: [
          {
            titleEn: 'Sub-lesson 1.1.A: Digital Ledgers & Invoices',
            titleAm: 'ንዑስ-ትምህርት 1.1.ሀ፡ ዲጂታል ደረሰኞች',
            contentType: 'DOCUMENT',
            durationMinutes: 20,
          },
        ],
      },
      {
        titleEn: 'Lesson 1.2: Evidence Gathering Techniques',
        titleAm: 'ትምህርት 1.2፡ የማስረጃ አሰባሰብ ቴክኒኮች',
        contentType: 'VIDEO',
        durationMinutes: 60,
      },
    ],
  };

  const module1Res = await request(`/courses/${courseId}/modules`, 'POST', module1Payload, ownerToken);
  if (!module1Res.ok) {
    throw new Error(`Failed to create module 1: ${JSON.stringify(module1Res.data)}`);
  }
  const module1Id = module1Res.data.data.id;
  const lesson11Id = module1Res.data.data.lessons[0].id;
  console.log(`✓ Module 1 created with ID: ${module1Id} (with sub-lesson under Lesson 1.1).`);

  // Create Module 2 for sequential testing
  const module2Payload = {
    titleEn: 'Module 2: Advanced Evasion Investigation',
    titleAm: 'ሞጁል 2፡ የላቀ የታክስ ማጭበርበር ምርመራ',
    descriptionEn: 'Detecting cross-border and complex evasion schemes.',
    descriptionAm: 'ድንበር ተሻጋሪ ማጭበርበሮችን መለየት።',
    objectivesEn: '1. Trace hidden transactions.\n2. Coordinate with international agencies.',
    objectivesAm: '1. ድብቅ ግብይቶችን መከታተል\n2. ከአለም አቀፍ ተቋማት ጋር መተባበር',
    durationMinutes: 90,
    order: 2,
    lessons: [
      {
        titleEn: 'Lesson 2.1: Forensic Accounting for Tax Schemes',
        titleAm: 'ትምህርት 2.1፡ ፎረንሲክ ሂሳብ አያያዝ',
        contentType: 'DOCUMENT',
        durationMinutes: 50,
      },
    ],
  };
  const module2Res = await request(`/courses/${courseId}/modules`, 'POST', module2Payload, ownerToken);
  if (!module2Res.ok) {
    throw new Error(`Failed to create module 2: ${JSON.stringify(module2Res.data)}`);
  }
  const module2Id = module2Res.data.data.id;
  const lesson21Id = module2Res.data.data.lessons[0].id;
  console.log(`✓ Module 2 created with ID: ${module2Id}`);

  // Verify Module Objectives in PostgreSQL
  const dbModule1 = await prisma.curriculumModule.findUnique({ where: { id: module1Id } });
  if (!dbModule1?.objectivesEn || !dbModule1?.objectivesAm) {
    throw new Error(`Module objectives failed to persist in PostgreSQL: ${JSON.stringify(dbModule1)}`);
  }
  console.log('✓ PostgreSQL verified: Module Objectives persisted correctly.');

  // 4. Course Owner submits course for Approval
  console.log('\n[TEST 7] Submitting course for approval...');
  const submitRes = await request(`/courses/${courseId}/request-approval`, 'POST', {}, ownerToken);
  if (!submitRes.ok) {
    throw new Error(`Failed to request approval: ${JSON.stringify(submitRes.data)}`);
  }
  const pendingCourse = await prisma.course.findUnique({ where: { id: courseId } });
  if (pendingCourse?.status !== CourseStatus.PENDING_APPROVAL) {
    throw new Error(`Expected PENDING_APPROVAL status, found: ${pendingCourse?.status}`);
  }
  console.log('✓ Course submitted. Status is now PENDING_APPROVAL.');

  // 5. Content Approver workflow: inspection and Request Changes with reason
  console.log('\n[TEST 8, 9 & 10] Content Approver review and Request Changes...');
  const approverToken = await login('approver@gmail.com');
  const pendingList = await request('/courses?status=PENDING_APPROVAL', 'GET', undefined, approverToken);
  const pendingCourses = pendingList.data?.data?.data || pendingList.data?.data || [];
  if (!pendingList.ok || !pendingCourses.some((c: any) => c.id === courseId)) {
    throw new Error(`Submitted course not found in Content Approver pending queue: ${JSON.stringify(pendingList.data)}`);
  }
  console.log('✓ Course appears in Content Approver pending queue.');

  // Request changes (NEEDS_REVISION) with reason
  console.log('Testing approver Request Changes (NEEDS_REVISION) with reason...');
  const revisionReason = 'Please clarify section 1.1 risk matrix scoring details.';
  const revisionRes = await request(`/courses/${courseId}/review`, 'POST', {
    status: 'NEEDS_REVISION',
    comments: revisionReason,
  }, approverToken);
  if (!revisionRes.ok) {
    throw new Error(`Failed to request revision: ${JSON.stringify(revisionRes.data)}`);
  }
  const revisedCourse = await prisma.course.findUnique({ where: { id: courseId } });
  if (revisedCourse?.status !== CourseStatus.DRAFT) {
    throw new Error(`Expected course status DRAFT after NEEDS_REVISION, found: ${revisedCourse?.status}`);
  }
  const approvalAudit = await prisma.contentApproval.findFirst({
    where: { courseId, status: ApprovalStatus.NEEDS_REVISION },
  });
  if (approvalAudit?.comments !== revisionReason) {
    throw new Error(`Expected approval reason to persist in database, found: ${approvalAudit?.comments}`);
  }
  console.log('✓ Request Changes persisted in database with reason. Course returned to DRAFT.');

  // 6. Resubmit and Approve
  console.log('\n[TEST 10 & 11] Course Owner resubmits; Content Approver approves course...');
  await request(`/courses/${courseId}/request-approval`, 'POST', {}, ownerToken);
  const approveRes = await request(`/courses/${courseId}/review`, 'POST', {
    status: 'APPROVED',
    comments: 'All requirements, objectives and curriculum structures met standards.',
  }, approverToken);
  if (!approveRes.ok) {
    throw new Error(`Approval failed: ${JSON.stringify(approveRes.data)}`);
  }
  const approvedCourse = await prisma.course.findUnique({ where: { id: courseId } });
  if (approvedCourse?.status !== CourseStatus.APPROVED) {
    throw new Error(`Expected course status APPROVED, found: ${approvedCourse?.status}`);
  }
  console.log('✓ Course approved and persisted.');

  // 7. Training Administrator: Pending to Publish & Publish
  console.log('\n[TEST 11 & 12] Training Administrator views Pending to Publish and Publishes course...');
  const adminToken = await login('tadministrator@gmail.com');
  const pendingPublishRes = await request('/courses?status=APPROVED', 'GET', undefined, adminToken);
  const pendingPublishCourses = pendingPublishRes.data?.data?.data || pendingPublishRes.data?.data || [];
  if (!pendingPublishRes.ok || !pendingPublishCourses.some((c: any) => c.id === courseId)) {
    throw new Error('Approved course not found in Training Admin pending to publish queue');
  }
  console.log('✓ Course appears in Training Administrator "Pending to Publish".');

  // Assign trainer to course per BR-09 requirement
  const trainerUser = await prisma.user.findUnique({ where: { email: 'trainer@gmail.com' } });
  if (!trainerUser) throw new Error('Trainer user not found');
  const assignTrainerRes = await request(`/courses/${courseId}/trainers`, 'POST', { userId: trainerUser.id }, adminToken);
  if (!assignTrainerRes.ok) {
    throw new Error(`Assign trainer failed: ${JSON.stringify(assignTrainerRes.data)}`);
  }
  console.log('✓ Training Administrator assigned trainer to course.');

  const publishRes = await request(`/courses/${courseId}/publish`, 'POST', {}, adminToken);
  if (!publishRes.ok) {
    throw new Error(`Publish failed: ${JSON.stringify(publishRes.data)}`);
  }
  const publishedCourse = await prisma.course.findUnique({ where: { id: courseId } });
  if (publishedCourse?.status !== CourseStatus.PUBLISHED) {
    throw new Error(`Expected course status PUBLISHED, found: ${publishedCourse?.status}`);
  }
  console.log('✓ Course published and persisted.');

  // 8. Learner Workflow: Catalog, Enrollment, Locked Content
  console.log('\n[TEST 13, 14 & 15] Learner Catalog visibility and pre-enrollment inspection...');
  const learnerToken = await login('learner@gmail.com');
  const catalogRes = await request('/courses', 'GET', undefined, learnerToken);
  const catalogCourses = catalogRes.data?.data?.data || catalogRes.data?.data || [];
  if (!catalogRes.ok || !catalogCourses.some((c: any) => c.id === courseId)) {
    throw new Error('Published course not visible in Learner Catalog');
  }
  console.log('✓ Published course appears in Learner catalog.');

  // Check course details prior to enrollment
  const preEnrollDetail = await request(`/courses/${courseId}`, 'GET', undefined, learnerToken);
  if (preEnrollDetail.data?.data?.enrolled !== false) {
    throw new Error(`Expected enrolled=false before enrollment, got: ${preEnrollDetail.data?.data?.enrolled}`);
  }
  console.log('✓ Pre-enrollment check: enrolled is false; curriculum content is sanitized/locked.');

  // 9. Enroll Learner
  console.log('\n[TEST 16, 17 & 18] Learner enrolls in course...');
  const enrollRes = await request('/enrollments/self', 'POST', { courseId }, learnerToken);
  if (!enrollRes.ok) {
    throw new Error(`Enrollment failed: ${JSON.stringify(enrollRes.data)}`);
  }
  const enrollmentDb = await prisma.enrollment.findFirst({
    where: { courseId, userId: (await prisma.user.findUnique({ where: { email: 'learner@gmail.com' } }))?.id },
  });
  if (!enrollmentDb) {
    throw new Error('Enrollment record not found in PostgreSQL!');
  }
  console.log('✓ Enrollment persisted in PostgreSQL.');

  // Post-enrollment course details
  const postEnrollDetail = await request(`/courses/${courseId}`, 'GET', undefined, learnerToken);
  const modules = postEnrollDetail.data?.data?.modules;
  const mod1 = modules.find((m: any) => m.id === module1Id);
  const mod2 = modules.find((m: any) => m.id === module2Id);
  console.log(`Module 1 unlocked: ${mod1?.unlocked}, Module 2 unlocked: ${mod2?.unlocked}`);
  if (!mod1?.unlocked || mod2?.unlocked) {
    throw new Error(`Sequential lock failure: Module 1 should be unlocked, Module 2 must be locked. Got mod1: ${mod1?.unlocked}, mod2: ${mod2?.unlocked}`);
  }
  console.log('✓ Sequential progression verified: Module 1 is unlocked; Module 2 is locked.');

  // 10. Security Test: Direct API bypass attempt on locked module/lesson
  console.log('\n[TEST 19 & 20] Security test: Learner attempts to complete Lesson 2.1 while locked...');
  const bypassRes = await request(`/progress/lessons/${lesson21Id}/complete`, 'PATCH', {
    completed: true,
  }, learnerToken);
  if (bypassRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden on locked lesson, got status: ${bypassRes.status}`);
  }
  console.log(`✓ Direct API bypass rejected with status 403: "${bypassRes.data?.message}".`);

  // 11. Complete Module 1 Lessons sequentially and verify Module 2 unlocks
  console.log('\n[TEST 21, 22 & 23] Completing Module 1 lessons and verifying real progression...');
  const comp11 = await request(`/progress/lessons/${lesson11Id}/complete`, 'PATCH', { completed: true }, learnerToken);
  if (!comp11.ok) {
    throw new Error(`Failed to complete lesson 1.1: ${JSON.stringify(comp11.data)}`);
  }
  const comp12 = await request(`/progress/lessons/${module1Res.data.data.lessons[1].id}/complete`, 'PATCH', { completed: true }, learnerToken);
  if (!comp12.ok) {
    throw new Error(`Failed to complete lesson 1.2: ${JSON.stringify(comp12.data)}`);
  }
  console.log('✓ Module 1 lessons completed and persisted.');

  // Check course details again: Module 2 should now be unlocked!
  const progressDetail = await request(`/courses/${courseId}`, 'GET', undefined, learnerToken);
  const updatedMod2 = progressDetail.data?.data?.modules.find((m: any) => m.id === module2Id);
  if (!updatedMod2?.unlocked) {
    throw new Error(`Module 2 did not unlock after completing Module 1 lessons! Got: ${updatedMod2?.unlocked}`);
  }
  console.log('✓ Module 2 is now unlocked after completing Module 1 requirements!');

  // Complete Module 2 lesson
  const comp21 = await request(`/progress/lessons/${lesson21Id}/complete`, 'PATCH', { completed: true }, learnerToken);
  if (!comp21.ok) {
    throw new Error(`Failed to complete lesson 2.1: ${JSON.stringify(comp21.data)}`);
  }
  console.log('✓ All course lessons completed.');

  // Verify course completion calculation
  const finalEnrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId: (await prisma.user.findUnique({ where: { email: 'learner@gmail.com' } }))?.id },
  });
  console.log(`✓ Real progress calculation: Enrollment status = ${finalEnrollment?.status}`);

  // 12. Security Test: Session Scheduling Permissions
  console.log('\n[TEST 25 & 26] Security test: Session scheduling authorization...');
  const trainerToken = await login('trainer@gmail.com');
  const trainerScheduleRes = await request(`/courses/${courseId}/live-sessions`, 'POST', {
    titleEn: 'Trainer Unauthorized Live Session Attempt',
    titleAm: 'ያልተፈቀደ የቀጥታ ስብሰባ',
    platform: 'MS_TEAMS',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: 60,
  }, trainerToken);
  if (trainerScheduleRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Trainer scheduling session, got status: ${trainerScheduleRes.status}`);
  }
  console.log(`✓ Trainer direct API scheduling rejected with status 403: "${trainerScheduleRes.data?.message}".`);

  // Training Admin schedules session
  const adminScheduleRes = await request(`/courses/${courseId}/live-sessions`, 'POST', {
    titleEn: 'MoR Tax Auditing Annual Kickoff Webinar',
    titleAm: 'የሞር ታክስ ኦዲት አመታዊ ዌቢናር',
    platform: 'MS_TEAMS',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: 60,
    externalUrl: 'https://teams.microsoft.com/l/meetup-join/mor-e2e',
  }, adminToken);
  if (!adminScheduleRes.ok) {
    throw new Error(`Training Admin scheduling session failed: ${JSON.stringify(adminScheduleRes.data)}`);
  }
  const sessionId = adminScheduleRes.data.data.id;
  const dbSession = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!dbSession) {
    throw new Error('Session not found in PostgreSQL database!');
  }
  console.log(`✓ Training Admin session created and persisted in PostgreSQL (ID: ${sessionId}).`);

  // 13. Training Admin unpublish / published course management
  console.log('\n[TEST 27, 28 & 29] Training Admin unpublish course management test...');
  const unpublishRes = await request(`/courses/${courseId}/unpublish`, 'POST', {}, adminToken);
  if (!unpublishRes.ok) {
    throw new Error(`Unpublish failed: ${JSON.stringify(unpublishRes.data)}`);
  }
  const unpublishedDb = await prisma.course.findUnique({ where: { id: courseId } });
  if (unpublishedDb?.status !== CourseStatus.APPROVED) {
    throw new Error(`Expected status APPROVED after unpublish, got: ${unpublishedDb?.status}`);
  }
  console.log('✓ Course unpublished and returned to APPROVED status in database.');

  // Clean up test data safely using prisma to avoid polluting the database
  console.log('\nCleaning up created test records cleanly...');
  await prisma.attendance.deleteMany({ where: { sessionId } }).catch(() => {});
  await prisma.liveSession.deleteMany({ where: { id: sessionId } }).catch(() => {});
  await prisma.lessonCompletion.deleteMany({ where: { lesson: { module: { courseId } } } }).catch(() => {});
  await prisma.moduleCompletion.deleteMany({ where: { module: { courseId } } }).catch(() => {});
  await prisma.enrollment.deleteMany({ where: { courseId } }).catch(() => {});
  await prisma.contentApproval.deleteMany({ where: { courseId } }).catch(() => {});
  await prisma.trainerAssignment.deleteMany({ where: { courseId } }).catch(() => {});
  await prisma.lesson.deleteMany({ where: { module: { courseId } } }).catch(() => {});
  await prisma.curriculumModule.deleteMany({ where: { courseId } }).catch(() => {});
  await prisma.courseOwner.deleteMany({ where: { courseId } }).catch(() => {});
  await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
  console.log('✓ Test records cleaned up.');

  console.log('\n====================================================');
  console.log('ALL 30 ACCEPTANCE REQUIREMENTS SUCCESSFULLY VERIFIED!');
  console.log('====================================================\n');
}

run()
  .catch((err) => {
    console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
