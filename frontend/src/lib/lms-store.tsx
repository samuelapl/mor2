'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';

import type { ApiEnrollment, ApiModule, BulkCreateUserItem } from '@/lib/api/types';
import { useAuthStore, type RegisterInput, type RegisterResult } from '@/lib/stores/auth-store';
import { useCourseStore, type CreateCourseInput, type UpdateCourseFullInput } from '@/lib/stores/course-store';
import { useEnrollmentStore, type EnrollSelfOptions } from '@/lib/stores/enrollment-store';
import {
  useUserStore,
  type BulkRegisterUsersResult,
  type BulkUserActionResult,
  type RegisterActorInput,
} from '@/lib/stores/user-store';
import type { ActionResult, Course, Lang, LoginResult, Role, User } from '@/types';

export type { SessionPlanInput, WizardLessonInput, WizardModuleInput } from '@/lib/stores/course-sync';
export { LOCALE_STORAGE_KEY, getStoredLocale, persistLocale } from '@/lib/stores/auth-store';

/**
 * Transitional facade over the Zustand stores in `lib/stores/` (see ZUSTAND_MIGRATION_PLAN.md).
 * `useLms()` keeps its old shape so existing consumers work unchanged; new code should
 * select from the stores directly. Removed in Phase 5.
 */
interface LmsContextValue {
  ready: boolean;
  courses: Course[];
  users: User[];
  lang: Lang;
  currentUser: User | null;
  setLang: (lang: Lang) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Finishes the forced password change of an admin-created account and signs it in. */
  completeFirstLogin: (input: { code: string; newPassword: string; confirmPassword: string }) => Promise<LoginResult>;
  /** Verifies a self-registered account with its emailed code and signs it in. */
  verifyEmail: (email: string, code: string) => Promise<LoginResult>;
  logout: () => void;
  /** Creates the account; the user then verifies their email before signing in. */
  register: (input: RegisterInput) => Promise<RegisterResult>;
  courseById: (courseId: string) => Course | undefined;
  /** Re-fetches one course (e.g. after its sessions changed) and replaces it in the store. */
  refreshCourse: (courseId: string) => Promise<void>;
  userName: (userId: string) => string;
  createCourse: (input: CreateCourseInput) => Promise<ActionResult & { courseId?: string; savedModules?: ApiModule[] }>;
  updateCourse: (courseId: string, input: { title: string; category: string; description: string }) => Promise<ActionResult>;
  updateCourseFull: (courseId: string, input: UpdateCourseFullInput) => Promise<ActionResult & { savedModules?: ApiModule[] }>;
  saveCourseCover: (courseId: string, file: File) => Promise<ActionResult>;
  assignTrainerToCourse: (courseId: string, trainerId: string) => Promise<ActionResult>;
  unassignTrainerFromCourse: (courseId: string, trainerId: string) => Promise<ActionResult>;
  submitForApproval: (courseId: string) => Promise<ActionResult>;
  approveCourse: (courseId: string) => Promise<ActionResult>;
  rejectCourse: (courseId: string, reason: string) => Promise<ActionResult>;
  requestChangesCourse: (courseId: string, reason: string) => Promise<ActionResult>;
  /** Approver withdraws an approval: approved (unpublished) course → draft. */
  returnCourseToDraft: (courseId: string, reason: string) => Promise<ActionResult>;
  publishCourse: (courseId: string) => Promise<ActionResult>;
  unpublishCourse: (courseId: string) => Promise<ActionResult>;
  archiveCourse: (courseId: string) => Promise<ActionResult>;
  deleteCourse: (courseId: string) => Promise<ActionResult & { affectedLearners?: number }>;
  enrollLearners: (courseId: string, learnerIds: string[]) => Promise<ActionResult>;
  enrollSelf: (courseId: string, options?: EnrollSelfOptions) => Promise<ActionResult>;
  myEnrollments: ApiEnrollment[];
  getEnrollmentForCourse: (courseId: string) => ApiEnrollment | undefined;
  changeUserRole: (userId: string, role: Role) => Promise<ActionResult>;
  deactivateUser: (userId: string) => Promise<ActionResult>;
  reactivateUser: (userId: string) => Promise<ActionResult>;
  deleteUser: (userId: string) => Promise<ActionResult>;
  /** Suspends or deletes several users, reloading once. Failures are reported per user. */
  bulkUserAction: (action: 'suspend' | 'delete', userIds: string[]) => Promise<BulkUserActionResult>;
  bulkRegisterUsers: (rows: BulkCreateUserItem[]) => Promise<BulkRegisterUsersResult>;
  registerActor: (input: RegisterActorInput) => Promise<ActionResult>;
  registerUser: (input: RegisterActorInput) => Promise<ActionResult>;
  updateProfile: (input: { firstName?: string; lastName?: string; phone?: string; tin?: string; avatarUrl?: string }) => Promise<ActionResult>;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<ActionResult>;
  updateLocale: (locale: Lang) => Promise<ActionResult>;
  /** Re-fetches the signed-in user's own permissions/roles (e.g. after editing a role's
   * permission matrix) so the sidebar and permission-gated pages react without a re-login. */
  refreshPermissions: () => Promise<void>;
}

const LmsContext = createContext<LmsContextValue | null>(null);

export function LmsProvider({ children }: { children: ReactNode }) {
  const ready = useAuthStore((s) => s.ready);
  const lang = useAuthStore((s) => s.lang);
  const currentUser = useAuthStore((s) => s.currentUser);
  const setLang = useAuthStore((s) => s.setLang);
  const login = useAuthStore((s) => s.login);
  const completeFirstLogin = useAuthStore((s) => s.completeFirstLogin);
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const logout = useAuthStore((s) => s.logout);
  const register = useAuthStore((s) => s.register);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);
  const updateLocale = useAuthStore((s) => s.updateLocale);
  const refreshPermissions = useAuthStore((s) => s.refreshPermissions);

  const users = useUserStore((s) => s.users);
  const userNames = useUserStore((s) => s.userNames);
  const changeUserRole = useUserStore((s) => s.changeUserRole);
  const deactivateUser = useUserStore((s) => s.deactivateUser);
  const reactivateUser = useUserStore((s) => s.reactivateUser);
  const deleteUser = useUserStore((s) => s.deleteUser);
  const bulkUserAction = useUserStore((s) => s.bulkUserAction);
  const bulkRegisterUsers = useUserStore((s) => s.bulkRegisterUsers);
  const registerActor = useUserStore((s) => s.registerActor);

  const myEnrollments = useEnrollmentStore((s) => s.myEnrollments);
  const enrollLearners = useEnrollmentStore((s) => s.enrollLearners);
  const enrollSelf = useEnrollmentStore((s) => s.enrollSelf);

  const courses = useCourseStore((s) => s.courses);
  const createCourse = useCourseStore((s) => s.createCourse);
  const updateCourse = useCourseStore((s) => s.updateCourse);
  const updateCourseFull = useCourseStore((s) => s.updateCourseFull);
  const saveCourseCover = useCourseStore((s) => s.saveCourseCover);
  const assignTrainerToCourse = useCourseStore((s) => s.assignTrainerToCourse);
  const unassignTrainerFromCourse = useCourseStore((s) => s.unassignTrainerFromCourse);
  const submitForApproval = useCourseStore((s) => s.submitForApproval);
  const approveCourse = useCourseStore((s) => s.approveCourse);
  const rejectCourse = useCourseStore((s) => s.rejectCourse);
  const requestChangesCourse = useCourseStore((s) => s.requestChangesCourse);
  const returnCourseToDraft = useCourseStore((s) => s.returnCourseToDraft);
  const publishCourse = useCourseStore((s) => s.publishCourse);
  const unpublishCourse = useCourseStore((s) => s.unpublishCourse);
  const archiveCourse = useCourseStore((s) => s.archiveCourse);
  const deleteCourse = useCourseStore((s) => s.deleteCourse);
  const refreshCourse = useCourseStore((s) => s.refreshCourse);

  // Lookups derived from subscribed state so `useLms()` consumers re-render when it changes.
  const courseById = useCallback((courseId: string) => courses.find((course) => course.id === courseId), [courses]);
  const userName = useCallback((userId: string) => userNames[userId] ?? 'Unknown', [userNames]);
  const getEnrollmentForCourse = useCallback((courseId: string) => myEnrollments.find((e) => e.courseId === courseId), [myEnrollments]);

  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

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
      verifyEmail,
      logout,
      register,
      courseById,
      refreshCourse,
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
      returnCourseToDraft,
      publishCourse,
      unpublishCourse,
      archiveCourse,
      deleteCourse,
      enrollLearners,
      enrollSelf,
      myEnrollments,
      getEnrollmentForCourse,
      changeUserRole,
      deactivateUser,
      reactivateUser,
      deleteUser,
      bulkUserAction,
      bulkRegisterUsers,
      registerActor,
      registerUser: registerActor,
      updateProfile,
      changePassword,
      updateLocale,
      refreshPermissions,
    }),
    [
      ready,
      courses,
      users,
      myEnrollments,
      getEnrollmentForCourse,
      lang,
      currentUser,
      login,
      completeFirstLogin,
      verifyEmail,
      logout,
      register,
      courseById,
      refreshCourse,
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
      returnCourseToDraft,
      publishCourse,
      unpublishCourse,
      archiveCourse,
      deleteCourse,
      enrollLearners,
      enrollSelf,
      changeUserRole,
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
