'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { isValidEmail, passwordIssues } from '@/constants/auth';
import {
  ApiError,
  setAccessToken,
  setRefreshHandler,
  setUnauthorizedHandler,
} from '@/lib/api/client';
import {
  clearFirstLoginChallenge,
  completeFirstLogin as apiCompleteFirstLogin,
  login as apiLogin,
  logout as apiLogout,
  readFirstLoginChallenge,
  saveFirstLoginChallenge,
  type AuthResult,
  refresh as apiRefresh,
  register as apiRegister,
} from '@/lib/api/auth';
import {
  fetchCourseDetail,
  fetchCourses,
  createCourse as apiCreateCourse,
  createModule,
  publishCourse as apiPublishCourse,
  unpublishCourse as apiUnpublishCourse,
  replaceCurriculum,
  requestApproval,
  reviewCourse,
  updateCourse as apiUpdateCourse,
} from '@/lib/api/courses';
import {
  bulkEnroll,
  fetchCourseEnrollments,
  fetchMyEnrollments,
  selfEnroll,
} from '@/lib/api/enrollments';
import {
  approveRegistration,
  assignRole,
  bulkCreateUsers,
  changeMyPassword,
  createActor,
  deactivateUser as apiDeactivateUser,
  fetchUsers,
  reactivateUser as apiReactivateUser,
  deleteUser as apiDeleteUser,
  rejectRegistration,
  removeRole,
  updateMyProfile,
} from '@/lib/api/users';
import { getStoredAccessToken, getStoredRefreshToken, clearTokens } from '@/lib/api/tokens';
import {
  assignTrainer as apiAssignTrainer,
  unassignTrainer,
  deleteCourse as apiDeleteCourse,
  archiveCourse as apiArchiveCourse,
} from '@/lib/api/courses';
import { uploadAttachment, uploadCover } from '@/lib/api/files';
import { createCourseAssessment, replaceAssessment } from '@/lib/api/quiz';
import type { AssessmentQuestionInput } from '@/lib/api/quiz';
import {
  courseFromDetail,
  courseToCreateBody,
  courseToUpdateBody,
  moduleToCreateBody,
  roleToApi,
  uploadedResourceToApiAttachment,
  userFromApi,
} from '@/lib/api/transform';
import type {
  BulkCreateUserItem,
  BulkCreateUsersResult,
  CreateCurriculumAttachmentBody,
} from '@/lib/api/types';
import type {
  ActionResult,
  Attachment,
  Course,
  CourseLevel,
  Lang,
  LoginResult,
  Quiz,
  Role,
  UploadedResource,
  User,
} from '@/types';

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  department?: string;
  tin?: string;
}

export interface WizardLessonInput {
  title: string;
  content?: string;
  durationMin?: number;
  contentType?: string;
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
  subLessons?: WizardLessonInput[];
}

export interface WizardModuleInput {
  title: string;
  description?: string;
  objectives?: string;
  durationMinutes?: number;
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
  lessons: WizardLessonInput[];
}

function toAttachmentBodies(
  attachments?: UploadedResource[],
  resources?: UploadedResource[],
  resourceUrl?: string,
  fileName?: string,
  fileSize?: number,
): CreateCurriculumAttachmentBody[] | undefined {
  const list = attachments?.length ? attachments : resources?.length ? resources : [];
  if (list.length > 0) {
    return list.map(uploadedResourceToApiAttachment);
  }
  if (resourceUrl) {
    return [
      {
        fileName: fileName || resourceUrl.split('/').pop() || 'Resource',
        fileUrl: resourceUrl,
        fileType: 'application/octet-stream',
        sizeBytes: fileSize || 0,
      },
    ];
  }
  return undefined;
}

function normalizeLessonContentType(
  type?: string,
): 'DOCUMENT' | 'INTERACTIVE' | 'VIDEO' | 'AUDIO' | 'PRESENTATION' | 'EXTERNAL_LINK' | 'SCORM' {
  if (!type) return 'DOCUMENT';
  if (type === 'ASSIGNMENT') return 'DOCUMENT';
  if (type === 'QUIZ' || type === 'ASSESSMENT') return 'INTERACTIVE';
  if (
    [
      'DOCUMENT',
      'INTERACTIVE',
      'VIDEO',
      'AUDIO',
      'PRESENTATION',
      'EXTERNAL_LINK',
      'SCORM',
    ].includes(type)
  ) {
    return type as any;
  }
  return 'DOCUMENT';
}

interface LmsContextValue {
  ready: boolean;
  courses: Course[];
  users: User[];
  lang: Lang;
  currentUser: User | null;
  setLang: (lang: Lang) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Finishes the forced password change of an admin-created account and signs it in. */
  completeFirstLogin: (input: {
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<LoginResult>;
  logout: () => void;
  register: (input: RegisterInput) => Promise<ActionResult>;
  courseById: (courseId: string) => Course | undefined;
  userName: (userId: string) => string;
  createCourse: (input: {
    code: string;
    title: string;
    category: string;
    department?: string;
    targetAudience?: string;
    deliveryMethod?: string;
    language?: string;
    prerequisites?: string;
    objectives?: string;
    description: string;
    level?: CourseLevel;
    cover?: File | null;
    modules?: WizardModuleInput[];
    attachments?: Attachment[];
    quiz?: Quiz;
  }) => Promise<ActionResult & { courseId?: string }>;
  updateCourse: (
    courseId: string,
    input: { title: string; category: string; description: string },
  ) => Promise<ActionResult>;
  updateCourseFull: (
    courseId: string,
    input: {
      title: string;
      category: string;
      department?: string;
      targetAudience?: string;
      deliveryMethod?: string;
      language?: string;
      prerequisites?: string;
      objectives?: string;
      description: string;
      level?: CourseLevel;
      cover?: File | null;
      modules?: WizardModuleInput[];
      attachments?: Attachment[];
      quiz?: Quiz;
    },
  ) => Promise<ActionResult>;
  saveCourseCover: (courseId: string, file: File) => Promise<ActionResult>;
  assignTrainerToCourse: (courseId: string, trainerId: string) => Promise<ActionResult>;
  unassignTrainerFromCourse: (courseId: string, trainerId: string) => Promise<ActionResult>;
  submitForApproval: (courseId: string) => Promise<ActionResult>;
  approveCourse: (courseId: string) => Promise<ActionResult>;
  rejectCourse: (courseId: string, reason: string) => Promise<ActionResult>;
  requestChangesCourse: (courseId: string, reason: string) => Promise<ActionResult>;
  publishCourse: (courseId: string) => Promise<ActionResult>;
  unpublishCourse: (courseId: string) => Promise<ActionResult>;
  archiveCourse: (courseId: string) => Promise<ActionResult>;
  deleteCourse: (courseId: string) => Promise<ActionResult>;
  enrollLearners: (courseId: string, learnerIds: string[]) => Promise<ActionResult>;
  enrollSelf: (courseId: string) => Promise<ActionResult>;
  changeUserRole: (userId: string, role: Role) => Promise<ActionResult>;
  approveRegistrationRequest: (userId: string) => Promise<ActionResult>;
  rejectRegistrationRequest: (userId: string, reason?: string) => Promise<ActionResult>;
  deactivateUser: (userId: string) => Promise<ActionResult>;
  reactivateUser: (userId: string) => Promise<ActionResult>;
  deleteUser: (userId: string) => Promise<ActionResult>;
  /** Suspends or deletes several users, reloading once. Failures are reported per user. */
  bulkUserAction: (
    action: 'suspend' | 'delete',
    userIds: string[],
  ) => Promise<{ ok: false; message: string } | { ok: true; succeeded: number; failed: string[] }>;
  bulkRegisterUsers: (
    rows: BulkCreateUserItem[],
  ) => Promise<{ ok: true; result: BulkCreateUsersResult } | { ok: false; message: string }>;
  registerActor: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: Role;
    phone?: string;
  }) => Promise<ActionResult>;
  updateProfile: (input: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    tin?: string;
    avatarUrl?: string;
  }) => Promise<ActionResult>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<ActionResult>;
  updateLocale: (locale: Lang) => Promise<ActionResult>;
  /** Re-fetches the signed-in user's own permissions/roles (e.g. after editing a role's
   * permission matrix) so the sidebar and permission-gated pages react without a re-login. */
  refreshPermissions: () => Promise<void>;
}

const LmsContext = createContext<LmsContextValue | null>(null);

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

function hasPermission(user: User | null, code: string): boolean {
  return user?.permissions?.includes(code) ?? false;
}

function questionToApi(q: {
  id: string;
  type: string;
  text: string;
  options: string[];
  correctIndex: number;
  answerText?: string;
}): AssessmentQuestionInput {
  if (q.type === 'short_answer') {
    return {
      id: q.id,
      type: 'SHORT_ANSWER',
      question: q.text,
      options: [],
      correctAnswer: (q.answerText ?? '').trim(),
    };
  }
  return {
    id: q.id,
    type: q.type === 'true_false' ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
    question: q.text,
    options: q.options,
    correctAnswer: q.correctIndex,
  };
}

export const LOCALE_STORAGE_KEY = 'eltms_locale';

export function getStoredLocale(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'am' || stored === 'en') return stored;
  } catch {}
  return 'en';
}

export function persistLocale(locale: Lang): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = locale;
    }
  } catch {}
}

export function LmsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lang, setLangState] = useState<Lang>('en');
  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    persistLocale(nextLang);
  }, []);

  // Synchronize stored language on initial client mount
  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      setLangState(stored);
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = stored;
      }
    }
  }, []);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const currentUserRef = useRef<User | null>(null);
  const coursesRef = useRef<Course[]>([]);
  const usersRef = useRef<User[]>([]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setCurrentUser(null);
    currentUserRef.current = null;
    setUsers([]);
    usersRef.current = [];
    setCourses([]);
    coursesRef.current = [];
    setUserNames({});
  }, []);

  const reloadData = useCallback(async (user?: User | null) => {
    const current = user ?? currentUserRef.current;
    try {
      const list = await fetchCourses({ limit: 100 });
      const details = await Promise.all(list.data.map((course) => fetchCourseDetail(course.id)));

      const names: Record<string, string> = {};
      const mapped = details.map((detail) => {
        for (const owner of detail.owners ?? []) {
          if (owner.user) names[owner.userId] = fullName(owner.user);
        }
        for (const trainer of detail.trainers ?? []) {
          if (trainer.user) names[trainer.userId] = fullName(trainer.user);
        }
        return courseFromDetail(detail);
      });

      let next = mapped;
      if (current?.role === 'learner') {
        try {
          const mine = await fetchMyEnrollments();
          const enrolledCourseIds = new Set(
            mine.data
              .filter(
                (enrollment) => enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED',
              )
              .map((enrollment) => enrollment.courseId),
          );
          next = next.map((course) => ({
            ...course,
            enrolledLearnerIds: enrolledCourseIds.has(course.id) ? [current.id] : [],
          }));
        } catch {
          // learner cannot list course enrollments → keep empty
        }
      } else if (
        current?.role === 'course_owner' ||
        current?.role === 'training_admin' ||
        current?.role === 'system_admin' ||
        current?.role === 'trainer'
      ) {
        const withEnrollments = await Promise.all(
          next.map(async (course) => {
            try {
              const res = await fetchCourseEnrollments(course.id);
              for (const enrollment of res.data) {
                if (enrollment.user) {
                  names[enrollment.userId] = fullName(enrollment.user);
                }
              }
              return {
                ...course,
                enrolledLearnerIds: res.data
                  .filter((enrollment) => enrollment.status === 'ACTIVE')
                  .map((enrollment) => enrollment.userId),
              };
            } catch {
              return course;
            }
          }),
        );
        next = withEnrollments;
      }

      if (current?.role === 'system_admin' || current?.role === 'training_admin') {
        try {
          const res = await fetchUsers({ limit: 100 });
          const mappedUsers = res.data.map(userFromApi);
          for (const user of mappedUsers) names[user.id] = user.name;
          setUsers(mappedUsers);
          usersRef.current = mappedUsers;
        } catch {
          // not permitted → keep the user list empty
        }
      }

      if (current) names[current.id] = current.name;
      setUserNames(names);
      setCourses(next);
      coursesRef.current = next;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // the client already attempted a token refresh; keep the last state
      }
    }
  }, []);

  const enterSession = useCallback(
    async (res: AuthResult): Promise<LoginResult> => {
      setAccessToken(res.accessToken);
      setCurrentUser(res.user);
      currentUserRef.current = res.user;
      setUserNames({ [res.user.id]: res.user.name });
      const storedLocale = getStoredLocale();
      if (storedLocale) {
        setLangState(storedLocale);
        if (res.user.locale && res.user.locale !== storedLocale) {
          void updateMyProfile({ locale: storedLocale }).catch(() => {});
        }
      } else if (res.user.locale === 'am' || res.user.locale === 'en') {
        setLangState(res.user.locale);
        persistLocale(res.user.locale);
      }
      await reloadData(res.user);
      return { ok: true, role: res.user.role };
    },
    [reloadData],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        const res = await apiLogin(email.trim(), password);
        if ('passwordChangeRequired' in res) {
          saveFirstLoginChallenge({ challengeToken: res.challengeToken, email: res.email });
          return {
            ok: false,
            passwordChangeRequired: true,
            message: 'You need to set a new password before continuing.',
          };
        }
        return await enterSession(res);
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Unable to sign in. Please try again.'),
        };
      }
    },
    [enterSession],
  );

  const completeFirstLogin: LmsContextValue['completeFirstLogin'] = useCallback(
    async ({ code, newPassword, confirmPassword }) => {
      const challenge = readFirstLoginChallenge();
      if (!challenge) {
        return {
          ok: false,
          message: 'Your password-change session has expired. Please sign in again.',
        };
      }
      try {
        const res = await apiCompleteFirstLogin({
          challengeToken: challenge.challengeToken,
          code,
          newPassword,
          confirmPassword,
        });
        clearFirstLoginChallenge();
        return await enterSession(res);
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Could not change your password. Please try again.'),
        };
      }
    },
    [enterSession],
  );

  const refreshPermissions = useCallback(async (): Promise<void> => {
    try {
      const res = await apiRefresh();
      setAccessToken(res.accessToken);
      setCurrentUser(res.user);
      currentUserRef.current = res.user;
    } catch {
      // best-effort — keep the existing session if the refresh call fails
    }
  }, []);

  const logout = useCallback(() => {
    void apiLogout();
    clearSession();
  }, [clearSession]);

  const register = useCallback(
    async (input: RegisterInput): Promise<ActionResult> => {
      const firstName = input.firstName.trim();
      const lastName = input.lastName.trim();
      const email = input.email.trim().toLowerCase();
      const phone = input.phone.trim();
      const tin = input.tin?.trim();

      if (!firstName || !lastName || !email || !phone || !input.password) {
        return { ok: false, message: 'Please fill in all required fields.' };
      }
      if (!isValidEmail(email)) {
        return { ok: false, message: 'Please enter a valid email address.' };
      }
      const pwdError = passwordIssues(input.password);
      if (pwdError) return { ok: false, message: pwdError };
      if (input.password !== input.confirmPassword) {
        return { ok: false, message: 'Confirm password must match.' };
      }

      try {
        await apiRegister({
          firstName,
          lastName,
          email,
          phone,
          password: input.password,
          tin: tin || undefined,
        });
        // Public registrations require administrator approval before the
        // account can be used, so we deliberately do NOT create a session.
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Registration failed. Please try again.'),
        };
      }
    },
    [reloadData],
  );

  const createCourse: LmsContextValue['createCourse'] = useCallback(
    async (input) => {
      const owner = currentUserRef.current;
      if (!owner || !hasPermission(owner, 'course.create')) {
        return { ok: false, message: 'You are not allowed to create courses.' };
      }
      let created;
      try {
        created = await apiCreateCourse(
          courseToCreateBody({
            code: input.code,
            title: input.title,
            category: input.category,
            department: input.department,
            targetAudience: input.targetAudience,
            deliveryMethod: input.deliveryMethod,
            language: input.language,
            prerequisites: input.prerequisites,
            objectives: input.objectives,
            description: input.description,
            ownerId: owner.id,
            level: input.level,
          }),
        );

        // Cover image → upload to MinIO; uploadCover persists thumbnailUrl
        // on the course server-side, no follow-up PATCH needed.
        if (input.cover && created.id) {
          try {
            await uploadCover(created.id, input.cover);
          } catch {
            // cover upload is non-fatal
          }
        }

        // Curriculum: create a module per entered module (falls back to a
        // default "Module 1" when the owner left the curriculum empty).
        const modulesToCreate: WizardModuleInput[] =
          input.modules && input.modules.length > 0
            ? input.modules
            : [
                {
                  title: 'Module 1: Introduction',
                  description: 'Course module',
                  objectives: 'Introduction to course concepts',
                  durationMinutes: 35,
                  lessons: [
                    {
                      title: 'Welcome and course overview',
                      content: '',
                      durationMin: 15,
                      subLessons: [],
                    },
                    {
                      title: 'Key concepts and definitions',
                      content: '',
                      durationMin: 20,
                      subLessons: [],
                    },
                  ],
                },
              ];

        for (const mod of modulesToCreate) {
          await createModule(
            created.id,
            moduleToCreateBody({
              titleEn: mod.title,
              descriptionEn: mod.description || 'Course module',
              objectivesEn: mod.objectives,
              durationMinutes: mod.durationMinutes,
              attachments: toAttachmentBodies(
                mod.attachments,
                mod.resources,
                mod.resourceUrl,
                mod.fileName,
                mod.fileSize,
              ),
              lessons: mod.lessons.map((lesson) => ({
                titleEn: lesson.title,
                contentEn: lesson.content,
                durationMinutes: lesson.durationMin,
                contentType: normalizeLessonContentType(lesson.contentType),
                resourceUrl: lesson.resourceUrl,
                attachments: toAttachmentBodies(
                  lesson.attachments,
                  lesson.resources,
                  lesson.resourceUrl,
                  lesson.fileName,
                  lesson.fileSize,
                ),
                subLessons: (lesson.subLessons ?? []).map((sub) => ({
                  titleEn: sub.title,
                  contentEn: sub.content,
                  durationMinutes: sub.durationMin,
                  contentType: normalizeLessonContentType(sub.contentType),
                  resourceUrl: sub.resourceUrl,
                  attachments: toAttachmentBodies(
                    sub.attachments,
                    sub.resources,
                    sub.resourceUrl,
                    sub.fileName,
                    sub.fileSize,
                  ),
                })),
              })),
            }),
          );
        }

        // Course-level materials.
        for (const attachment of input.attachments ?? []) {
          if (!attachment.file) continue;
          try {
            await uploadAttachment(attachment.file, { courseId: created.id });
          } catch {
            // best-effort; attachment upload failures don't abort creation
          }
        }

        // Final assessment (optional).
        if (input.quiz && input.quiz.questions.length > 0) {
          try {
            const quizTitle = input.quiz.title.trim() || 'Final Assessment';
            await createCourseAssessment(created.id, {
              titleEn: quizTitle,
              titleAm: quizTitle,
              passingScore: input.quiz.passMark,
              maxAttempts: input.quiz.attemptsAllowed,
              timeLimitMinutes: input.quiz.timeLimitMinutes,
              questions: input.quiz.questions.map(questionToApi),
            });
          } catch {
            // assessment creation is non-fatal
          }
        }

        await reloadData(owner);
        return { ok: true, courseId: created.id };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to create course.'),
        };
      }
    },
    [reloadData],
  );

  const saveCourseCover: LmsContextValue['saveCourseCover'] = useCallback(
    async (courseId, file) => {
      try {
        await uploadCover(courseId, file);
        await reloadData(currentUserRef.current);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to upload cover.'),
        };
      }
    },
    [reloadData],
  );

  const assignTrainerToCourse: LmsContextValue['assignTrainerToCourse'] = useCallback(
    async (courseId, trainerId) => {
      try {
        await apiAssignTrainer(courseId, trainerId);
        await reloadData(currentUserRef.current);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to assign trainer.'),
        };
      }
    },
    [reloadData],
  );

  const unassignTrainerFromCourse: LmsContextValue['unassignTrainerFromCourse'] = useCallback(
    async (courseId, trainerId) => {
      try {
        await unassignTrainer(courseId, trainerId);
        await reloadData(currentUserRef.current);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to remove trainer.'),
        };
      }
    },
    [reloadData],
  );

  const bulkRegisterUsers: LmsContextValue['bulkRegisterUsers'] = useCallback(
    async (rows) => {
      if (rows.length === 0) {
        return { ok: false, message: 'No users in the file.' };
      }
      try {
        const result = await bulkCreateUsers(
          rows.map((row) => ({
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            tin: row.tin || undefined,
            role: row.role || undefined,
            password: row.password || undefined,
          })),
        );
        await reloadData(currentUserRef.current);
        return { ok: true, result };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to register users.'),
        };
      }
    },
    [reloadData],
  );

  const registerActor: LmsContextValue['registerActor'] = useCallback(
    async (input) => {
      try {
        await createActor({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: input.password,
          role: roleToApi(input.role),
          phone: input.phone || undefined,
        });
        await reloadData(currentUserRef.current);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to register actor.'),
        };
      }
    },
    [reloadData],
  );

  const updateProfile: LmsContextValue['updateProfile'] = useCallback(async (input) => {
    const current = currentUserRef.current;
    if (!current) return { ok: false, message: 'You must be signed in.' };
    try {
      const updated = await updateMyProfile(input);
      const merged: User = {
        ...current,
        firstName: updated.firstName,
        lastName: updated.lastName,
        name: `${updated.firstName} ${updated.lastName}`,
        phone: updated.phone ?? '',
        tin: updated.tin ?? null,
        avatarUrl: updated.avatarUrl ?? current.avatarUrl ?? null,
        locale: updated.locale === 'am' ? 'am' : 'en',
      };
      setCurrentUser(merged);
      currentUserRef.current = merged;
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to update profile.'),
      };
    }
  }, []);

  const changePassword: LmsContextValue['changePassword'] = useCallback(async (input) => {
    try {
      await changeMyPassword(input);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to change password.'),
      };
    }
  }, []);

  const updateLocale: LmsContextValue['updateLocale'] = useCallback(async (locale) => {
    // 1. Immediately apply the language change locally so UI updates with zero latency
    setLangState(locale);
    persistLocale(locale);

    // 2. If user is signed in, sync preference to profile in background
    const current = currentUserRef.current;
    if (current) {
      const merged = { ...current, locale };
      setCurrentUser(merged);
      currentUserRef.current = merged;

      try {
        await updateMyProfile({ locale });
      } catch (err) {
        console.warn('Could not sync language preference to remote profile:', err);
      }
    }

    return { ok: true };
  }, []);

  const updateCourse: LmsContextValue['updateCourse'] = useCallback(
    async (courseId, input) => {
      const owner = currentUserRef.current;
      const course = coursesRef.current.find((item) => item.id === courseId);
      if (!course) return { ok: false, message: 'Course not found.' };
      if (
        !owner ||
        !(hasPermission(owner, 'course.update.own') || hasPermission(owner, 'course.update.all'))
      ) {
        return { ok: false, message: 'You are not allowed to edit this course.' };
      }
      if (course.status !== 'draft' && course.status !== 'rejected') {
        return {
          ok: false,
          message: 'Only draft or rejected courses can be edited.',
        };
      }
      try {
        await apiUpdateCourse(
          courseId,
          courseToUpdateBody({
            title: input.title,
            description: input.description,
          }),
        );
        await reloadData(owner);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to update course.'),
        };
      }
    },
    [reloadData],
  );

  const updateCourseFull: LmsContextValue['updateCourseFull'] = useCallback(
    async (courseId, input) => {
      const owner = currentUserRef.current;
      const course = coursesRef.current.find((item) => item.id === courseId);
      if (!course) return { ok: false, message: 'Course not found.' };
      if (
        !owner ||
        !(hasPermission(owner, 'course.update.own') || hasPermission(owner, 'course.update.all'))
      ) {
        return { ok: false, message: 'You are not allowed to edit this course.' };
      }
      if (course.status !== 'draft' && course.status !== 'rejected') {
        return {
          ok: false,
          message: 'Only draft or rejected courses can be edited.',
        };
      }
      try {
        await apiUpdateCourse(
          courseId,
          courseToUpdateBody({
            title: input.title,
            category: input.category,
            department: input.department,
            targetAudience: input.targetAudience,
            deliveryMethod: input.deliveryMethod,
            language: input.language,
            prerequisites: input.prerequisites,
            objectives: input.objectives,
            description: input.description,
            level: input.level,
          }),
        );

        if (input.cover) {
          try {
            // uploadCover persists thumbnailUrl on the course server-side;
            // no follow-up PATCH needed.
            await uploadCover(courseId, input.cover);
          } catch {
            // cover upload is non-fatal
          }
        }

        const modulesToReplace: WizardModuleInput[] =
          input.modules && input.modules.length > 0
            ? input.modules
            : [
                {
                  title: 'Module 1: Introduction',
                  description: 'Course module',
                  objectives: 'Introduction to course concepts',
                  durationMinutes: 35,
                  lessons: [
                    {
                      title: 'Welcome and course overview',
                      content: '',
                      durationMin: 15,
                      subLessons: [],
                    },
                    {
                      title: 'Key concepts and definitions',
                      content: '',
                      durationMin: 20,
                      subLessons: [],
                    },
                  ],
                },
              ];

        await replaceCurriculum(
          courseId,
          modulesToReplace.map((mod) =>
            moduleToCreateBody({
              titleEn: mod.title,
              descriptionEn: mod.description || 'Course module',
              objectivesEn: mod.objectives,
              durationMinutes: mod.durationMinutes,
              attachments: toAttachmentBodies(
                mod.attachments,
                mod.resources,
                mod.resourceUrl,
                mod.fileName,
                mod.fileSize,
              ),
              lessons: mod.lessons.map((lesson) => ({
                titleEn: lesson.title,
                contentEn: lesson.content,
                durationMinutes: lesson.durationMin,
                contentType: normalizeLessonContentType(lesson.contentType),
                resourceUrl: lesson.resourceUrl,
                attachments: toAttachmentBodies(
                  lesson.attachments,
                  lesson.resources,
                  lesson.resourceUrl,
                  lesson.fileName,
                  lesson.fileSize,
                ),
                subLessons: (lesson.subLessons ?? []).map((sub) => ({
                  titleEn: sub.title,
                  contentEn: sub.content,
                  durationMinutes: sub.durationMin,
                  contentType: normalizeLessonContentType(sub.contentType),
                  resourceUrl: sub.resourceUrl,
                  attachments: toAttachmentBodies(
                    sub.attachments,
                    sub.resources,
                    sub.resourceUrl,
                    sub.fileName,
                    sub.fileSize,
                  ),
                })),
              })),
            }),
          ),
        );

        // Newly attached course materials (existing rows are left untouched).
        for (const attachment of input.attachments ?? []) {
          if (!attachment.file) continue;
          try {
            await uploadAttachment(attachment.file, { courseId });
          } catch {
            // best-effort
          }
        }

        const quiz = input.quiz;
        if (quiz && quiz.questions.length > 0) {
          try {
            const quizTitle = quiz.title.trim() || 'Final Assessment';
            await replaceAssessment(courseId, {
              titleEn: quizTitle,
              titleAm: quizTitle,
              passingScore: quiz.passMark,
              maxAttempts: quiz.attemptsAllowed,
              timeLimitMinutes: quiz.timeLimitMinutes,
              questions: quiz.questions.map(questionToApi),
            });
          } catch {
            // assessment replacement is non-fatal
          }
        }

        await reloadData(owner);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to update course.'),
        };
      }
    },
    [reloadData],
  );

  const submitForApproval = useCallback(
    async (courseId: string): Promise<ActionResult> => {
      const owner = currentUserRef.current;
      try {
        await requestApproval(courseId);
        await reloadData(owner);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to submit course.'),
        };
      }
    },
    [reloadData],
  );

  const approveCourse = useCallback(
    async (courseId: string): Promise<ActionResult> => {
      const approver = currentUserRef.current;
      try {
        await reviewCourse(courseId, { status: 'APPROVED' });
        await reloadData(approver);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to approve course.'),
        };
      }
    },
    [reloadData],
  );

  const rejectCourse = useCallback(
    async (courseId: string, reason: string): Promise<ActionResult> => {
      const approver = currentUserRef.current;
      const trimmed = reason.trim();
      if (!trimmed) {
        return { ok: false, message: 'A rejection reason is required.' };
      }
      try {
        await reviewCourse(courseId, { status: 'REJECTED', comments: trimmed });
        await reloadData(approver);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to reject course.'),
        };
      }
    },
    [reloadData],
  );

  const requestChangesCourse = useCallback(
    async (courseId: string, reason: string): Promise<ActionResult> => {
      const approver = currentUserRef.current;
      const trimmed = reason.trim();
      if (!trimmed) {
        return { ok: false, message: 'A reason is required when requesting changes.' };
      }
      try {
        await reviewCourse(courseId, { status: 'NEEDS_REVISION', comments: trimmed });
        await reloadData(approver);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to request changes on course.'),
        };
      }
    },
    [reloadData],
  );

  const publishCourse = useCallback(
    async (courseId: string): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      try {
        await apiPublishCourse(courseId);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to publish course.'),
        };
      }
    },
    [reloadData],
  );

  const unpublishCourse = useCallback(
    async (courseId: string): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      try {
        await apiUnpublishCourse(courseId);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to unpublish course.'),
        };
      }
    },
    [reloadData],
  );

  const archiveCourse = useCallback(
    async (courseId: string): Promise<ActionResult> => {
      const actor = currentUserRef.current;
      try {
        await apiArchiveCourse(courseId);
        await reloadData(actor);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to archive course.'),
        };
      }
    },
    [reloadData],
  );

  const deleteCourse = useCallback(
    async (courseId: string): Promise<ActionResult> => {
      const owner = currentUserRef.current;
      try {
        await apiDeleteCourse(courseId);
        await reloadData(owner);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to delete course.'),
        };
      }
    },
    [reloadData],
  );

  const enrollLearners = useCallback(
    async (courseId: string, learnerIds: string[]): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (!admin || !hasPermission(admin, 'student.manage')) {
        return {
          ok: false,
          message: 'Only training administrators can enroll learners.',
        };
      }
      try {
        await bulkEnroll(courseId, learnerIds);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to enroll learners.'),
        };
      }
    },
    [reloadData],
  );

  const enrollSelf = useCallback(
    async (courseId: string): Promise<ActionResult> => {
      const learner = currentUserRef.current;
      if (!learner || !hasPermission(learner, 'enrollment.self')) {
        return { ok: false, message: 'Only learners can self-enroll.' };
      }
      try {
        await selfEnroll(courseId);
      } catch (err) {
        const message = errorMessage(
          err,
          'Enrollment failed. The course may no longer be available.',
        );
        // The backend may say "already enrolled" even though our local
        // enrollment list is stale/out of sync — that's still the outcome
        // the learner wants, so settle into the enrolled state instead of
        // surfacing it as a failure.
        if (!/already enrolled/i.test(message)) {
          return { ok: false, message };
        }
      }
      // Reflect the enrolled state immediately rather than waiting on a
      // full reloadData() round trip to update the button.
      setCourses((prev) =>
        prev.map((course) =>
          course.id === courseId && !course.enrolledLearnerIds.includes(learner.id)
            ? { ...course, enrolledLearnerIds: [...course.enrolledLearnerIds, learner.id] }
            : course,
        ),
      );
      await reloadData(learner);
      return { ok: true };
    },
    [reloadData],
  );

  const changeUserRole = useCallback(
    async (userId: string, role: Role): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (!admin || !hasPermission(admin, 'role.manage')) {
        return {
          ok: false,
          message: 'Only system administrators can change roles.',
        };
      }
      const user = usersRef.current.find((item) => item.id === userId);
      if (!user) return { ok: false, message: 'User not found.' };
      if (user.role === role) return { ok: true };
      try {
        await assignRole(userId, roleToApi(role));
        if (user.role !== role) {
          try {
            await removeRole(userId, roleToApi(user.role));
          } catch {
            // the previous role may already be revoked by the API
          }
        }
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to change role.'),
        };
      }
    },
    [reloadData],
  );

  const approveRegistrationRequest = useCallback(
    async (userId: string): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (!admin || !hasPermission(admin, 'user.manage')) {
        return {
          ok: false,
          message: 'Only system administrators can manage registrations.',
        };
      }
      try {
        await approveRegistration(userId);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to approve registration.'),
        };
      }
    },
    [reloadData],
  );

  const rejectRegistrationRequest = useCallback(
    async (userId: string, reason?: string): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (!admin || !hasPermission(admin, 'user.manage')) {
        return {
          ok: false,
          message: 'Only system administrators can manage registrations.',
        };
      }
      try {
        await rejectRegistration(userId, reason);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to reject registration.'),
        };
      }
    },
    [reloadData],
  );

  const deactivateUser = useCallback(
    async (userId: string): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (!admin || !hasPermission(admin, 'user.manage')) {
        return { ok: false, message: 'You are not allowed to manage users.' };
      }
      try {
        await apiDeactivateUser(userId);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to deactivate user.'),
        };
      }
    },
    [reloadData],
  );

  const reactivateUser = useCallback(
    async (userId: string): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (!admin || !hasPermission(admin, 'user.manage')) {
        return { ok: false, message: 'You are not allowed to manage users.' };
      }
      try {
        await apiReactivateUser(userId);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to reactivate user.'),
        };
      }
    },
    [reloadData],
  );

  const deleteUser = useCallback(
    async (userId: string): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (!admin || !hasPermission(admin, 'user.manage')) {
        return { ok: false, message: 'You are not allowed to manage users.' };
      }
      try {
        await apiDeleteUser(userId);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to delete user.'),
        };
      }
    },
    [reloadData],
  );

  const bulkUserAction: LmsContextValue['bulkUserAction'] = useCallback(
    async (action, userIds) => {
      const admin = currentUserRef.current;
      if (!admin || !hasPermission(admin, 'user.manage')) {
        return { ok: false, message: 'You are not allowed to manage users.' };
      }
      const run = action === 'suspend' ? apiDeactivateUser : apiDeleteUser;
      const failed: string[] = [];
      // A few requests at a time so a large selection doesn't flood the API.
      for (let i = 0; i < userIds.length; i += 5) {
        const batch = userIds.slice(i, i + 5);
        const results = await Promise.allSettled(batch.map((id) => run(id)));
        results.forEach((result, index) => {
          if (result.status === 'rejected') failed.push(batch[index]);
        });
      }
      await reloadData(admin);
      return { ok: true, succeeded: userIds.length - failed.length, failed };
    },
    [reloadData],
  );

  const courseById = useCallback(
    (courseId: string) => courses.find((course) => course.id === courseId),
    [courses],
  );

  const userName = useCallback((userId: string) => userNames[userId] ?? 'Unknown', [userNames]);

  useEffect(() => {
    let cancelled = false;

    setAccessToken(getStoredAccessToken());
    setRefreshHandler(async () => {
      try {
        const res = await apiRefresh();
        setAccessToken(res.accessToken);
        if (!cancelled) {
          currentUserRef.current = res.user;
          setCurrentUser(res.user);
        }
        return res.accessToken;
      } catch {
        return null;
      }
    });
    setUnauthorizedHandler(() => {
      clearTokens();
      clearSession();
    });

    (async () => {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const res = await apiRefresh();
          if (cancelled) return;
          setAccessToken(res.accessToken);
          currentUserRef.current = res.user;
          setCurrentUser(res.user);
          await reloadData(res.user);
        } catch {
          if (!cancelled) {
            clearTokens();
            clearSession();
          }
        }
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession, reloadData]);

  // Live permission sync: whenever permissions change or every ~10s, sync current user permissions
  useEffect(() => {
    if (!currentUser) return;

    const timer = setInterval(() => {
      void refreshPermissions();
    }, 10000);

    const handlePermissionsEvent = () => {
      void refreshPermissions();
    };

    window.addEventListener('mor_permissions_updated', handlePermissionsEvent);
    window.addEventListener('storage', handlePermissionsEvent);
    window.addEventListener('focus', handlePermissionsEvent);

    return () => {
      clearInterval(timer);
      window.removeEventListener('mor_permissions_updated', handlePermissionsEvent);
      window.removeEventListener('storage', handlePermissionsEvent);
      window.removeEventListener('focus', handlePermissionsEvent);
    };
  }, [currentUser, refreshPermissions]);

  const value = useMemo<LmsContextValue>(
    () => ({
      ready,
      courses,
      users,
      lang,
      currentUser,
      setLang,
      login,
      completeFirstLogin,
      logout,
      register,
      courseById,
      userName,
      createCourse,
      updateCourse,
      updateCourseFull,
      saveCourseCover,
      assignTrainerToCourse,
      unassignTrainerFromCourse,
      submitForApproval,
      approveCourse,
      rejectCourse,
      requestChangesCourse,
      publishCourse,
      unpublishCourse,
      archiveCourse,
      deleteCourse,
      enrollLearners,
      enrollSelf,
      changeUserRole,
      approveRegistrationRequest,
      rejectRegistrationRequest,
      deactivateUser,
      reactivateUser,
      deleteUser,
      bulkUserAction,
      bulkRegisterUsers,
      registerActor,
      updateProfile,
      changePassword,
      updateLocale,
      refreshPermissions,
    }),
    [
      ready,
      courses,
      users,
      lang,
      currentUser,
      login,
      completeFirstLogin,
      logout,
      register,
      courseById,
      userName,
      createCourse,
      updateCourse,
      updateCourseFull,
      saveCourseCover,
      assignTrainerToCourse,
      unassignTrainerFromCourse,
      submitForApproval,
      approveCourse,
      rejectCourse,
      requestChangesCourse,
      publishCourse,
      unpublishCourse,
      archiveCourse,
      deleteCourse,
      enrollLearners,
      enrollSelf,
      changeUserRole,
      approveRegistrationRequest,
      rejectRegistrationRequest,
      deactivateUser,
      reactivateUser,
      deleteUser,
      bulkUserAction,
      bulkRegisterUsers,
      registerActor,
      updateProfile,
      changePassword,
      updateLocale,
      refreshPermissions,
    ],
  );

  return <LmsContext.Provider value={value}>{children}</LmsContext.Provider>;
}

export function useLms(): LmsContextValue {
  const context = useContext(LmsContext);
  if (!context) {
    throw new Error('useLms must be used within an LmsProvider');
  }
  return context;
}
