import { ApprovalStatus, PrismaClient, RoleName, TrainerDeliveryType, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SeededVenues } from './seed-venues';

export interface SeededUsers {
  systemAdmin: User;
  systemAdmin2: User;
  trainingAdmin: User;
  trainingAdmin2: User;
  courseOwner: User;
  courseOwner2: User;
  samuelUser: User;
  approver: User;
  approver2: User;
  trainer: User;
  onlineTrainers: User[];
  branchTrainers: Record<string, User[]>;
  learners: User[];
  userMap: Record<string, string>;
}

export async function seedUsers(prisma: PrismaClient, venues: SeededVenues): Promise<SeededUsers> {
  console.log('👥 Seeding Categorized LMS Users & Specialized Trainers...');

  const BCRYPT_ROUNDS = 12;
  const uniformPasswordHash = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);

  // Helper to upsert a user with uniform password, verified email, and roles
  async function upsertUser(
    email: string,
    firstName: string,
    lastName: string,
    roles: (RoleName | string)[],
    extra?: {
      phone?: string;
      primaryVenueId?: string | null;
      trainerType?: TrainerDeliveryType;
    },
  ): Promise<User> {
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: uniformPasswordHash,
          firstName,
          lastName,
          isActive: true,
          registrationStatus: ApprovalStatus.APPROVED,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          primaryVenueId:
            extra?.primaryVenueId !== undefined ? extra.primaryVenueId : user.primaryVenueId,
          trainerType: extra?.trainerType !== undefined ? extra.trainerType : user.trainerType,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          password: uniformPasswordHash,
          firstName,
          lastName,
          phone: extra?.phone ?? `+251911${Math.floor(100000 + Math.random() * 900000)}`,
          locale: 'en',
          isActive: true,
          registrationStatus: ApprovalStatus.APPROVED,
          emailVerifiedAt: new Date(),
          emailNotifications: true,
          primaryVenueId: extra?.primaryVenueId ?? null,
          trainerType: extra?.trainerType ?? TrainerDeliveryType.ONLINE,
        },
      });
    }

    for (const role of roles) {
      await prisma.userRole.upsert({
        where: {
          userId_role: {
            userId: user.id,
            role: String(role),
          },
        },
        update: {},
        create: {
          userId: user.id,
          role: String(role),
        },
      });
    }

    return user;
  }

  // 1. System Administrators
  const systemAdmin = await upsertUser('sadministrator@gmail.com', 'Sami', 'Admin', [
    RoleName.SYSTEM_ADMIN,
  ]);
  const systemAdmin2 = await upsertUser('admin.haile@gmail.com', 'Haile', 'Gebreselassie', [
    RoleName.SYSTEM_ADMIN,
  ]);
  console.log(`  ✓ System Admins: ${systemAdmin.email}, ${systemAdmin2.email}`);

  // 2. Training Administrators
  const trainingAdmin = await upsertUser('tadministrator@gmail.com', 'Aisha', 'Mohammed', [
    RoleName.TRAINING_ADMIN,
  ]);
  const trainingAdmin2 = await upsertUser('dawit.worku.admin@gmail.com', 'Dawit', 'Worku', [
    RoleName.TRAINING_ADMIN,
  ]);
  console.log(`  ✓ Training Admins: ${trainingAdmin.email}, ${trainingAdmin2.email}`);

  // 3. Course Owners
  const courseOwner = await upsertUser('owner@gmail.com', 'Bereket', 'Tadesse', [
    RoleName.COURSE_OWNER,
  ]);
  const courseOwner2 = await upsertUser('almaz.tefera.owner@gmail.com', 'Almaz', 'Tefera', [
    RoleName.COURSE_OWNER,
  ]);
  console.log(`  ✓ Course Owners: ${courseOwner.email}, ${courseOwner2.email}`);

  // 4. Content Approvers
  const approver = await upsertUser('approver@gmail.com', 'Selam', 'Hailu', [
    RoleName.CONTENT_APPROVER,
  ]);
  const approver2 = await upsertUser('yonas.kebede.approver@gmail.com', 'Yonas', 'Kebede', [
    RoleName.CONTENT_APPROVER,
  ]);
  console.log(`  ✓ Content Approvers: ${approver.email}, ${approver2.email}`);

  // 5. Dedicated Online Trainers
  const onlineTrainer1 = await upsertUser(
    'trainer@gmail.com',
    'Kebede',
    'Alem',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.ONLINE,
      primaryVenueId: null,
    },
  );
  const onlineTrainer2 = await upsertUser(
    'solomon.tekalign.trainer@gmail.com',
    'Solomon',
    'Tekalign',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.ONLINE,
      primaryVenueId: null,
    },
  );
  const onlineTrainer3 = await upsertUser(
    'helen.berhane.trainer@gmail.com',
    'Helen',
    'Berhane',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.ONLINE,
      primaryVenueId: null,
    },
  );
  console.log(
    `  ✓ Pure Online Trainers: ${onlineTrainer1.email}, ${onlineTrainer2.email}, ${onlineTrainer3.email}`,
  );

  // 6. Dedicated In-Person Branch Trainers (Exactly 2 trainers per branch venue)
  const branchTrainers: Record<string, User[]> = {};

  // 6a. Addis Ababa Head Office
  const addisT1 = await upsertUser(
    'abebe.bikila.addis@gmail.com',
    'Abebe',
    'Bikila',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.addisHQHallA.id,
    },
  );
  const addisT2 = await upsertUser(
    'senait.mulugeta.addis@gmail.com',
    'Senait',
    'Mulugeta',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.addisHQExecutiveLab.id,
    },
  );
  branchTrainers['Addis Ababa Head Office'] = [addisT1, addisT2];
  console.log(`  ✓ Addis Ababa In-Person Trainers: ${addisT1.email}, ${addisT2.email}`);

  // 6b. Adama Branch Office
  const adamaT1 = await upsertUser(
    'derartu.tulu.adama@gmail.com',
    'Derartu',
    'Tulu',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.adamaCenter.id,
    },
  );
  const adamaT2 = await upsertUser(
    'chala.debele.adama@gmail.com',
    'Chala',
    'Debele',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.adamaCenter.id,
    },
  );
  branchTrainers['Adama Branch Office'] = [adamaT1, adamaT2];
  console.log(`  ✓ Adama In-Person Trainers: ${adamaT1.email}, ${adamaT2.email}`);

  // 6c. Hawassa Branch Office
  const hawassaT1 = await upsertUser(
    'tamirat.tola.hawassa@gmail.com',
    'Tamirat',
    'Tola',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.hawassaHub.id,
    },
  );
  const hawassaT2 = await upsertUser(
    'genet.yalew.hawassa@gmail.com',
    'Genet',
    'Yalew',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.hawassaHub.id,
    },
  );
  branchTrainers['Hawassa Branch Office'] = [hawassaT1, hawassaT2];
  console.log(`  ✓ Hawassa In-Person Trainers: ${hawassaT1.email}, ${hawassaT2.email}`);

  // 6d. Bahir Dar Branch Office
  const bahirDarT1 = await upsertUser(
    'kassahun.dagne.bahirdar@gmail.com',
    'Kassahun',
    'Dagne',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.bahirDarRoom.id,
    },
  );
  const bahirDarT2 = await upsertUser(
    'tigist.assefa.bahirdar@gmail.com',
    'Tigist',
    'Assefa',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.bahirDarRoom.id,
    },
  );
  branchTrainers['Bahir Dar Branch Office'] = [bahirDarT1, bahirDarT2];
  console.log(`  ✓ Bahir Dar In-Person Trainers: ${bahirDarT1.email}, ${bahirDarT2.email}`);

  // 6e. Dire Dawa Branch Office
  const direDawaT1 = await upsertUser(
    'ahmed.ibrahim.diredawa@gmail.com',
    'Ahmed',
    'Ibrahim',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.direDawaLab.id,
    },
  );
  const direDawaT2 = await upsertUser(
    'fatima.zahr.diredawa@gmail.com',
    'Fatima',
    'Zahra',
    [RoleName.TRAINER],
    {
      trainerType: TrainerDeliveryType.IN_PERSON,
      primaryVenueId: venues.direDawaLab.id,
    },
  );
  branchTrainers['Dire Dawa Branch Office'] = [direDawaT1, direDawaT2];
  console.log(`  ✓ Dire Dawa In-Person Trainers: ${direDawaT1.email}, ${direDawaT2.email}`);

  // 7. Learners
  const primaryLearner = await upsertUser('learner@gmail.com', 'Meron', 'Kassa', [
    RoleName.LEARNER,
  ]);
  const samuel1 = await upsertUser('samueltiruneh12@gmail.com', 'Samuel', 'Tiruneh', [
    RoleName.LEARNER,
    RoleName.COURSE_OWNER,
  ]);
  const samuel2 = await upsertUser('samueltiruneh123@gmail.com', 'Samuel', 'Tiruneh', [
    RoleName.LEARNER,
    RoleName.COURSE_OWNER,
    RoleName.TRAINER,
  ]);
  const l3 = await upsertUser('tariku.bekele.learner@gmail.com', 'Tariku', 'Bekele', [
    RoleName.LEARNER,
  ]);
  const l4 = await upsertUser('meseret.defar.learner@gmail.com', 'Meseret', 'Defar', [
    RoleName.LEARNER,
  ]);
  const l5 = await upsertUser('fikru.tefera.learner@gmail.com', 'Fikru', 'Tefera', [
    RoleName.LEARNER,
  ]);
  const l6 = await upsertUser('eden.habtam.learner@gmail.com', 'Eden', 'Habtamu', [
    RoleName.LEARNER,
  ]);

  const allLearners = [primaryLearner, samuel1, samuel2, l3, l4, l5, l6];
  console.log(`  ✓ Seeded ${allLearners.length} Real Learners (All @gmail.com)`);

  const userMap: Record<string, string> = {
    [systemAdmin.email]: systemAdmin.id,
    [systemAdmin2.email]: systemAdmin2.id,
    [trainingAdmin.email]: trainingAdmin.id,
    [trainingAdmin2.email]: trainingAdmin2.id,
    [courseOwner.email]: courseOwner.id,
    [courseOwner2.email]: courseOwner2.id,
    [approver.email]: approver.id,
    [approver2.email]: approver2.id,
    [onlineTrainer1.email]: onlineTrainer1.id,
    [onlineTrainer2.email]: onlineTrainer2.id,
    [onlineTrainer3.email]: onlineTrainer3.id,
    [primaryLearner.email]: primaryLearner.id,
    [samuel1.email]: samuel1.id,
    [samuel2.email]: samuel2.id,
  };

  return {
    systemAdmin,
    systemAdmin2,
    trainingAdmin,
    trainingAdmin2,
    courseOwner,
    courseOwner2,
    samuelUser: samuel1,
    approver,
    approver2,
    trainer: onlineTrainer1,
    onlineTrainers: [onlineTrainer1, onlineTrainer2, onlineTrainer3],
    branchTrainers,
    learners: allLearners,
    userMap,
  };
}
