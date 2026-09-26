/**
 * Every backend path used by the learner app, relative to API_URL (…/api/v1).
 * One entry per endpoint in LEARNER_MOBILE_API_SPEC.md §2–§10.
 */

const id = (value: string) => encodeURIComponent(value);

export const endpoints = {
  health: 'health',

  /* §2 Auth & account ------------------------------------------------------ */
  auth: {
    login: 'auth/login',
    refresh: 'auth/refresh',
    logout: 'auth/logout',
    register: 'auth/register',
    forgotPassword: 'auth/forgot-password',
    verifyResetCode: 'auth/verify-reset-code',
    resetPassword: 'auth/reset-password',
    firstLoginResendCode: 'auth/first-login/resend-code',
    firstLoginVerifyCode: 'auth/first-login/verify-code',
    firstLoginComplete: 'auth/first-login/complete',
  },
  users: {
    me: 'users/me',
    changePassword: 'users/me/change-password',
  },
  files: {
    avatar: 'files/avatar',
  },

  /* §3 Catalog -------------------------------------------------------------- */
  courses: {
    list: 'courses',
    detail: (courseId: string) => `courses/${id(courseId)}`,
    /** ⚠️ Not for learner UI — no lock flags (spec §3.3). */
    modules: (courseId: string) => `courses/${id(courseId)}/modules`,
    assessments: (courseId: string) => `courses/${id(courseId)}/assessments`,
  },
  modules: {
    detail: (moduleId: string) => `modules/${id(moduleId)}`,
    attachments: (moduleId: string) => `modules/${id(moduleId)}/attachments`,
    assessments: (moduleId: string) => `modules/${id(moduleId)}/assessments`,
  },

  /* §4 Enrollments ---------------------------------------------------------- */
  enrollments: {
    mine: 'enrollments/me',
    self: 'enrollments/self',
    drop: (enrollmentId: string) => `enrollments/${id(enrollmentId)}/drop`,
  },

  /* §5 Lessons -------------------------------------------------------------- */
  lessons: {
    detail: (lessonId: string) => `lessons/${id(lessonId)}`,
    attachments: (lessonId: string) => `lessons/${id(lessonId)}/attachments`,
    assessments: (lessonId: string) => `lessons/${id(lessonId)}/assessments`,
  },

  /* §6 Progress ------------------------------------------------------------- */
  progress: {
    course: (courseId: string) => `progress/courses/${id(courseId)}`,
    lesson: (lessonId: string) => `progress/lessons/${id(lessonId)}`,
    complete: (lessonId: string) => `progress/lessons/${id(lessonId)}/complete`,
    time: (lessonId: string) => `progress/lessons/${id(lessonId)}/time`,
  },

  /* §7 Assessments ---------------------------------------------------------- */
  assessments: {
    detail: (assessmentId: string) => `assessments/${id(assessmentId)}`,
    start: (assessmentId: string) => `assessments/${id(assessmentId)}/start`,
    submit: (assessmentId: string) => `assessments/${id(assessmentId)}/submit`,
    attempts: (assessmentId: string) => `assessments/${id(assessmentId)}/attempts`,
  },

  /* §8 Live sessions & attendance ------------------------------------------ */
  liveSessions: {
    list: 'live-sessions',
    upcomingMine: 'live-sessions/upcoming/me',
    detail: (sessionId: string) => `live-sessions/${id(sessionId)}`,
    joinUrl: (sessionId: string) => `live-sessions/${id(sessionId)}/join-url`,
    livekitToken: (sessionId: string) => `live-sessions/${id(sessionId)}/livekit-token`,
  },
  attendance: {
    mine: 'attendance/me',
    /** Pass `?method=` via request params (spec §8.6). */
    checkIn: (sessionId: string) => `attendance/checkin/${id(sessionId)}`,
    join: (sessionId: string) => `attendance/sessions/${id(sessionId)}/join`,
    heartbeat: (sessionId: string) => `attendance/sessions/${id(sessionId)}/heartbeat`,
    leave: (sessionId: string) => `attendance/sessions/${id(sessionId)}/leave`,
    visibility: (sessionId: string) => `attendance/sessions/${id(sessionId)}/visibility`,
  },
  venues: {
    detail: (venueId: string) => `venues/${id(venueId)}`,
  },

  /* §9 Certificates --------------------------------------------------------- */
  certificates: {
    mine: 'certificates/me',
    /** Pass `?courseId=` via request params (spec §9.2). */
    claim: 'certificates/claim',
    detail: (certificateId: string) => `certificates/${id(certificateId)}`,
    download: (certificateId: string) => `certificates/${id(certificateId)}/download`,
    verify: 'certificates/verify',
  },

  /* §10 Notifications ------------------------------------------------------- */
  notifications: {
    mine: 'notifications/me',
    unreadCount: 'notifications/me/unread-count',
    markRead: (notificationId: string) => `notifications/${id(notificationId)}/read`,
    markAllRead: 'notifications/me/read-all',
  },
} as const;
