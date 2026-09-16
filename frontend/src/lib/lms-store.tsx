"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isValidEmail, passwordIssues } from "@/constants/auth";
import {
  ApiError,
  setAccessToken,
  setRefreshHandler,
  setUnauthorizedHandler,
} from "@/lib/api/client";
import {
  login as apiLogin,
  logout as apiLogout,
  refresh as apiRefresh,
  register as apiRegister,
} from "@/lib/api/auth";
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
} from "@/lib/api/courses";
import {
  bulkEnroll,
  fetchCourseEnrollments,
  fetchMyEnrollments,
  selfEnroll,
} from "@/lib/api/enrollments";
import {
  approveRegistration,
  assignRole,
  bulkCreateUsers,
  fetchUsers,
  rejectRegistration,
  removeRole,
} from "@/lib/api/users";
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  clearTokens,
} from "@/lib/api/tokens";
import {
  assignTrainer as apiAssignTrainer,
  unassignTrainer,
  deleteCourse as apiDeleteCourse,
} from "@/lib/api/courses";
import { uploadAttachment, uploadCover } from "@/lib/api/files";
import { createCourseAssessment, replaceAssessment } from "@/lib/api/quiz";
import type { AssessmentQuestionInput } from "@/lib/api/quiz";
import {
  courseFromDetail,
  courseToCreateBody,
  courseToUpdateBody,
  moduleToCreateBody,
  roleToApi,
  userFromApi,
} from "@/lib/api/transform";
import type {
  ActionResult,
  Attachment,
  Course,
  CourseLevel,
  Lang,
  LoginResult,
  Quiz,
  Role,
  User,
} from "@/types";

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
  subLessons?: WizardLessonInput[];
}

export interface WizardModuleInput {
  title: string;
  description?: string;
  objectives?: string;
  durationMinutes?: number;
  lessons: WizardLessonInput[];
}

interface LmsContextValue {
  ready: boolean;
  courses: Course[];
  users: User[];
  lang: Lang;
  currentUser: User | null;
  setLang: (lang: Lang) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
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
  assignTrainerToCourse: (
    courseId: string,
    trainerId: string,
  ) => Promise<ActionResult>;
  unassignTrainerFromCourse: (
    courseId: string,
    trainerId: string,
  ) => Promise<ActionResult>;
  submitForApproval: (courseId: string) => Promise<ActionResult>;
  approveCourse: (courseId: string) => Promise<ActionResult>;
  rejectCourse: (courseId: string, reason: string) => Promise<ActionResult>;
  requestChangesCourse: (courseId: string, reason: string) => Promise<ActionResult>;
  publishCourse: (courseId: string) => Promise<ActionResult>;
  unpublishCourse: (courseId: string) => Promise<ActionResult>;
  deleteCourse: (courseId: string) => Promise<ActionResult>;
  enrollLearners: (
    courseId: string,
    learnerIds: string[],
  ) => Promise<ActionResult>;
  enrollSelf: (courseId: string) => Promise<ActionResult>;
  changeUserRole: (userId: string, role: Role) => Promise<ActionResult>;
  approveRegistrationRequest: (userId: string) => Promise<ActionResult>;
  rejectRegistrationRequest: (
    userId: string,
    reason?: string,
  ) => Promise<ActionResult>;
  bulkRegisterUsers: (
    rows: Array<{
      firstName: string;
      lastName: string;
      email: string;
      role?: Role;
      password?: string;
    }>,
  ) => Promise<ActionResult>;
}

const LmsContext = createContext<LmsContextValue | null>(null);

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

function questionToApi(q: {
  id: string;
  type: string;
  text: string;
  options: string[];
  correctIndex: number;
  answerText?: string;
}): AssessmentQuestionInput {
  if (q.type === "short_answer") {
    return {
      id: q.id,
      type: "SHORT_ANSWER",
      question: q.text,
      options: [],
      correctAnswer: (q.answerText ?? "").trim(),
    };
  }
  return {
    id: q.id,
    type: q.type === "true_false" ? "TRUE_FALSE" : "MULTIPLE_CHOICE",
    question: q.text,
    options: q.options,
    correctAnswer: q.correctIndex,
  };
}

export function LmsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lang, setLang] = useState<Lang>("en");
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
      const details = await Promise.all(
        list.data.map((course) => fetchCourseDetail(course.id)),
      );

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
      if (current?.role === "learner") {
        try {
          const mine = await fetchMyEnrollments();
          const enrolledCourseIds = new Set(
            mine.data
              .filter((enrollment) => enrollment.status === "ACTIVE")
              .map((enrollment) => enrollment.courseId),
          );
          next = next.map((course) => ({
            ...course,
            enrolledLearnerIds: enrolledCourseIds.has(course.id)
              ? [current.id]
              : [],
          }));
        } catch {
          // learner cannot list course enrollments → keep empty
        }
      } else if (
        current?.role === "course_owner" ||
        current?.role === "training_admin" ||
        current?.role === "system_admin" ||
        current?.role === "trainer"
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
                  .filter((enrollment) => enrollment.status === "ACTIVE")
                  .map((enrollment) => enrollment.userId),
              };
            } catch {
              return course;
            }
          }),
        );
        next = withEnrollments;
      }

      if (
        current?.role === "system_admin" ||
        current?.role === "training_admin"
      ) {
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

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        const res = await apiLogin(email.trim(), password);
        setAccessToken(res.accessToken);
        setCurrentUser(res.user);
        currentUserRef.current = res.user;
        setUserNames({ [res.user.id]: res.user.name });
        await reloadData(res.user);
        return { ok: true, role: res.user.role };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, "Unable to sign in. Please try again."),
        };
      }
    },
    [reloadData],
  );

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

      if (
        !firstName ||
        !lastName ||
        !email ||
        !phone ||
        !input.password
      ) {
        return { ok: false, message: "Please fill in all required fields." };
      }
      if (!isValidEmail(email)) {
        return { ok: false, message: "Please enter a valid email address." };
      }
      const pwdError = passwordIssues(input.password);
      if (pwdError) return { ok: false, message: pwdError };
      if (input.password !== input.confirmPassword) {
        return { ok: false, message: "Confirm password must match." };
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
          message: errorMessage(err, "Registration failed. Please try again."),
        };
      }
    },
    [reloadData],
  );

  const createCourse: LmsContextValue["createCourse"] = useCallback(
    async (input) => {
      const owner = currentUserRef.current;
      if (
        !owner ||
        !["course_owner", "training_admin", "system_admin"].includes(owner.role)
      ) {
        return { ok: false, message: "You are not allowed to create courses." };
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
                  title: "Module 1: Introduction",
                  description: "Course module",
                  objectives: "Introduction to course concepts",
                  durationMinutes: 35,
                  lessons: [
                    {
                      title: "Welcome and course overview",
                      content: "",
                      durationMin: 15,
                      subLessons: [],
                    },
                    {
                      title: "Key concepts and definitions",
                      content: "",
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
              descriptionEn: mod.description || "Course module",
              objectivesEn: mod.objectives,
              durationMinutes: mod.durationMinutes,
              lessons: mod.lessons.map((lesson) => ({
                titleEn: lesson.title,
                contentEn: lesson.content,
                durationMinutes: lesson.durationMin,
                contentType: (lesson.contentType as any) || "DOCUMENT",
                resourceUrl: lesson.resourceUrl,
                subLessons: (lesson.subLessons ?? []).map((sub) => ({
                  titleEn: sub.title,
                  contentEn: sub.content,
                  durationMinutes: sub.durationMin,
                  contentType: (sub.contentType as any) || "DOCUMENT",
                  resourceUrl: sub.resourceUrl,
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
            const quizTitle = input.quiz.title.trim() || "Final Assessment";
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
          message: errorMessage(err, "Failed to create course."),
        };
      }
    },
    [reloadData],
  );

  const saveCourseCover: LmsContextValue["saveCourseCover"] = useCallback(
    async (courseId, file) => {
      try {
        await uploadCover(courseId, file);
        await reloadData(currentUserRef.current);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, "Failed to upload cover."),
        };
      }
    },
    [reloadData],
  );

  const assignTrainerToCourse: LmsContextValue["assignTrainerToCourse"] =
    useCallback(
      async (courseId, trainerId) => {
        try {
          await apiAssignTrainer(courseId, trainerId);
          await reloadData(currentUserRef.current);
          return { ok: true };
        } catch (err) {
          return {
            ok: false,
            message: errorMessage(err, "Failed to assign trainer."),
          };
        }
      },
      [reloadData],
    );

  const unassignTrainerFromCourse: LmsContextValue["unassignTrainerFromCourse"] =
    useCallback(
      async (courseId, trainerId) => {
        try {
          await unassignTrainer(courseId, trainerId);
          await reloadData(currentUserRef.current);
          return { ok: true };
        } catch (err) {
          return {
            ok: false,
            message: errorMessage(err, "Failed to remove trainer."),
          };
        }
      },
      [reloadData],
    );

  const bulkRegisterUsers: LmsContextValue["bulkRegisterUsers"] = useCallback(
    async (rows) => {
      if (rows.length === 0) {
        return { ok: false, message: "No users in the file." };
      }
      try {
        await bulkCreateUsers(
          rows.map((row) => ({
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            role: roleToApi(row.role ?? "learner"),
            password: row.password || undefined,
          })),
        );
        await reloadData(currentUserRef.current);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, "Failed to register users."),
        };
      }
    },
    [reloadData],
  );

  const updateCourse: LmsContextValue["updateCourse"] = useCallback(
    async (courseId, input) => {
      const owner = currentUserRef.current;
      const course = coursesRef.current.find((item) => item.id === courseId);
      if (!course) return { ok: false, message: "Course not found." };
      if (!owner || owner.role !== "course_owner") {
        return { ok: false, message: "You can only edit your own courses." };
      }
      if (course.status !== "draft" && course.status !== "rejected") {
        return {
          ok: false,
          message: "Only draft or rejected courses can be edited.",
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
          message: errorMessage(err, "Failed to update course."),
        };
      }
    },
    [reloadData],
  );

  const updateCourseFull: LmsContextValue["updateCourseFull"] = useCallback(
    async (courseId, input) => {
      const owner = currentUserRef.current;
      const course = coursesRef.current.find((item) => item.id === courseId);
      if (!course) return { ok: false, message: "Course not found." };
      if (!owner || owner.role !== "course_owner") {
        return { ok: false, message: "You can only edit your own courses." };
      }
      if (course.status !== "draft" && course.status !== "rejected") {
        return {
          ok: false,
          message: "Only draft or rejected courses can be edited.",
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
                  title: "Module 1: Introduction",
                  description: "Course module",
                  objectives: "Introduction to course concepts",
                  durationMinutes: 35,
                  lessons: [
                    {
                      title: "Welcome and course overview",
                      content: "",
                      durationMin: 15,
                      subLessons: [],
                    },
                    {
                      title: "Key concepts and definitions",
                      content: "",
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
              descriptionEn: mod.description || "Course module",
              objectivesEn: mod.objectives,
              durationMinutes: mod.durationMinutes,
              lessons: mod.lessons.map((lesson) => ({
                titleEn: lesson.title,
                contentEn: lesson.content,
                durationMinutes: lesson.durationMin,
                contentType: (lesson.contentType as any) || "DOCUMENT",
                resourceUrl: lesson.resourceUrl,
                subLessons: (lesson.subLessons ?? []).map((sub) => ({
                  titleEn: sub.title,
                  contentEn: sub.content,
                  durationMinutes: sub.durationMin,
                  contentType: (sub.contentType as any) || "DOCUMENT",
                  resourceUrl: sub.resourceUrl,
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
            const quizTitle = quiz.title.trim() || "Final Assessment";
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
          message: errorMessage(err, "Failed to update course."),
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
          message: errorMessage(err, "Failed to submit course."),
        };
      }
    },
    [reloadData],
  );

  const approveCourse = useCallback(
    async (courseId: string): Promise<ActionResult> => {
      const approver = currentUserRef.current;
      try {
        await reviewCourse(courseId, { status: "APPROVED" });
        await reloadData(approver);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, "Failed to approve course."),
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
        return { ok: false, message: "A rejection reason is required." };
      }
      try {
        await reviewCourse(courseId, { status: "REJECTED", comments: trimmed });
        await reloadData(approver);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, "Failed to reject course."),
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
        return { ok: false, message: "A reason is required when requesting changes." };
      }
      try {
        await reviewCourse(courseId, { status: "NEEDS_REVISION", comments: trimmed });
        await reloadData(approver);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, "Failed to request changes on course."),
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
          message: errorMessage(err, "Failed to publish course."),
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
          message: errorMessage(err, "Failed to unpublish course."),
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
          message: errorMessage(err, "Failed to delete course."),
        };
      }
    },
    [reloadData],
  );

  const enrollLearners = useCallback(
    async (courseId: string, learnerIds: string[]): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (
        !admin ||
        (admin.role !== "training_admin" && admin.role !== "system_admin")
      ) {
        return {
          ok: false,
          message: "Only training administrators can enroll learners.",
        };
      }
      try {
        const res = await bulkEnroll(courseId, learnerIds);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, "Failed to enroll learners."),
        };
      }
    },
    [reloadData],
  );

  const enrollSelf = useCallback(
    async (courseId: string): Promise<ActionResult> => {
      const learner = currentUserRef.current;
      if (!learner || learner.role !== "learner") {
        return { ok: false, message: "Only learners can self-enroll." };
      }
      try {
        await selfEnroll(courseId);
      } catch (err) {
        const message = errorMessage(
          err,
          "Enrollment failed. The course may no longer be available.",
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
      if (!admin || admin.role !== "system_admin") {
        return {
          ok: false,
          message: "Only system administrators can change roles.",
        };
      }
      const user = usersRef.current.find((item) => item.id === userId);
      if (!user) return { ok: false, message: "User not found." };
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
          message: errorMessage(err, "Failed to change role."),
        };
      }
    },
    [reloadData],
  );

  const approveRegistrationRequest = useCallback(
    async (userId: string): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (!admin || admin.role !== "system_admin") {
        return {
          ok: false,
          message: "Only system administrators can manage registrations.",
        };
      }
      try {
        await approveRegistration(userId);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, "Failed to approve registration."),
        };
      }
    },
    [reloadData],
  );

  const rejectRegistrationRequest = useCallback(
    async (userId: string, reason?: string): Promise<ActionResult> => {
      const admin = currentUserRef.current;
      if (!admin || admin.role !== "system_admin") {
        return {
          ok: false,
          message: "Only system administrators can manage registrations.",
        };
      }
      try {
        await rejectRegistration(userId, reason);
        await reloadData(admin);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, "Failed to reject registration."),
        };
      }
    },
    [reloadData],
  );

  const courseById = useCallback(
    (courseId: string) => courses.find((course) => course.id === courseId),
    [courses],
  );

  const userName = useCallback(
    (userId: string) => userNames[userId] ?? "Unknown",
    [userNames],
  );

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

  const value = useMemo<LmsContextValue>(
    () => ({
      ready,
      courses,
      users,
      lang,
      currentUser,
      setLang,
      login,
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
      deleteCourse,
      enrollLearners,
      enrollSelf,
      changeUserRole,
      approveRegistrationRequest,
      rejectRegistrationRequest,
      bulkRegisterUsers,
    }),
    [
      ready,
      courses,
      users,
      lang,
      currentUser,
      login,
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
      deleteCourse,
      enrollLearners,
      enrollSelf,
      changeUserRole,
      approveRegistrationRequest,
      rejectRegistrationRequest,
      bulkRegisterUsers,
    ],
  );

  return <LmsContext.Provider value={value}>{children}</LmsContext.Provider>;
}

export function useLms(): LmsContextValue {
  const context = useContext(LmsContext);
  if (!context) {
    throw new Error("useLms must be used within an LmsProvider");
  }
  return context;
}
