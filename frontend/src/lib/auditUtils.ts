/**
 * Utility functions for transforming raw backend audit logs and HTTP action codes
 * into clean, user-friendly human readable descriptions of what the actor did.
 */

export interface FormattedAuditAction {
  title: string;
  isFailed: boolean;
  category: string;
}

const KNOWN_ACTIONS: Record<string, { title: string; category: string }> = {
  // Course Lifecycle
  POST_COURSES: { title: 'Created course', category: 'Course' },
  PATCH_COURSES: { title: 'Updated course details', category: 'Course' },
  DELETE_COURSES: { title: 'Deleted course', category: 'Course' },
  PUT_COURSES: { title: 'Modified course', category: 'Course' },
  POST_COURSES_REQUEST_APPROVAL: { title: 'Submitted course for review', category: 'Course' },
  POST_COURSES_REVIEW: { title: 'Reviewed course curriculum', category: 'Course' },
  POST_COURSES_APPROVE: { title: 'Approved course curriculum', category: 'Course' },
  POST_COURSES_REJECT: { title: 'Returned course for revision', category: 'Course' },
  POST_COURSES_PUBLISH: { title: 'Published course to catalog', category: 'Course' },
  POST_COURSES_UNPUBLISH: { title: 'Unpublished course', category: 'Course' },
  POST_COURSES_RETURN_TO_DRAFT: { title: 'Returned course to draft', category: 'Course' },
  POST_COURSES_ARCHIVE: { title: 'Archived course', category: 'Course' },
  POST_COURSES_TRAINERS: { title: 'Assigned course trainer', category: 'Course' },
  DELETE_COURSES_TRAINERS: { title: 'Removed course trainer', category: 'Course' },
  PUT_COURSES_CURRICULUM: { title: 'Updated curriculum structure', category: 'Course' },
  PUT_COURSES_SESSION_PLANS: { title: 'Updated session plans', category: 'Course' },
  PATCH_COURSES_SESSION_PLANS_TRAINER: { title: 'Assigned trainer to session plan', category: 'Course' },
  POST_COURSES_MODULES: { title: 'Added course module', category: 'Course' },
  PATCH_COURSES_MODULES: { title: 'Updated course module', category: 'Course' },
  DELETE_COURSES_MODULES: { title: 'Removed course module', category: 'Course' },
  POST_COURSES_LESSONS: { title: 'Added lesson to module', category: 'Course' },
  PATCH_COURSES_LESSONS: { title: 'Updated lesson content', category: 'Course' },
  DELETE_COURSES_LESSONS: { title: 'Removed lesson', category: 'Course' },
  POST_COURSES_ASSESSMENTS: { title: 'Added course assessment', category: 'Course' },
  POST_COURSES_MODULES_ASSESSMENTS: { title: 'Added module assessment', category: 'Course' },
  POST_COURSES_MODULES_LESSONS_ASSESSMENTS: { title: 'Added lesson assessment', category: 'Course' },
  PUT_COURSES_ASSESSMENT: { title: 'Updated course assessment', category: 'Course' },

  // Assessments & Quizzes
  POST_ASSESSMENTS_START: { title: 'Started quiz attempt', category: 'Assessment' },
  POST_ASSESSMENTS_SUBMIT: { title: 'Submitted quiz assessment', category: 'Assessment' },
  POST_ASSESSMENTS: { title: 'Created assessment', category: 'Assessment' },
  PATCH_ASSESSMENTS: { title: 'Updated assessment settings', category: 'Assessment' },
  DELETE_ASSESSMENTS: { title: 'Deleted assessment', category: 'Assessment' },
  PUT_ASSESSMENTS: { title: 'Replaced assessment questions', category: 'Assessment' },
  POST_QUESTION_BANK: { title: 'Created question in bank', category: 'Assessment' },
  POST_QUESTION_BANK_BULK: { title: 'Imported questions to bank', category: 'Assessment' },
  POST_QUESTION_BANK_CHECK_DUPLICATES: { title: 'Checked for duplicate questions', category: 'Assessment' },

  // Live Sessions & Attendance
  POST_COURSES_LIVE_SESSIONS: { title: 'Created live video session', category: 'Live Session' },
  POST_LIVE_SESSIONS: { title: 'Created live video session', category: 'Live Session' },
  PATCH_LIVE_SESSIONS: { title: 'Updated live session details', category: 'Live Session' },
  PATCH_LIVE_SESSIONS_STATUS: { title: 'Updated live session status', category: 'Live Session' },
  DELETE_LIVE_SESSIONS: { title: 'Deleted live session', category: 'Live Session' },
  POST_LIVE_SESSIONS_WEBHOOK: { title: 'Received live session event', category: 'Live Session' },
  POST_LIVE_SESSIONS_QUIZ_RESPONSE: { title: 'Submitted live session quiz answer', category: 'Live Session' },
  POST_LIVE_SESSIONS_PREPARED_QUIZ_BULK: { title: 'Imported session quizzes', category: 'Live Session' },
  POST_LIVE_SESSIONS_PREPARED_QUIZ_QUESTIONS_BULK: { title: 'Imported session quiz questions', category: 'Live Session' },
  POST_ATTENDANCE_CHECKIN: { title: 'Recorded attendance check-in', category: 'Attendance' },
  POST_ATTENDANCE_SESSIONS_JOIN: { title: 'Joined live session room', category: 'Attendance' },
  POST_ATTENDANCE_SESSIONS_HEARTBEAT: { title: 'Recorded attendance presence', category: 'Attendance' },
  POST_ATTENDANCE_SESSIONS_LEAVE: { title: 'Left live session room', category: 'Attendance' },
  POST_ATTENDANCE_SESSIONS_SEND_REPORT: { title: 'Dispatched attendance report', category: 'Attendance' },
  ATTENDANCE_REPORT_DISPATCH: { title: 'Dispatched attendance report', category: 'Attendance' },

  // Auth & Identity
  POST_AUTH_LOGIN: { title: 'User logged in', category: 'Security' },
  POST_AUTH_LOGOUT: { title: 'User logged out', category: 'Security' },
  POST_AUTH_REFRESH: { title: 'Refreshed access token', category: 'Security' },
  POST_AUTH_REGISTER: { title: 'Registered new user account', category: 'Security' },
  POST_AUTH_FIRST_LOGIN_VERIFY_CODE: { title: 'Verified first login code', category: 'Security' },
  POST_AUTH_FIRST_LOGIN_COMPLETE: { title: 'Completed account activation', category: 'Security' },
  POST_AUTH_FORGOT_PASSWORD: { title: 'Requested password reset', category: 'Security' },
  POST_AUTH_VERIFY_RESET_CODE: { title: 'Verified password reset code', category: 'Security' },
  POST_AUTH_RESET_PASSWORD: { title: 'Reset user password', category: 'Security' },
  POST_USERS_ME_CHANGE_PASSWORD: { title: 'Changed personal password', category: 'Security' },

  // User Management
  POST_USERS: { title: 'Created user account', category: 'User' },
  PATCH_USERS: { title: 'Updated user details', category: 'User' },
  PATCH_USERS_ME: { title: 'Updated personal profile', category: 'User' },
  DELETE_USERS: { title: 'Deleted user account', category: 'User' },
  POST_USERS_DEACTIVATE: { title: 'Deactivated user account', category: 'User' },
  POST_USERS_REACTIVATE: { title: 'Reactivated user account', category: 'User' },
  POST_USERS_BULK: { title: 'Imported users in bulk', category: 'User' },
  POST_USERS_APPROVE_REGISTRATION: { title: 'Approved user registration', category: 'User' },
  POST_USERS_ASSIGN_ROLE: { title: 'Assigned role to user', category: 'User' },
  POST_USERS_ROLES: { title: 'Assigned role to user', category: 'User' },
  POST_USERS_ACTORS: { title: 'Configured user actor mapping', category: 'User' },
  POST_ADMIN_ROLES: { title: 'Created administrative role', category: 'Admin' },
  DELETE_ADMIN_ROLES: { title: 'Deleted administrative role', category: 'Admin' },
  POST_ADMIN_ROLES_PERMISSIONS: { title: 'Updated role permissions', category: 'Admin' },
  PATCH_ADMIN_SETTINGS: { title: 'Updated system settings', category: 'Admin' },
  PUT_ADMIN_LANDING_CONFIG: { title: 'Updated landing page configuration', category: 'Admin' },
  POST_ADMIN_PUBLIC_HOLIDAYS_SEED_DEFAULTS: { title: 'Seeded default public holidays', category: 'Admin' },

  // Enrollments & Progress
  POST_ENROLLMENTS_SELF: { title: 'Enrolled in course', category: 'Enrollment' },
  POST_COURSES_ENROLL: { title: 'Enrolled in course', category: 'Enrollment' },
  DELETE_ENROLLMENTS: { title: 'Unenrolled from course', category: 'Enrollment' },
  ENROLLMENT_UNENROLL: { title: 'Unenrolled from course', category: 'Enrollment' },
  PATCH_PROGRESS_LESSONS_TIME: { title: 'Logged lesson study time', category: 'Learning' },
  PATCH_PROGRESS_LESSONS_COMPLETE: { title: 'Completed lesson', category: 'Learning' },

  // Certificates
  AUTO_ISSUE: { title: 'Automatically issued certificate', category: 'Certificate' },
  REVOKE: { title: 'Revoked certificate', category: 'Certificate' },
  POST_CERTIFICATES_REVOKE: { title: 'Revoked certificate', category: 'Certificate' },
  POST_CERTIFICATES_CLAIM: { title: 'Claimed certificate', category: 'Certificate' },
  PATCH_CERTIFICATE_TEMPLATES: { title: 'Updated certificate template', category: 'Certificate' },

  // News, Lookups & Media
  POST_LOOKUP_CATEGORIES: { title: 'Created category', category: 'Lookup' },
  PATCH_LOOKUP_CATEGORIES: { title: 'Updated category', category: 'Lookup' },
  DELETE_LOOKUP_CATEGORIES: { title: 'Deleted category', category: 'Lookup' },
  POST_NEWS_COMMENTS: { title: 'Posted news comment', category: 'News' },
  DELETE_NEWS_COMMENTS: { title: 'Deleted news comment', category: 'News' },
  POST_FILES_UPLOAD: { title: 'Uploaded media file', category: 'Media' },
  POST_FILES_COVER: { title: 'Uploaded course cover', category: 'Media' },
  POST_FILES_AVATAR: { title: 'Uploaded profile avatar', category: 'Media' },
  PATCH_POLICY: { title: 'Updated platform policy', category: 'Policy' },
  DOWNLOAD: { title: 'Downloaded export file', category: 'System' },
  UPDATE: { title: 'Updated system record', category: 'System' },
};

/**
 * Transforms any raw audit action string into a clean, human-readable action description.
 * Never exposes raw HTTP methods like GET, POST, PATCH, PUT, DELETE.
 */
export function formatAuditAction(rawAction: string): FormattedAuditAction {
  if (!rawAction) {
    return { title: 'System Event', isFailed: false, category: 'System' };
  }

  const isFailed = rawAction.endsWith('_FAILED');
  const base = rawAction.replace(/_FAILED$/, '');

  // Exact dictionary match
  if (KNOWN_ACTIONS[base]) {
    const item = KNOWN_ACTIONS[base];
    return {
      title: item.title + (isFailed ? ' (Failed)' : ''),
      isFailed,
      category: item.category,
    };
  }

  // Handle dynamic DELETE_USERS_ROLES_<ROLENAME>
  if (base.startsWith('DELETE_USERS_ROLES_')) {
    const roleName = base.replace('DELETE_USERS_ROLES_', '').replace(/_/g, ' ');
    return {
      title: `Revoked ${roleName} role${isFailed ? ' (Failed)' : ''}`,
      isFailed,
      category: 'User',
    };
  }

  // Handle dynamic POST_USERS_ROLES_<ROLENAME>
  if (base.startsWith('POST_USERS_ROLES_')) {
    const roleName = base.replace('POST_USERS_ROLES_', '').replace(/_/g, ' ');
    return {
      title: `Assigned ${roleName} role${isFailed ? ' (Failed)' : ''}`,
      isFailed,
      category: 'User',
    };
  }

  // Fallback: Clean up any HTTP verbs and underscores without ever showing the verb
  const clean = base
    .replace(/^(GET|POST|PUT|PATCH|DELETE)_/i, '')
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const title = (clean || 'System Action') + (isFailed ? ' (Failed)' : '');
  return {
    title,
    isFailed,
    category: 'General',
  };
}

