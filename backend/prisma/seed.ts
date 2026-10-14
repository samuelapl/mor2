import { PrismaClient } from '@prisma/client';
import { seedPermissions } from './seed-permissions';
import { seedTemplates } from './seed-templates';
import { seedCategories } from './seed-categories';
import { seedLaws } from './seed-laws';
import { seedVenues } from './seed-venues';
import { seedUsers } from './seed-users';
import { seedCourses } from './seed-courses';

const prisma = new PrismaClient();

async function cleanDatabase(prisma: PrismaClient) {
  console.log('🗑️  Wiping existing database records for a clean reseed...');
  await prisma.certificate.deleteMany({});
  await prisma.certificateTemplate.deleteMany({});
  await prisma.assessmentAttempt.deleteMany({});
  await prisma.lessonCompletion.deleteMany({});
  await prisma.moduleCompletion.deleteMany({});
  await prisma.attendanceLog.deleteMany({});
  await prisma.attendance.deleteMany({});
  await (prisma as any).sessionPreparedQuestion?.deleteMany?.({});
  await (prisma as any).sessionPreparedQuiz?.deleteMany?.({});
  await prisma.liveSession.deleteMany({});
  await prisma.courseSessionPlan.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.contentApproval.deleteMany({});
  await prisma.courseOwner.deleteMany({});
  await prisma.trainerAssignment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.assessment.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.curriculumModule.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.questionBankQuestion.deleteMany({});
  await prisma.venue.deleteMany({});
  console.log('  ✓ Data wiped cleanly.');
}

async function main() {
  console.log('──────────────────────────────────────────────────────────');
  console.log('🌱 Starting Clean Modular MoR ELTMS Database Seed...');
  console.log('──────────────────────────────────────────────────────────');

  // 1. Wipe old relational training & progress records
  await cleanDatabase(prisma);

  // 2. Base Metadata: Roles, Permissions, Categories, Templates
  console.log('\n🔑 Step 1: Seeding System Permissions & Roles...');
  await seedPermissions(prisma);

  console.log('\n📜 Step 2: Seeding Certificate Templates...');
  await seedTemplates(prisma);

  console.log('\n🏷️  Step 3: Seeding Course Categories...');
  await seedCategories(prisma);

  // 3. Ministry Branch Physical Venues
  console.log('\n🏢 Step 4: Seeding Ministry Regional Branch Venues...');
  const venues = await seedVenues(prisma);

  // 4. Categorized Users & Specialized Trainers (@gmail.com, Password123!)
  console.log('\n👥 Step 5: Seeding Categorized Users & Specialized Trainers...');
  const users = await seedUsers(prisma, venues);

  // 5. Tax & Customs Legal Documents
  console.log('\n⚖️  Step 6: Seeding Legal Tax & Customs Categories and Proclamations...');
  await seedLaws();

  // 6. Comprehensive Courses (Clean ONLINE_ONLY and IN_PERSON_ONLY including VAT101 & VAT102)
  console.log('\n📚 Step 7: Seeding Courses, Curriculum & Scheduled Sessions...');
  await seedCourses(prisma, users, venues);

  console.log('\n──────────────────────────────────────────────────────────');
  console.log('🎉 Clean Database Seed Completed Successfully!');
  console.log('──────────────────────────────────────────────────────────');
  console.log('🔑 ALL accounts use Password: Password123!');
  console.log('──────────────────────────────────────────────────────────');
  console.log('• System Admin:        sadministrator@gmail.com');
  console.log('• Training Admin:      tadministrator@gmail.com');
  console.log('• Course Owner:        owner@gmail.com');
  console.log('• Content Approver:    approver@gmail.com');
  console.log('• Online Trainer:      trainer@gmail.com');
  console.log('• Adama In-Person:     derartu.tulu.adama@gmail.com, chala.debele.adama@gmail.com');
  console.log('• Addis In-Person:     abebe.bikila.addis@gmail.com, senait.mulugeta.addis@gmail.com');
  console.log('• Hawassa In-Person:   tamirat.tola.hawassa@gmail.com, genet.yalew.hawassa@gmail.com');
  console.log('• Bahir Dar In-Person: kassahun.dagne.bahirdar@gmail.com, tigist.assefa.bahirdar@gmail.com');
  console.log('• Dire Dawa In-Person: ahmed.ibrahim.diredawa@gmail.com, fatima.zahr.diredawa@gmail.com');
  console.log('• Learner:             learner@gmail.com, samueltiruneh123@gmail.com');
  console.log('──────────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
