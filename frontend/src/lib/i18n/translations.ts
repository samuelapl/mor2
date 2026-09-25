import type { Role, Lang } from '@/types';

export interface TranslationEntry {
  en: string;
  am: string;
}

export const ROLE_TRANSLATIONS: Record<Role, TranslationEntry> = {
  course_owner: { en: 'Course Owner', am: 'የኮርስ ባለቤት' },
  content_approver: { en: 'Content Approver', am: 'የይዘት አጽዳቂ' },
  training_admin: { en: 'Training Administrator', am: 'የስልጠና አስተዳዳሪ' },
  trainer: { en: 'Trainer', am: 'አሰልጣኝ' },
  learner: { en: 'Learner', am: 'ሰልጣኝ' },
  system_admin: { en: 'System Administrator', am: 'የስርዓት አስተዳዳሪ' },
};

export const ROLE_DESCRIPTIONS: Record<Role, TranslationEntry> = {
  course_owner: {
    en: 'Owns and manages course catalog and curriculum.',
    am: 'የስልጠና ካታሎግ እና ስርዓተ-ትምህርትን ይቆጣጠራል እንዲሁም ያስተዳድራል።',
  },
  content_approver: {
    en: 'Reviews and approves course content.',
    am: 'የስልጠና ይዘቶችን ይገመግማል እንዲሁም ያጸድቃል።',
  },
  training_admin: {
    en: 'Administers training programs, schedules, and enrollments.',
    am: 'የስልጠና ፕሮግራሞችን፣ የጊዜ ሰሌዳዎችን እና ምዝገባዎችን ያስተዳድራል።',
  },
  trainer: {
    en: 'Delivers training sessions and tracks learner progress.',
    am: 'የስልጠና ክፍለ-ጊዜዎችን ይመራል እና የተማሪዎችን እድገት ይከታተላል።',
  },
  learner: {
    en: 'Enrolls in and completes courses.',
    am: 'በስልጠናዎች ይመዘገባል እንዲሁም ኮርሶችን ያጠናቅቃል።',
  },
  system_admin: {
    en: 'Manages system configuration, users, and permissions.',
    am: 'የስርዓት ውቅረትን፣ ተጠቃሚዎችን እና ፈቃዶችን ያስተዳድራል።',
  },
};

export const NAV_TRANSLATIONS: Record<string, TranslationEntry> = {
  Dashboard: { en: 'Dashboard', am: 'ዳሽቦርድ' },
  Courses: { en: 'Courses', am: 'ኮርሶች' },
  'Question Bank': { en: 'Question Bank', am: 'የጥያቄዎች ባንክ' },
  'Pending Approvals': { en: 'Pending Approvals', am: 'ማጽደቅ የሚጠብቁ' },
  Enrollments: { en: 'Enrollments', am: 'ምዝገባዎች' },
  Sessions: { en: 'Sessions', am: 'የቀጥታ ስልጠናዎች' },
  'All Sessions': { en: 'All Sessions', am: 'ሁሉም ክፍለ-ጊዜዎች' },
  'My Sessions': { en: 'My Sessions', am: 'የእኔ ክፍለ-ጊዜዎች' },
  'Available Courses': { en: 'Available Courses', am: 'ያሉ ኮርሶች' },
  'My Courses': { en: 'My Courses', am: 'የእኔ ኮርሶች' },
  'Live Sessions': { en: 'Live Sessions', am: 'የቀጥታ ስልጠናዎች' },
  Certificates: { en: 'Certificates', am: 'ሰርተፊኬቶች' },
  Progress: { en: 'Progress', am: 'የመማር እድገት' },
  Registration: { en: 'Registration', am: 'ምዝገባ' },
  'Approve Registration': { en: 'Approve Registration', am: 'ምዝገባ ማጽደቅ' },
  'Actor Registration': { en: 'Actor Registration', am: 'አዲስ ተጠቃሚ መመዝገቢያ' },
  'Bulk Register': { en: 'Bulk Register', am: 'በጅምላ መመዝገቢያ' },
  'Pending Course Approvals': { en: 'Pending Course Approvals', am: 'ማጽደቅ የሚጠብቁ ኮርሶች' },
  'Certificate Templates': { en: 'Certificate Templates', am: 'የሰርተፊኬት ቅጾች' },
  'Users & Roles': { en: 'Users & Roles', am: 'ተጠቃሚዎች እና ሚናዎች' },
  'Roles & Permissions': { en: 'Roles & Permissions', am: 'ሚናዎች እና ፈቃዶች' },
  Policies: { en: 'Policies', am: 'መመሪያዎች እና ደንቦች' },
  'System Settings': { en: 'System Settings', am: 'የስርዓት ቅንብሮች' },
  'Audit Logs': { en: 'Audit Logs', am: 'የኦዲት መዝገብ' },
  'Course Feedback': { en: 'Course Feedback', am: 'የኮርስ ግብረ-መልስ' },
  Feedback: { en: 'Feedback', am: 'ግብረ-መልስ' },
  Navigation: { en: 'Navigation', am: 'አቅጣጫ መጠቆሚያ' },
  Account: { en: 'Account', am: 'የተጠቃሚ መለያ' },
  'Help & Support': { en: 'Help & Support', am: 'እርዳታ እና ድጋፍ' },
  'Switch role / Sign out': { en: 'Switch role / Sign out', am: 'መለያ ቀይር / ውጣ' },
  'Learning Management System': { en: 'Learning Management System', am: 'የትምህርት አስተዳደር ሥርዓት' },
};

export const COMMON_TRANSLATIONS: Record<string, TranslationEntry> = {
  // Navigation & General
  dashboard: { en: 'Dashboard', am: 'ዳሽቦርድ' },
  myCourses: { en: 'My Courses', am: 'የእኔ ኮርሶች' },
  continueLearning: { en: 'Continue learning', am: 'ትምህርት ቀጥል' },
  startLearning: { en: 'Start learning', am: 'መማር ጀምር' },
  completed: { en: 'Completed', am: 'የተጠናቀቀ' },
  inProgress: { en: 'In progress', am: 'በመካሄድ ላይ' },
  notStarted: { en: 'Not started', am: 'ያልተጀመረ' },
  takeQuiz: { en: 'Take quiz', am: 'ፈተና ውሰድ' },
  progress: { en: 'Progress', am: 'እድገት' },
  certificates: { en: 'Certificates', am: 'ሰርተፊኬቶች' },
  liveSessions: { en: 'Live sessions', am: 'የቀጥታ ስልጠና' },
  upcoming: { en: 'Upcoming sessions', am: 'የመጪ ስልጠና' },
  join: { en: 'Join', am: 'ተቀላቀል' },
  joinSession: { en: 'Join Session', am: 'ስልጠናውን ተቀላቀል' },
  averageProgress: { en: 'Average progress', am: 'አማካይ እድገት' },
  welcome: { en: 'Welcome', am: 'እንኳን ደህና መጡ' },
  welcomeBack: { en: 'Welcome back', am: 'እንኳን በደህና ተመለሱ' },

  // Pagination
  page: { en: 'Page', am: 'ገጽ' },
  of: { en: 'of', am: 'ከ' },
  previous: { en: 'Previous', am: 'ቀዳሚ' },
  next: { en: 'Next', am: 'ቀጣይ' },
  first: { en: 'First', am: 'መጀመሪያ' },
  last: { en: 'Last', am: 'መጨረሻ' },
  showing: { en: 'Showing', am: 'በማሳየት ላይ' },
  to: { en: 'to', am: 'እስከ' },
  results: { en: 'results', am: 'ውጤቶች' },
  items: { en: 'items', am: 'ንጥሎች' },
  rowsPerPage: { en: 'Rows per page', am: 'በአንድ ገጽ ረድፎች' },
  perPage: { en: 'Per page', am: 'በአንድ ገጽ' },
  jumpToPage: { en: 'Go to page', am: 'ወደ ገጽ ሂድ' },

  // Actions
  search: { en: 'Search', am: 'ፈልግ' },
  searchPlaceholder: { en: 'Search courses, users...', am: 'ኮርሶችን፣ ተጠቃሚዎችን ፈልግ...' },
  filter: { en: 'Filter', am: 'አጣራ' },
  clearFilters: { en: 'Clear filters', am: 'ማጣሪያዎችን አጽዳ' },
  all: { en: 'All', am: 'ሁሉም' },
  actions: { en: 'Actions', am: 'ተግባራት' },
  view: { en: 'View', am: 'እይ' },
  viewDetails: { en: 'View details', am: 'ዝርዝር እይ' },
  edit: { en: 'Edit', am: 'አስተካክል' },
  delete: { en: 'Delete', am: 'ሰርዝ' },
  save: { en: 'Save', am: 'አስቀምጥ' },
  cancel: { en: 'Cancel', am: 'ሰርዝ' },
  confirm: { en: 'Confirm', am: 'አረጋግጥ' },
  submit: { en: 'Submit', am: 'አስገባ' },
  approve: { en: 'Approve', am: 'አጽድቅ' },
  reject: { en: 'Reject', am: 'ውድቅ አድርግ' },
  publish: { en: 'Publish', am: 'አትም' },
  unpublish: { en: 'Unpublish', am: 'ከህትመት አንሳ' },
  archive: { en: 'Archive', am: 'አስቀምጥ' },
  download: { en: 'Download', am: 'አውርድ' },
  downloadCsv: { en: 'Download CSV', am: 'CSV አውርድ' },
  refresh: { en: 'Refresh', am: 'አድስ' },
  loading: { en: 'Loading...', am: 'በመጫን ላይ...' },
  quickActions: { en: 'Quick actions', am: 'ፈጣን ተግባራት' },
  recentActivity: { en: 'Recent activity', am: 'የቅርብ ጊዜ እንቅስቃሴዎች' },
  status: { en: 'Status', am: 'ሁኔታ' },
  category: { en: 'Category', am: 'ምድብ' },
  department: { en: 'Department', am: 'ክፍል' },
  applicant: { en: 'Applicant', am: 'አመልካች' },
  email: { en: 'Email', am: 'ኢሜይል' },
  phone: { en: 'Phone', am: 'ስልክ' },
  role: { en: 'Role', am: 'ሚና' },
  created: { en: 'Created', am: 'የተፈጠረበት' },
  submitted: { en: 'Submitted', am: 'የቀረበበት' },

  // Notifications
  notifications: { en: 'Notifications', am: 'ማሳወቂያዎች' },
  markAllRead: { en: 'Mark all read', am: 'ሁሉንም እንደተነበበ ምልክት አድርግ' },
  noNotifications: { en: 'No notifications yet', am: 'ምንም ማሳወቂያዎች የሉም' },

  // Statuses
  draft: { en: 'Draft', am: 'ረቂቅ' },
  underReview: { en: 'Under Review', am: 'በግምገማ ላይ' },
  pendingApproval: { en: 'Pending Approval', am: 'ማጽደቅ የሚጠብቅ' },
  approved: { en: 'Approved', am: 'የጸደቀ' },
  publishedStatus: { en: 'Published', am: 'የታተመ' },
  archivedStatus: { en: 'Archived', am: 'የተቀመጠ' },
  active: { en: 'Active', am: 'ንቁ' },
  inactive: { en: 'Inactive', am: 'ቦዝኗል' },
  pending: { en: 'Pending', am: 'በመጠባበቅ ላይ' },
  present: { en: 'Present', am: 'ተገኝቷል' },
  late: { en: 'Late', am: 'ዘግይቷል' },
  absent: { en: 'Absent', am: 'አልተገኘም' },
  excused: { en: 'Excused', am: 'በይቅርታ' },

  // System Admin Dashboard
  sysAdminTitle: { en: 'System Administrator Dashboard', am: 'የስርዓት አስተዳዳሪ ዳሽቦርድ' },
  sysAdminDesc: {
    en: 'Overview of platform operations, security posture, user growth, and system configuration.',
    am: 'የመድረኩ የስራ አፈጻጸም፣ ደህንነት፣ የተጠቃሚዎች ቁጥር እና የስርዓት ቅንብሮች አጠቃላይ እይታ።',
  },
  totalUsers: { en: 'Total users', am: 'ጠቅላላ ተጠቃሚዎች' },
  totalCourses: { en: 'Total courses', am: 'ጠቅላላ ኮርሶች' },
  totalEnrollments: { en: 'Total enrollments', am: 'ጠቅላላ ምዝገባዎች' },
  activeLiveSessions: { en: 'Active Live Sessions', am: 'ንቁ የቀጥታ ስልጠናዎች' },
  userRoleDistribution: { en: 'User Role Distribution', am: 'የተጠቃሚዎች የሚና ክፍፍል' },
  platformOperations: { en: 'Platform Operations & Growth', am: 'የመድረኩ አፈጻጸም እና እድገት' },
  recentAuditActivity: { en: 'Recent audit activity', am: 'የቅርብ ጊዜ የኦዲት እንቅስቃሴዎች' },
  viewFullTrail: { en: 'View full trail', am: 'ሙሉውን መዝገብ እይ' },
  noRecentAudit: {
    en: 'No recent audit activity recorded.',
    am: 'ምንም የቅርብ ጊዜ የኦዲት እንቅስቃሴ አልተመዘገበም።',
  },

  // Course Owner Dashboard
  courseOwnerTitle: { en: 'Course Owner Dashboard', am: 'የኮርስ ባለቤት ዳሽቦርድ' },
  courseOwnerDesc: {
    en: 'Design curriculum, submit courses for content review, track approval milestones, and monitor student enrollment.',
    am: 'ስርዓተ-ትምህርቶችን ያዘጋጁ፣ ለግምገማ ያቅርቡ፣ የማጽደቅ ደረጃዎችን ይከታተሉ እና የተማሪዎችን ምዝገባ ይቆጣጠሩ።',
  },
  inReview: { en: 'In review', am: 'በግምገማ ላይ' },
  totalLearners: { en: 'Total learners', am: 'ጠቅላላ ሰልጣኞች' },
  courseStatusDistribution: { en: 'Course Status Distribution', am: 'የኮርሶች ሁኔታ ስርጭት' },
  topCoursesByEnrollment: { en: 'Top Courses by Enrollment', am: 'ብዙ ተማሪ የተመዘገበባቸው ኮርሶች' },
  myCourseCatalog: { en: 'My Course Catalog', am: 'የእኔ ኮርሶች ዝርዝር' },
  createNewCourse: { en: 'Create New Course', am: 'አዲስ ኮርስ ፍጠር' },

  // Trainer Dashboard
  trainerTitle: { en: 'Trainer Dashboard', am: 'የአሰልጣኝ ዳሽቦርድ' },
  trainerDesc: {
    en: 'Conduct scheduled live sessions, author interactive quizzes, monitor learner attendance and classroom participation.',
    am: 'የቀጥታ ስልጠናዎችን ያካሂዱ፣ ፈተናዎችን ያዘጋጁ፣ የተማሪዎችን ተሳትፎ እና ክትትል ይቆጣጠሩ።',
  },
  assignedCourses: { en: 'Assigned courses', am: 'የተመደቡ ኮርሶች' },
  completedSessions: { en: 'Completed sessions', am: 'የተጠናቀቁ ስልጠናዎች' },
  activeLearners: { en: 'Active learners', am: 'ንቁ ሰልጣኞች' },
  upcomingLiveSessions: { en: 'Upcoming Live Sessions', am: 'የመጪ የቀጥታ ስልጠናዎች' },
  myAssignedCourses: { en: 'My Assigned Courses', am: 'የተመደቡልኝ ኮርሶች' },
  noSessionsScheduled: { en: 'No sessions currently scheduled.', am: 'በአሁኑ ጊዜ የታቀደ ስልጠና የለም።' },

  // Training Admin Dashboard
  trainingAdminTitle: { en: 'Training Administrator Dashboard', am: 'የስልጠና አስተዳዳሪ ዳሽቦርድ' },
  trainingAdminDesc: {
    en: 'Manage scheduled training sessions, monitor learner enrollments, supervise course publishing, and inspect facilitator calendar.',
    am: 'የስልጠና ክፍለ-ጊዜዎችን ያቀናብሩ፣ የተማሪዎችን ምዝገባ ይቆጣጠሩ፣ የኮርሶችን ህትመት ይቆጣጠሩ እና የቀን መቁጠሪያዎችን ይከታተሉ።',
  },
  publishedCourses: { en: 'Published courses', am: 'የታተሙ ኮርሶች' },
  activeEnrollments: { en: 'Active enrollments', am: 'ንቁ ምዝገባዎች' },
  scheduledSessions: { en: 'Scheduled sessions', am: 'የታቀዱ ስልጠናዎች' },
  coursePipeline: { en: 'Course Catalog Pipeline', am: 'የስልጠና ካታሎግ ሂደት' },
  publishNext: { en: 'Publish Next (Approved Courses)', am: 'ቀጣይ የሚታተሙ (የጸደቁ ኮርሶች)' },
  scheduleSession: { en: 'Schedule Session', am: 'ስልጠና መርሐግብር አውጣ' },

  // Content Approver Dashboard
  contentApproverTitle: { en: 'Content Approver Dashboard', am: 'የይዘት አጽዳቂ ዳሽቦርድ' },
  contentApproverDesc: {
    en: 'Review submitted curricula, verify quality and compliance, and maintain the approved course repository.',
    am: 'የቀረቡ የስልጠና ይዘቶችን ይገምግሙ፣ ጥራትን እና ተገቢነትን ያረጋግጡ፣ የጸደቁ ኮርሶችን ያቀናብሩ።',
  },
  pendingReview: { en: 'Pending review', am: 'ግምገማ የሚጠብቁ' },
  approvedCourses: { en: 'Approved courses', am: 'የጸደቁ ኮርሶች' },
  totalCatalog: { en: 'Total catalog', am: 'ጠቅላላ ካታሎግ' },
  approvalRate: { en: 'Approval rate', am: 'የማጽደቅ ምጣኔ' },
  reviewQueue: { en: 'Review Queue Distribution', am: 'የግምገማ ቅደም-ተከተል ስርጭት' },
  categoryBreakdown: { en: 'Category Breakdown', am: 'የምድቦች ዝርዝር' },
  curriculumPendingApproval: {
    en: 'Curriculum Pending Your Approval',
    am: 'ማጽደቅዎን የሚጠብቁ ስርዓተ-ትምህርቶች',
  },

  // Learner Dashboard
  learnerTitle: { en: 'Learner Dashboard', am: 'የተማሪ ዳሽቦርድ' },
  learnerDesc: {
    en: 'Track your learning journey, resume active courses, and participate in scheduled live sessions.',
    am: 'የመማር ሂደትዎን ይከታተሉ፣ ንቁ ኮርሶችን ይቀጥሉ እና በቀጥታ ስልጠናዎች ላይ ይሳተፉ።',
  },
  learningHubWelcome: { en: 'Welcome to your LMS Learning Hub', am: 'እንኳን ወደ የመማሪያ ማዕከልዎ በደህና መጡ' },
  learningStatusOverview: { en: 'Learning Status Overview', am: 'የመማር ሁኔታ አጠቃላይ እይታ' },
  weeklyProgressBreakdown: { en: 'Course Progress Breakdown', am: 'የኮርሶች እድገት ዝርዝር' },
  continueLearningTitle: { en: 'Continue Learning', am: 'ትምህርትዎን ይቀጥሉ' },

  // Page Specific Titles & Descriptions
  usersTitle: { en: 'User Management', am: 'የተጠቃሚዎች አስተዳደር' },
  usersDesc: {
    en: 'Search, filter, and manage platform users, assign roles, and administer account states.',
    am: 'የመድረኩን ተጠቃሚዎች ይፈልጉ፣ ያጣሩ፣ ሚናዎችን ይመድቡ እና የመለያ ሁኔታዎችን ያስተዳድሩ።',
  },
  rolesTitle: { en: 'Roles & Permissions', am: 'ሚናዎች እና ፈቃዶች' },
  rolesDesc: {
    en: 'Define user roles and customize fine-grained access control permissions.',
    am: 'የተጠቃሚ ሚናዎችን ይወስኑ እና የመዳረሻ ፈቃዶችን ያስተካክሉ።',
  },
  policiesTitle: { en: 'Policies & Parameters', am: 'መመሪያዎች እና ደንቦች' },
  policiesDesc: {
    en: 'Configure course completion rules and live session attendance thresholds.',
    am: 'የኮርስ ማጠናቀቂያ ደንቦችን እና የቀጥታ ስልጠና የክትትል ገደቦችን ያዋቅሩ።',
  },
  auditTitle: { en: 'Audit Logs', am: 'የኦዲት መዝገብ' },
  auditDesc: {
    en: 'A chronological trail of actions performed across the system.',
    am: 'በስርዓቱ ውስጥ የተከናወኑ ተግባራት ቅደም ተከተላዊ መዝገብ።',
  },
  settingsTitle: { en: 'System Settings', am: 'የስርዓት ቅንብሮች' },
  settingsDesc: {
    en: 'Platform parameters, storage configuration, and environment controls.',
    am: 'የመድረክ መለኪያዎች፣ የመረጃ ቋት እና የስርዓት ቁጥጥሮች።',
  },
  pendingRegistrationsTitle: { en: 'Registration Requests', am: 'የምዝገባ ጥያቄዎች' },
  pendingRegistrationsDesc: {
    en: 'Public sign-ups require your approval before learners can sign in.',
    am: 'ተማሪዎች ከመግባታቸው በፊት የአስተዳዳሪ ማጽደቅ የሚያስፈልጋቸው ምዝገባዎች።',
  },
  registerActorTitle: { en: 'Register Actor', am: 'አዲስ ተጠቃሚ መመዝገቢያ' },
  registerActorDesc: {
    en: 'Provision administrative accounts and assign platform responsibilities.',
    am: 'የአስተዳደር መለያዎችን ይፍጠሩ እና ኃላፊነቶችን ይመድቡ።',
  },
  bulkRegisterTitle: { en: 'Bulk User Registration', am: 'በጅምላ ተጠቃሚዎችን መመዝገቢያ' },
  bulkRegisterDesc: {
    en: 'Upload user records via spreadsheet or CSV to provision accounts in bulk.',
    am: 'በCSV ወይም ኤክሴል ፋይል ብዙ ተጠቃሚዎችን በአንድ ጊዜ ይመዝግቡ።',
  },
  pendingCourseApprovalsTitle: { en: 'Pending Course Approvals', am: 'ማጽደቅ የሚጠብቁ ኮርሶች' },
  pendingCourseApprovalsDesc: {
    en: 'Review course submissions, approve to publish, or reject with required feedback.',
    am: 'የቀረቡ ኮርሶችን ይገምግሙ፣ ያጽድቁ ወይም አስተያየት በመስጠት ይመልሱ።',
  },
  certificateTemplatesTitle: { en: 'Certificate Templates', am: 'የሰርተፊኬት ቅጾች' },
  certificateTemplatesDesc: {
    en: 'Manage the layouts and brand assets used to issue official completion certificates.',
    am: 'የኮርስ ማጠናቀቂያ ሰርተፊኬቶችን ዲዛይን እና ይዘት ያስተዳድሩ።',
  },
  coursesTitle: { en: 'Courses', am: 'ኮርሶች' },
  coursesDesc: {
    en: 'Browse, review, and manage courses. What you see here is scoped to your role.',
    am: 'ኮርሶችን ያስሱ፣ ይገምግሙ እና ያስተዳድሩ። እዚህ የሚያዩት እንደ ሚናዎ የተወሰነ ነው።',
  },
  createCourseTitle: { en: 'Create Course', am: 'አዲስ ኮርስ ፍጠር' },
  createCourseDesc: {
    en: 'Step-by-step authoring wizard for curriculum, modules, lessons, and quizzes.',
    am: 'ስርዓተ-ትምህርትን፣ ምዕራፎችን፣ ትምህርቶችን እና ፈተናዎችን የማዘጋጀት ሂደት።',
  },
  contentStatusTitle: { en: 'Content Status', am: 'የይዘት ሁኔታ' },
  contentStatusDesc: {
    en: 'Monitor the approval pipeline and administrator rejection feedback.',
    am: 'የማጽደቅ ሂደቱን እና የአስተዳዳሪ ግብረ-መልስን ይከታተሉ።',
  },
  questionBankTitle: { en: 'Question Bank', am: 'የጥያቄዎች ባንክ' },
  questionBankDesc: {
    en: 'Author reusable question items, manage banks, and assemble interactive quizzes.',
    am: 'ዳግም ጥቅም ላይ ሊውሉ የሚችሉ ጥያቄዎችን ያዘጋጁ እና ፈተናዎችን ያቀናብሩ።',
  },
  sessionsTitle: { en: 'Live Sessions Management', am: 'የቀጥታ ስልጠናዎች አስተዳደር' },
  sessionsDesc: {
    en: 'Schedule and manage live classes, monitor attendance, and join rooms.',
    am: 'የቀጥታ ስልጠናዎችን ያቅዱ እና ያስተዳድሩ፣ ክትትልን ይቆጣጠሩ እና ክፍሎችን ይቀላቀሉ።',
  },
  attendanceTitle: { en: 'Session Attendance Management', am: 'የስልጠና ክትትል አስተዳደር' },
  attendanceDesc: {
    en: 'Real-time attendance tracking, check-in records, stay duration, and manual status overrides.',
    am: 'የቀጥታ የክትትል ቁጥጥር፣ የተማሪዎች የቆይታ ጊዜ እና የክትትል ሁኔታ ማስተካከያ።',
  },
  enrollmentsTitle: { en: 'Course Enrolled Students & Roster', am: 'የተመዘገቡ ተማሪዎች ዝርዝር' },
  enrollmentsDesc: {
    en: 'Inspect enrolled learners, track real-time course progress, and manage learner assignments across all catalog courses.',
    am: 'የተመዘገቡ ተማሪዎችን ይመልከቱ፣ የመማር ሂደታቸውን ይከታተሉ እና የተማሪ ምደባዎችን ያስተዳድሩ።',
  },
  calendarTitle: { en: 'Training Calendar', am: 'የስልጠና የቀን መቁጠሪያ' },
  calendarDesc: {
    en: 'Monthly and weekly schedule of live sessions, webinars, and training deadlines.',
    am: 'የቀጥታ ስልጠናዎች፣ ዌቢናሮች እና የስልጠና ቀነ-ገደቦች ወርሃዊ እና ሳምንታዊ የጊዜ ሰሌዳ።',
  },
  catalogTitle: { en: 'Available Courses', am: 'ያሉ ኮርሶች' },
  catalogDesc: {
    en: 'Explore and enroll in published courses offered across the organization.',
    am: 'በድርጅቱ ውስጥ የሚሰጡ የታተሙ ኮርሶችን ያስሱ እና ይመዝገቡ።',
  },
  learnerCertificatesTitle: { en: 'My Certificates', am: 'የእኔ ሰርተፊኬቶች' },
  learnerCertificatesDesc: {
    en: 'Certificates earned from successfully completing training courses.',
    am: 'ስልጠናዎችን በተሳካ ሁኔታ በማጠናቀቅ የተገኙ ይፋዊ ሰርተፊኬቶች።',
  },
  learnerProgressTitle: { en: 'Learning Progress & Analytics', am: 'የመማር እድገት እና ትንተና' },
  learnerProgressDesc: {
    en: 'Detailed analytics on lesson completions, quiz results, and performance milestones.',
    am: 'የትምህርት ማጠናቀቂያ፣ የፈተና ውጤቶች እና አጠቃላይ የክንውን ዝርዝር ትንተና።',
  },
};

/**
 * Helper to get a translation by key with optional fallbacks
 */
export function getTranslation(
  key: string,
  lang: Lang,
  fallback?: { en?: string; am?: string },
): string {
  if (COMMON_TRANSLATIONS[key]) {
    return COMMON_TRANSLATIONS[key][lang];
  }
  if (NAV_TRANSLATIONS[key]) {
    return NAV_TRANSLATIONS[key][lang];
  }
  if (fallback) {
    return lang === 'am' ? (fallback.am ?? fallback.en ?? key) : (fallback.en ?? key);
  }
  return key;
}
