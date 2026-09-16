export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const CURRENT_USER_KEY = 'currentUser';
export const IS_PUBLIC_KEY = 'isPublic';

export const BCRYPT_ROUNDS = 12;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

export const FILE_SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024, // 5 MB
  attachment: 50 * 1024 * 1024, // 50 MB
  scorm: 200 * 1024 * 1024, // 200 MB
  certificate: 10 * 1024 * 1024, // 10 MB
  cover: 5 * 1024 * 1024, // 5 MB
  certificate_template: 10 * 1024 * 1024, // 10 MB
} as const;

export const ALLOWED_MIME_TYPES = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  scorm: ['application/zip'],
  archives: ['application/zip', 'application/x-7z-compressed', 'application/x-rar-compressed'],
} as const;

export const CERTIFICATE_CONFIG = {
  numberPrefix: 'ELTMS',
  verificationCodeLength: 8,
  validityMonths: 24,
} as const;

export const CACHE_KEYS = {
  USER_PREFIX: 'user:',
  COURSE_PREFIX: 'course:',
  SESSION_PREFIX: 'session:',
} as const;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
} as const;

export const LOCALE = {
  EN: 'en',
  AM: 'am',
} as const;

export type Locale = (typeof LOCALE)[keyof typeof LOCALE];
