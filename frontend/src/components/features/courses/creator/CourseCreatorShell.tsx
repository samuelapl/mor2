'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Course, CourseDeliveryMode, CourseLevel, Question, UploadedResource, Quiz } from '@/types';
import { useLms } from '@/lib/lms-store';
import { uploadAttachment } from '@/lib/api/files';
import { fetchAssessmentWithAnswers, fetchCourseAssessments } from '@/lib/api/quiz';
import { COURSE_CATEGORIES } from '@/constants/course-categories';
import { toast } from '@/lib/toast';
import type { ApiAssessment } from '@/lib/api/types';

import { type LessonDraft, type ModuleDraft, uid } from '../wizard-types';
import type { AutosaveStatus, CreatorActiveNode, CreatorPhase } from './types';
import { CreatorHeader } from './CreatorHeader';
import { CreatorSidebar } from './CreatorSidebar';
import { CourseDetailsStage } from './stages/CourseDetailsStage';
import { ModuleEditorStage } from './stages/ModuleEditorStage';
import { LessonEditorStage } from './stages/LessonEditorStage';
import { AssessmentEditorStage } from './stages/AssessmentEditorStage';
import { ReviewSubmitStage } from './stages/ReviewSubmitStage';

function mapApiQuestions(apiQuestions: ApiAssessment['questions'] | undefined): Question[] {
  return ((apiQuestions ?? []) as any[]).map((q) => ({
    id: q.id || uid('q'),
    type: q.type === 'TRUE_FALSE' ? 'true_false' : q.type === 'SHORT_ANSWER' ? 'short_answer' : 'multiple_choice',
    text: q.question || '',
    options: Array.isArray(q.options) ? q.options : ['True', 'False'],
    correctIndex: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
    answerText: typeof q.correctAnswer === 'string' ? q.correctAnswer : '',
    points: q.points || 10,
    category: q.category || '',
  }));
}

const AUTOSAVE_DELAY_MS = 5000;

const isModuleAssessmentLesson = (l: LessonDraft) =>
  l.contentType === 'ASSESSMENT' || l.contentType === 'QUIZ' || l.title.toLowerCase().includes('module assessment');

const isLessonAssessmentSub = (s: LessonDraft) =>
  s.contentType === 'ASSESSMENT' || s.contentType === 'QUIZ' || s.title.toLowerCase().includes('lesson assessment');

export interface CourseCreatorShellProps {
  onDone: () => void;
  onCancel: () => void;
  editingCourse?: Course | null;
  initialDeliveryMode?: CourseDeliveryMode;
}

export function CourseCreatorShell({ onDone, onCancel, editingCourse, initialDeliveryMode = 'BOTH' }: CourseCreatorShellProps) {
  const { courses, createCourse, updateCourseFull, submitForApproval } = useLms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedCourseIdRef = useRef<string | undefined>(editingCourse?.id);
  const [savedCourseId, setSavedCourseId] = useState<string | undefined>(editingCourse?.id);

  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(editingCourse);

  // ── Step 1: Course Details ──
  const [title, setTitle] = useState(editingCourse?.title ?? '');
  const [code, setCode] = useState(editingCourse?.code ?? '');
  const [category, setCategory] = useState(editingCourse?.category ?? COURSE_CATEGORIES[0]);
  const [level, setLevel] = useState<CourseLevel>(editingCourse?.level ?? 'basic');
  const [deliveryMode, setDeliveryMode] = useState<CourseDeliveryMode>(editingCourse?.deliveryMode ?? initialDeliveryMode);
  const [description, setDescription] = useState(editingCourse?.description ?? '');
  const [objectives, setObjectives] = useState(editingCourse?.objectives ?? '');
  const [department, setDepartment] = useState(editingCourse?.department ?? '');
  const [targetAudience, setTargetAudience] = useState(editingCourse?.targetAudience ?? '');
  const [deliveryMethod] = useState(editingCourse?.deliveryMethod ?? 'self_paced');
  const [language] = useState(editingCourse?.language ?? 'English');
  const [prerequisites, setPrerequisites] = useState(editingCourse?.prerequisites ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(editingCourse?.cover ?? null);

  const codeError = useMemo(() => {
    const normalized = code.trim().toUpperCase();
    if (!normalized || savedCourseId) return null;
    const taken = courses.some((c) => c.code.toUpperCase() === normalized);
    return taken ? 'This course code is already used by another course.' : null;
  }, [code, courses, savedCourseId]);

  // ── Step 2: Curriculum Modules & Lessons ──
  const getInitialDraftResources = (item: {
    resources?: UploadedResource[];
    attachments?: UploadedResource[];
    resourceUrl?: string;
    fileName?: string;
    fileSize?: number;
  }): UploadedResource[] => {
    if (item.resources && item.resources.length > 0) return item.resources;
    if (item.attachments && item.attachments.length > 0) return item.attachments;
    if (item.resourceUrl) {
      return [
        {
          id: 'legacy',
          name: item.fileName || item.resourceUrl.split('/').pop() || 'Attached File',
          url: item.resourceUrl,
          size: item.fileSize || 0,
        },
      ];
    }
    return [];
  };

  const [modules, setModules] = useState<ModuleDraft[]>(() => {
    if (editingCourse?.modules && editingCourse.modules.length > 0) {
      return editingCourse.modules.map((mod) => {
        const modRes = getInitialDraftResources(mod);
        return {
          id: mod.id,
          title: mod.title,
          description: mod.description ?? '',
          objectives: mod.objectives ?? '',
          durationMinutes: mod.durationMinutes || 60,
          resourceUrl: mod.resourceUrl || modRes[0]?.url || '',
          fileName: mod.fileName || modRes[0]?.name || '',
          fileSize: mod.fileSize || modRes[0]?.size || 0,
          resources: modRes,
          attachments: modRes,
          lessons: mod.lessons.map((lesson) => {
            const lesRes = getInitialDraftResources(lesson);
            return {
              id: lesson.id,
              title: lesson.title,
              content: lesson.content ?? '',
              durationMin: lesson.durationMin || 15,
              contentType: (lesson as any).contentType || 'DOCUMENT',
              resourceUrl: lesson.resourceUrl || lesRes[0]?.url || '',
              fileName: lesson.fileName || lesRes[0]?.name || '',
              fileSize: lesson.fileSize || lesRes[0]?.size || 0,
              resources: lesRes,
              attachments: lesRes,
              required: (lesson as any).required ?? true,
              quizQuestions: (lesson as any).quizQuestions,
              quizPassMark: (lesson as any).quizPassMark,
              quizWeight: (lesson as any).quizWeight,
              quizTimeLimitMinutes: (lesson as any).quizTimeLimitMinutes,
              quizAttemptsAllowed: (lesson as any).quizAttemptsAllowed,
              subLessons: (lesson.subLessons ?? []).map((sub) => {
                const subRes = getInitialDraftResources(sub);
                return {
                  id: sub.id,
                  title: sub.title,
                  content: sub.content ?? '',
                  durationMin: sub.durationMin || 10,
                  contentType: (sub as any).contentType || 'DOCUMENT',
                  resourceUrl: sub.resourceUrl || subRes[0]?.url || '',
                  fileName: sub.fileName || subRes[0]?.name || '',
                  fileSize: sub.fileSize || subRes[0]?.size || 0,
                  resources: subRes,
                  attachments: subRes,
                  required: (sub as any).required ?? true,
                  quizQuestions: (sub as any).quizQuestions,
                  quizPassMark: (sub as any).quizPassMark,
                  quizWeight: (sub as any).quizWeight,
                  quizTimeLimitMinutes: (sub as any).quizTimeLimitMinutes,
                  quizAttemptsAllowed: (sub as any).quizAttemptsAllowed,
                };
              }),
            };
          }),
        };
      });
    }
    return [
      {
        id: uid('mod'),
        title: 'Module 1: Introduction',
        description: '',
        objectives: '',
        durationMinutes: 45,
        resourceUrl: '',
        resources: [],
        attachments: [],
        lessons: [
          {
            id: uid('les'),
            title: 'Welcome & Overview',
            content: '<p>Welcome to this course! In this lesson, we will outline the journey ahead.</p>',
            durationMin: 15,
            contentType: 'DOCUMENT',
            resourceUrl: '',
            required: true,
            resources: [],
            attachments: [],
            subLessons: [],
          },
        ],
      },
    ];
  });

  // ── Step 3: Final Assessment ──
  const [quizTitle, setQuizTitle] = useState((editingCourse as any)?.quiz?.title ?? 'Final Assessment');
  const [passMark, setPassMark] = useState((editingCourse as any)?.quiz?.passMark ?? 70);
  const [finalAssessmentWeight, setFinalAssessmentWeight] = useState((editingCourse as any)?.quiz?.weight ?? 60);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>((editingCourse as any)?.quiz?.timeLimitMinutes ?? 60);
  const [attemptsAllowed, setAttemptsAllowed] = useState((editingCourse as any)?.quiz?.attemptsAllowed ?? 2);
  const [allowEarlySubmission, setAllowEarlySubmission] = useState(true);
  const [autoSubmitOnExpire, setAutoSubmitOnExpire] = useState(true);
  const [questions, setQuestions] = useState<Question[]>((editingCourse as any)?.quiz?.questions ?? []);
  const [assessmentResources, setAssessmentResources] = useState<UploadedResource[]>(() =>
    (editingCourse as any)?.quiz ? getInitialDraftResources((editingCourse as any).quiz) : [],
  );
  const [assessmentUploading, setAssessmentUploading] = useState(false);
  const [assessmentUploadError, setAssessmentUploadError] = useState<string | null>(null);

  // Load every saved assessment (final, module and lesson tiers) back into the draft when editing.
  const [assessmentsLoaded, setAssessmentsLoaded] = useState(!editingCourse?.id);
  useEffect(() => {
    if (!editingCourse?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchCourseAssessments(editingCourse.id);
        const details = await Promise.all(list.map((a) => fetchAssessmentWithAnswers(a.id).catch(() => null)));
        if (cancelled) return;

        const quizFields = (d: ApiAssessment) => ({
          quizQuestions: mapApiQuestions(d.questions),
          quizPassMark: d.passingScore,
          quizWeight: d.weight ?? 20,
          quizTimeLimitMinutes: d.timeLimitMinutes ?? undefined,
          quizAttemptsAllowed: d.maxAttempts,
        });

        const moduleQuizzes = new Map<string, ApiAssessment>();
        const lessonQuizzes = new Map<string, ApiAssessment>();
        list.forEach((meta, i) => {
          const d = details[i];
          if (!d) return;
          const type = meta.type ?? 'FINAL_ASSESSMENT';
          if (type === 'FINAL_ASSESSMENT') {
            setQuizTitle(d.titleEn || 'Final Assessment');
            setPassMark(d.passingScore);
            if (d.weight !== undefined) setFinalAssessmentWeight(d.weight);
            setAttemptsAllowed(d.maxAttempts);
            setTimeLimitMinutes(d.timeLimitMinutes ?? 60);
            setQuestions(mapApiQuestions(d.questions));
          } else if (type === 'MODULE_ASSESSMENT' && meta.moduleId) {
            moduleQuizzes.set(meta.moduleId, d);
          } else if (meta.lessonId) {
            lessonQuizzes.set(meta.lessonId, d);
          }
        });

        if (moduleQuizzes.size > 0 || lessonQuizzes.size > 0) {
          setModules((prev) =>
            prev.map((m) => {
              const lessons = m.lessons.map((l) => {
                const lq = lessonQuizzes.get(l.id);
                if (!lq || (l.subLessons ?? []).some(isLessonAssessmentSub)) return l;
                const sub: LessonDraft = {
                  id: uid('les-ass'),
                  title: lq.titleEn || 'Lesson Assessment',
                  content: '',
                  durationMin: 15,
                  contentType: 'ASSESSMENT',
                  resourceUrl: '',
                  required: true,
                  resources: [],
                  attachments: [],
                  subLessons: [],
                  ...quizFields(lq),
                };
                return { ...l, subLessons: [...(l.subLessons ?? []), sub] };
              });
              const mq = moduleQuizzes.get(m.id);
              if (!mq || lessons.some(isModuleAssessmentLesson)) return { ...m, lessons };
              const row: LessonDraft = {
                id: uid('mod-ass'),
                title: mq.titleEn || 'Module Assessment',
                content: '',
                durationMin: 30,
                contentType: 'ASSESSMENT',
                resourceUrl: '',
                required: true,
                resources: [],
                attachments: [],
                subLessons: [],
                ...quizFields(mq),
              };
              return { ...m, lessons: [...lessons, row] };
            }),
          );
        }
      } catch {
        // Loading is best-effort; the course stays editable without its saved quizzes.
      } finally {
        if (!cancelled) setAssessmentsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingCourse?.id]);

  // ── Active Node Selection in Studio ──
  const [activeNode, setActiveNode] = useState<CreatorActiveNode>({ type: 'COURSE_DETAILS' });

  // Map activeNode to Studio Phase
  const currentPhase: CreatorPhase = useMemo(() => {
    switch (activeNode.type) {
      case 'COURSE_DETAILS':
        return 'COURSE_DETAILS';
      case 'MODULE':
      case 'LESSON':
      case 'SUB_LESSON':
      case 'MODULE_ASSESSMENT':
      case 'LESSON_ASSESSMENT':
        return 'CURRICULUM';
      case 'FINAL_ASSESSMENT':
        return 'FINAL_ASSESSMENT';
      case 'REVIEW_SUBMIT':
        return 'REVIEW_SUBMIT';
      default:
        return 'COURSE_DETAILS';
    }
  }, [activeNode.type]);

  const handleStepSelect = (phase: CreatorPhase) => {
    switch (phase) {
      case 'COURSE_DETAILS':
        setActiveNode({ type: 'COURSE_DETAILS' });
        break;
      case 'CURRICULUM':
        if (modules.length > 0) {
          setActiveNode({ type: 'MODULE', moduleId: modules[0].id });
        } else {
          handleAddModule();
        }
        break;
      case 'FINAL_ASSESSMENT':
        setActiveNode({ type: 'FINAL_ASSESSMENT' });
        break;
      case 'REVIEW_SUBMIT':
        setActiveNode({ type: 'REVIEW_SUBMIT' });
        break;
    }
  };

  // ── Tree Mutation Handlers ──
  const handleAddModule = () => {
    const newModId = uid('mod');
    const newMod: ModuleDraft = {
      id: newModId,
      title: `Module ${modules.length + 1}: New Module`,
      description: '',
      objectives: '',
      durationMinutes: 60,
      resourceUrl: '',
      resources: [],
      attachments: [],
      lessons: [],
    };
    setModules((prev) => [...prev, newMod]);
    setActiveNode({ type: 'MODULE', moduleId: newModId });
  };

  const handleDeleteModule = (moduleId: string) => {
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    if (activeNode.type !== 'COURSE_DETAILS' && (activeNode as any).moduleId === moduleId) {
      setActiveNode({ type: 'COURSE_DETAILS' });
    }
  };

  const handleAddLesson = (moduleId: string) => {
    const newLesId = uid('les');
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        const newLesson: LessonDraft = {
          id: newLesId,
          title: `Lesson ${m.lessons.length + 1}: Overview`,
          content: '<p>Start authoring lesson content here...</p>',
          durationMin: 15,
          contentType: 'DOCUMENT',
          resourceUrl: '',
          required: true,
          resources: [],
          attachments: [],
          subLessons: [],
        };
        return { ...m, lessons: [...m.lessons, newLesson] };
      }),
    );
    setActiveNode({ type: 'LESSON', moduleId, lessonId: newLesId });
  };

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) };
      }),
    );
    if ((activeNode as any).lessonId === lessonId) {
      setActiveNode({ type: 'MODULE', moduleId });
    }
  };

  const handleAddSubLesson = (moduleId: string, lessonId: string) => {
    const newSubId = uid('sub');
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const subs = l.subLessons ?? [];
            const newSub: LessonDraft = {
              id: newSubId,
              title: `Sub-topic ${subs.length + 1}`,
              content: '<p>Detailed breakdown for this sub-topic.</p>',
              durationMin: 10,
              contentType: 'DOCUMENT',
              resourceUrl: '',
              required: true,
              resources: [],
              attachments: [],
              subLessons: [],
            };
            return { ...l, subLessons: [...subs, newSub] };
          }),
        };
      }),
    );
    setActiveNode({ type: 'SUB_LESSON', moduleId, lessonId, subLessonId: newSubId });
  };

  const handleDeleteSubLesson = (moduleId: string, lessonId: string, subLessonId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            return {
              ...l,
              subLessons: (l.subLessons ?? []).filter((s) => s.id !== subLessonId),
            };
          }),
        };
      }),
    );
    if ((activeNode as any).subLessonId === subLessonId) {
      setActiveNode({ type: 'LESSON', moduleId, lessonId });
    }
  };

  const handleAddModuleAssessment = (moduleId: string) => {
    const newAssId = uid('mod-ass');
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        if (m.lessons.some(isModuleAssessmentLesson)) return m;
        const assessmentLesson: LessonDraft = {
          id: newAssId,
          title: 'Module Assessment',
          content: '',
          durationMin: 30,
          contentType: 'ASSESSMENT',
          resourceUrl: '',
          required: true,
          quizQuestions: [
            {
              id: uid('q'),
              type: 'multiple_choice',
              text: 'Sample question on module concepts?',
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correctIndex: 0,
              points: 10,
            },
          ],
          quizPassMark: passMark || 70,
          quizWeight: 20,
          quizTimeLimitMinutes: 30,
          quizAttemptsAllowed: 2,
          resources: [],
          attachments: [],
          subLessons: [],
        };
        return { ...m, lessons: [...m.lessons, assessmentLesson] };
      }),
    );
    setActiveNode({ type: 'MODULE_ASSESSMENT', moduleId });
  };

  const handleDeleteModuleAssessment = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.filter((l) => !isModuleAssessmentLesson(l)),
        };
      }),
    );
    if (activeNode.type === 'MODULE_ASSESSMENT' && activeNode.moduleId === moduleId) {
      setActiveNode({ type: 'MODULE', moduleId });
    }
  };

  const handleAddLessonAssessment = (moduleId: string, lessonId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const subs = l.subLessons ?? [];
            if (subs.some(isLessonAssessmentSub)) return l;
            const assessmentSub: LessonDraft = {
              id: uid('les-ass'),
              title: 'Lesson Assessment',
              content: '',
              durationMin: 15,
              contentType: 'ASSESSMENT',
              resourceUrl: '',
              required: true,
              quizQuestions: [
                {
                  id: uid('q'),
                  type: 'multiple_choice',
                  text: 'Sample question on this lesson?',
                  options: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4'],
                  correctIndex: 0,
                  points: 10,
                },
              ],
              quizWeight: 20,
              quizPassMark: passMark || 70,
              quizTimeLimitMinutes: 15,
              quizAttemptsAllowed: 3,
              resources: [],
              attachments: [],
              subLessons: [],
            };
            return { ...l, subLessons: [...subs, assessmentSub] };
          }),
        };
      }),
    );
    setActiveNode({ type: 'LESSON_ASSESSMENT', moduleId, lessonId });
  };

  const handleDeleteLessonAssessment = (moduleId: string, lessonId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) =>
            l.id === lessonId ? { ...l, subLessons: (l.subLessons ?? []).filter((s) => !isLessonAssessmentSub(s)) } : l,
          ),
        };
      }),
    );
    if (activeNode.type === 'LESSON_ASSESSMENT' && activeNode.lessonId === lessonId) {
      setActiveNode({ type: 'LESSON', moduleId, lessonId });
    }
  };

  /** Patches the ASSESSMENT sub-lesson that holds a lesson's checkpoint quiz. */
  const updateLessonAssessment = (moduleId: string, lessonId: string, patch: (sub: LessonDraft) => Partial<LessonDraft>) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id !== moduleId
          ? m
          : {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id !== lessonId ? l : { ...l, subLessons: (l.subLessons ?? []).map((s) => (isLessonAssessmentSub(s) ? { ...s, ...patch(s) } : s)) },
              ),
            },
      ),
    );
  };

  /** Patches the ASSESSMENT lesson row that holds a module's checkpoint quiz. */
  const updateModuleAssessment = (moduleId: string, patch: (lesson: LessonDraft) => Partial<LessonDraft>) => {
    setModules((prev) =>
      prev.map((m) => (m.id !== moduleId ? m : { ...m, lessons: m.lessons.map((l) => (isModuleAssessmentLesson(l) ? { ...l, ...patch(l) } : l)) })),
    );
  };

  // ── File Uploads for Final Assessment ──
  const handleFinalAssessmentFileUpload = async (files: File | File[] | FileList) => {
    const fileArray = files instanceof FileList ? Array.from(files) : Array.isArray(files) ? files : [files];
    if (fileArray.length === 0) return;
    setAssessmentUploading(true);
    setAssessmentUploadError(null);
    try {
      const uploaded: UploadedResource[] = [];
      for (const f of fileArray) {
        const res = await uploadAttachment(f, { courseId: editingCourse?.id });
        uploaded.push({
          id: res.id || `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: res.fileName || f.name,
          url: res.fileUrl,
          size: res.sizeBytes || f.size,
          type: res.fileType || f.type,
        });
      }
      setAssessmentResources((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} assessment attachment(s) uploaded`);
    } catch (err: any) {
      setAssessmentUploadError(err.message || 'Failed to upload file');
      toast.error('Failed to upload attachment');
    } finally {
      setAssessmentUploading(false);
    }
  };

  const removeFinalAssessmentFile = (fileIdOrUrl: string) => {
    setAssessmentResources((prev) => prev.filter((r) => r.id !== fileIdOrUrl && r.url !== fileIdOrUrl));
  };

  // ── Payload Constructors ──
  const buildCurriculumPayload = () =>
    modules
      .filter((m) => m.title.trim() !== '' || m.lessons.some((l) => l.title.trim() !== ''))
      .map((m) => {
        const mResources = m.resources?.length ? m.resources : m.attachments?.length ? m.attachments : [];
        return {
          title: m.title.trim() || 'Module',
          description: m.description?.trim() || undefined,
          objectives: m.objectives?.trim() || undefined,
          durationMinutes: m.durationMinutes || undefined,
          resourceUrl: m.resourceUrl?.trim() || mResources[0]?.url || undefined,
          fileName: m.fileName || mResources[0]?.name || undefined,
          fileSize: m.fileSize || mResources[0]?.size || undefined,
          resources: mResources,
          attachments: mResources,
          lessons: m.lessons
            .filter((l) => l.title.trim() !== '')
            .map((l) => {
              const lResources = l.resources?.length ? l.resources : l.attachments?.length ? l.attachments : [];
              return {
                title: l.title.trim(),
                content: l.content || '',
                durationMin: l.durationMin || 15,
                contentType: l.contentType,
                resourceUrl: l.resourceUrl?.trim() || lResources[0]?.url || undefined,
                fileName: l.fileName || lResources[0]?.name || undefined,
                fileSize: l.fileSize || lResources[0]?.size || undefined,
                resources: lResources,
                attachments: lResources,
                quizQuestions: l.quizQuestions,
                quizWeight: l.quizWeight,
                quizPassMark: l.quizPassMark || passMark,
                quizTimeLimitMinutes: l.quizTimeLimitMinutes,
                quizAttemptsAllowed: l.quizAttemptsAllowed,
                subLessons: (l.subLessons ?? [])
                  .filter((sub) => sub.title.trim() !== '')
                  .map((sub) => {
                    const sResources = sub.resources?.length ? sub.resources : sub.attachments?.length ? sub.attachments : [];
                    return {
                      title: sub.title.trim(),
                      content: sub.content || '',
                      durationMin: sub.durationMin || 15,
                      contentType: sub.contentType,
                      resourceUrl: sub.resourceUrl?.trim() || sResources[0]?.url || undefined,
                      fileName: sub.fileName || sResources[0]?.name || undefined,
                      fileSize: sub.fileSize || sResources[0]?.size || undefined,
                      resources: sResources,
                      attachments: sResources,
                      quizQuestions: sub.quizQuestions,
                      quizWeight: sub.quizWeight,
                      quizPassMark: sub.quizPassMark || passMark,
                      quizTimeLimitMinutes: sub.quizTimeLimitMinutes,
                      quizAttemptsAllowed: sub.quizAttemptsAllowed,
                    };
                  }),
              };
            }),
        };
      });

  const buildQuizPayload = (): Quiz | undefined =>
    questions.length > 0
      ? {
          id: `q-${Date.now()}`,
          title: quizTitle.trim() || 'Final Assessment',
          passMark,
          weight: finalAssessmentWeight,
          attemptsAllowed,
          timeLimitMinutes: timeLimitMinutes || null,
          questions,
          resourceUrl: assessmentResources[0]?.url || undefined,
          fileName: assessmentResources[0]?.name || undefined,
          resources: assessmentResources,
          attachments: assessmentResources,
        }
      : undefined;

  // ── Persistence (shared by autosave and the Save / Submit buttons) ──
  const uploadedCoverRef = useRef<File | null>(null);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  /**
   * Writes the current draft to the server without leaving the studio. The first
   * call creates the course; later calls update it. Calls are queued so an
   * autosave and a button click never race to create the course twice.
   */
  const persistDraft = (): Promise<string> => {
    const quiz = buildQuizPayload();
    const curriculum = buildCurriculumPayload();
    const cover = coverFile && coverFile !== uploadedCoverRef.current ? coverFile : null;
    const details = {
      title: title.trim(),
      category,
      level,
      deliveryMode,
      description: description.trim(),
      objectives: objectives.trim(),
      department: department.trim(),
      targetAudience: targetAudience.trim(),
      deliveryMethod: deliveryMethod.trim(),
      language: language.trim(),
      prerequisites: prerequisites.trim(),
      cover,
      modules: curriculum,
      quiz,
    };

    const run = async () => {
      const existingId = savedCourseIdRef.current;
      if (existingId) {
        const result = await updateCourseFull(existingId, details);
        if (!result.ok) throw new Error(result.message);
      } else {
        const result = await createCourse({ ...details, code: code.trim().toUpperCase() });
        if (result.courseId) {
          savedCourseIdRef.current = result.courseId;
          setSavedCourseId(result.courseId);
        }
        if (!result.ok) throw new Error(result.message);
      }
      if (cover) uploadedCoverRef.current = cover;
      return savedCourseIdRef.current!;
    };

    const next = saveQueueRef.current.then(run, run);
    saveQueueRef.current = next.catch(() => undefined);
    return next;
  };

  // ── Autosave ──
  const isUploading =
    assessmentUploading ||
    modules.some((m) => m.uploading || m.lessons.some((l) => l.uploading || (l.subLessons ?? []).some((sub) => sub.uploading)));

  const draftSnapshot = useMemo(
    () =>
      JSON.stringify(
        {
          title,
          code,
          category,
          level,
          deliveryMode,
          description,
          objectives,
          department,
          targetAudience,
          prerequisites,
          cover: coverFile ? `${coverFile.name}:${coverFile.size}:${coverFile.lastModified}` : null,
          modules,
          quizTitle,
          passMark,
          finalAssessmentWeight,
          timeLimitMinutes,
          attemptsAllowed,
          questions,
          assessmentResources,
        },
        // Upload progress flags are UI state, not content.
        (key, value) => (key === 'uploading' || key === 'uploadError' ? undefined : value),
      ),
    [
      title,
      code,
      category,
      level,
      deliveryMode,
      description,
      objectives,
      department,
      targetAudience,
      prerequisites,
      coverFile,
      modules,
      quizTitle,
      passMark,
      finalAssessmentWeight,
      timeLimitMinutes,
      attemptsAllowed,
      questions,
      assessmentResources,
    ],
  );

  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const latestSnapshotRef = useRef(draftSnapshot);
  latestSnapshotRef.current = draftSnapshot;

  // What the studio opened with (after saved quizzes are loaded) counts as already saved.
  useEffect(() => {
    if (assessmentsLoaded && lastSavedSnapshotRef.current === null) lastSavedSnapshotRef.current = draftSnapshot;
  }, [assessmentsLoaded, draftSnapshot]);

  const canAutosave = title.trim() !== '' && code.trim() !== '' && !codeError;
  const isDirty = lastSavedSnapshotRef.current !== null && draftSnapshot !== lastSavedSnapshotRef.current;

  useEffect(() => {
    if (!isDirty) return;
    setAutosaveStatus('pending');
    if (!canAutosave || saving || isUploading) return;

    const snapshot = draftSnapshot;
    const timer = setTimeout(async () => {
      setAutosaveStatus('saving');
      try {
        await persistDraft();
        lastSavedSnapshotRef.current = snapshot;
        setLastSavedAt(new Date());
        setAutosaveError(null);
        setAutosaveStatus(latestSnapshotRef.current === snapshot ? 'saved' : 'pending');
      } catch (err) {
        setAutosaveError(err instanceof Error ? err.message : 'Autosave failed.');
        setAutosaveStatus('error');
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // persistDraft is rebuilt every render; the snapshot captures everything it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSnapshot, isDirty, canAutosave, saving, isUploading]);

  // ── Save Draft & Submit Handlers ──
  const handleSave = async (andSubmit = false) => {
    setSaving(true);
    try {
      const courseId = await persistDraft();
      lastSavedSnapshotRef.current = draftSnapshot;

      if (andSubmit) {
        const submitRes = await submitForApproval(courseId);
        if (!submitRes.ok) throw new Error(submitRes.message || 'Failed to submit course for approval.');
        toast.success('Course submitted for approval successfully!');
      } else {
        toast.success('Course draft saved successfully!');
      }

      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  /** Leaving the studio flushes edits still waiting on the autosave timer. */
  const handleExit = async () => {
    if (isDirty && canAutosave && !isUploading) {
      setSaving(true);
      try {
        await persistDraft();
      } catch (err) {
        setSaving(false);
        toast.error(err instanceof Error ? `Could not save your latest changes: ${err.message}` : 'Could not save your latest changes.');
        return;
      }
    }
    onCancel();
  };

  // Calculate total allocated weights across final, modules, and lessons
  const totalAllocatedWeight = useMemo(() => {
    let sum = finalAssessmentWeight || 0;
    modules.forEach((m) => {
      m.lessons.forEach((l) => {
        if (l.quizWeight) sum += l.quizWeight;
        l.subLessons?.forEach((s) => {
          if (s.quizWeight) sum += s.quizWeight;
        });
      });
    });
    return sum;
  }, [finalAssessmentWeight, modules]);

  // ── Render Active Stage Content ──
  const renderActiveStage = () => {
    if (activeNode.type === 'COURSE_DETAILS') {
      return (
        <CourseDetailsStage
          title={title}
          setTitle={setTitle}
          code={code}
          setCode={setCode}
          codeError={codeError}
          codeLocked={Boolean(savedCourseId)}
          category={category}
          setCategory={setCategory}
          level={level}
          setLevel={setLevel}
          deliveryMode={deliveryMode}
          setDeliveryMode={setDeliveryMode}
          description={description}
          setDescription={setDescription}
          objectives={objectives}
          setObjectives={setObjectives}
          department={department}
          setDepartment={setDepartment}
          targetAudience={targetAudience}
          setTargetAudience={setTargetAudience}
          prerequisites={prerequisites}
          setPrerequisites={setPrerequisites}
          coverPreview={coverPreview}
          setCoverPreview={setCoverPreview}
          setCoverFile={setCoverFile}
          fileInputRef={fileInputRef}
          isEdit={isEdit}
        />
      );
    }

    if (activeNode.type === 'MODULE') {
      const moduleIndex = modules.findIndex((m) => m.id === activeNode.moduleId);
      const currentModule = modules[moduleIndex];
      if (!currentModule) {
        return <div className="p-8 text-center text-slate-500">Module not found. Please select another item from the sidebar.</div>;
      }
      return (
        <ModuleEditorStage
          module={currentModule}
          moduleIndex={moduleIndex}
          onUpdateModule={(patch) => {
            setModules((prev) => prev.map((m) => (m.id === currentModule.id ? { ...m, ...patch } : m)));
          }}
          onAddLesson={() => handleAddLesson(currentModule.id)}
          onAddModuleAssessment={() => handleAddModuleAssessment(currentModule.id)}
          onSelectLesson={(lessonId) => setActiveNode({ type: 'LESSON', moduleId: currentModule.id, lessonId })}
          onSelectModuleAssessment={() => setActiveNode({ type: 'MODULE_ASSESSMENT', moduleId: currentModule.id })}
          onDeleteLesson={(lessonId) => handleDeleteLesson(currentModule.id, lessonId)}
          onDeleteModuleAssessment={() => handleDeleteModuleAssessment(currentModule.id)}
        />
      );
    }

    if (activeNode.type === 'LESSON') {
      const currentModule = modules.find((m) => m.id === activeNode.moduleId);
      const instructional = currentModule?.lessons.filter((l) => !isModuleAssessmentLesson(l)) ?? [];
      const lessonIndex = instructional.findIndex((l) => l.id === activeNode.lessonId);
      const currentLesson = instructional[lessonIndex];
      if (!currentModule || !currentLesson) {
        return <div className="p-8 text-center text-slate-500">Lesson not found. Please select another item from the sidebar.</div>;
      }
      return (
        <LessonEditorStage
          lesson={currentLesson}
          lessonIndex={lessonIndex}
          moduleTitle={currentModule.title}
          onUpdateLesson={(patch) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === currentLesson.id ? { ...l, ...patch } : l)),
                    }
                  : m,
              ),
            );
          }}
          onAddSubLesson={() => handleAddSubLesson(currentModule.id, currentLesson.id)}
          onSelectSubLesson={(subId) =>
            setActiveNode({
              type: 'SUB_LESSON',
              moduleId: currentModule.id,
              lessonId: currentLesson.id,
              subLessonId: subId,
            })
          }
          onDeleteSubLesson={(subId) => handleDeleteSubLesson(currentModule.id, currentLesson.id, subId)}
          onAddLessonAssessment={() => handleAddLessonAssessment(currentModule.id, currentLesson.id)}
          onSelectLessonAssessment={() =>
            setActiveNode({
              type: 'LESSON_ASSESSMENT',
              moduleId: currentModule.id,
              lessonId: currentLesson.id,
            })
          }
          onDeleteLessonAssessment={() => handleDeleteLessonAssessment(currentModule.id, currentLesson.id)}
        />
      );
    }

    if (activeNode.type === 'SUB_LESSON') {
      const currentModule = modules.find((m) => m.id === activeNode.moduleId);
      const parentLesson = currentModule?.lessons.find((l) => l.id === activeNode.lessonId);
      const subs = (parentLesson?.subLessons ?? []).filter((s) => !isLessonAssessmentSub(s));
      const subIndex = subs.findIndex((s) => s.id === activeNode.subLessonId);
      const currentSub = subs[subIndex];
      if (!currentModule || !parentLesson || !currentSub) {
        return <div className="p-8 text-center text-slate-500">Sub-lesson not found. Please select another item from the sidebar.</div>;
      }
      return (
        <LessonEditorStage
          lesson={currentSub}
          lessonIndex={subIndex}
          isSubLesson
          parentLessonTitle={parentLesson.title}
          moduleTitle={currentModule.title}
          onUpdateLesson={(patch) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) =>
                        l.id === parentLesson.id
                          ? {
                              ...l,
                              subLessons: (l.subLessons ?? []).map((s) => (s.id === currentSub.id ? { ...s, ...patch } : s)),
                            }
                          : l,
                      ),
                    }
                  : m,
              ),
            );
          }}
        />
      );
    }

    if (activeNode.type === 'MODULE_ASSESSMENT') {
      const currentModule = modules.find((m) => m.id === activeNode.moduleId);
      const assessmentLesson = currentModule?.lessons.find(isModuleAssessmentLesson);
      if (!currentModule || !assessmentLesson) {
        return <div className="p-8 text-center text-slate-500">Module assessment not found.</div>;
      }
      const update = (patch: (l: LessonDraft) => Partial<LessonDraft>) => updateModuleAssessment(currentModule.id, patch);
      return (
        <AssessmentEditorStage
          scope="MODULE_ASSESSMENT"
          parentTitle={currentModule.title}
          quizTitle={assessmentLesson.title}
          setQuizTitle={(val) => update(() => ({ title: val }))}
          weight={assessmentLesson.quizWeight ?? 20}
          setWeight={(val) => update(() => ({ quizWeight: val }))}
          totalAllocatedWeight={totalAllocatedWeight}
          passMark={assessmentLesson.quizPassMark ?? passMark ?? 70}
          setPassMark={(val) => update(() => ({ quizPassMark: val }))}
          timeLimitMinutes={assessmentLesson.quizTimeLimitMinutes ?? 30}
          setTimeLimitMinutes={(val) => update(() => ({ quizTimeLimitMinutes: val }))}
          attemptsAllowed={assessmentLesson.quizAttemptsAllowed ?? 2}
          setAttemptsAllowed={(val) => update(() => ({ quizAttemptsAllowed: val }))}
          questions={assessmentLesson.quizQuestions ?? []}
          setQuestions={(updater) => update((l) => ({ quizQuestions: updater(l.quizQuestions ?? []) }))}
          courseId={editingCourse?.id}
        />
      );
    }

    if (activeNode.type === 'LESSON_ASSESSMENT') {
      const currentModule = modules.find((m) => m.id === activeNode.moduleId);
      const currentLesson = currentModule?.lessons.find((l) => l.id === activeNode.lessonId);
      const assessmentSub = currentLesson?.subLessons?.find(isLessonAssessmentSub);
      if (!currentModule || !currentLesson || !assessmentSub) {
        return <div className="p-8 text-center text-slate-500">Lesson assessment not found.</div>;
      }
      const update = (patch: (s: LessonDraft) => Partial<LessonDraft>) => updateLessonAssessment(currentModule.id, currentLesson.id, patch);
      return (
        <AssessmentEditorStage
          scope="LESSON_ASSESSMENT"
          parentTitle={currentLesson.title}
          quizTitle={assessmentSub.title}
          setQuizTitle={(val) => update(() => ({ title: val }))}
          weight={assessmentSub.quizWeight ?? 20}
          setWeight={(val) => update(() => ({ quizWeight: val }))}
          totalAllocatedWeight={totalAllocatedWeight}
          passMark={assessmentSub.quizPassMark ?? passMark ?? 70}
          setPassMark={(val) => update(() => ({ quizPassMark: val }))}
          timeLimitMinutes={assessmentSub.quizTimeLimitMinutes ?? 15}
          setTimeLimitMinutes={(val) => update(() => ({ quizTimeLimitMinutes: val }))}
          attemptsAllowed={assessmentSub.quizAttemptsAllowed ?? 3}
          setAttemptsAllowed={(val) => update(() => ({ quizAttemptsAllowed: val }))}
          questions={assessmentSub.quizQuestions ?? []}
          setQuestions={(updater) => update((s) => ({ quizQuestions: updater(s.quizQuestions ?? []) }))}
          courseId={editingCourse?.id}
        />
      );
    }

    if (activeNode.type === 'FINAL_ASSESSMENT') {
      return (
        <AssessmentEditorStage
          scope="FINAL_ASSESSMENT"
          quizTitle={quizTitle}
          setQuizTitle={setQuizTitle}
          weight={finalAssessmentWeight}
          setWeight={setFinalAssessmentWeight}
          totalAllocatedWeight={totalAllocatedWeight}
          passMark={passMark}
          setPassMark={setPassMark}
          timeLimitMinutes={timeLimitMinutes}
          setTimeLimitMinutes={setTimeLimitMinutes}
          attemptsAllowed={attemptsAllowed}
          setAttemptsAllowed={setAttemptsAllowed}
          allowEarlySubmission={allowEarlySubmission}
          setAllowEarlySubmission={setAllowEarlySubmission}
          autoSubmitOnExpire={autoSubmitOnExpire}
          setAutoSubmitOnExpire={setAutoSubmitOnExpire}
          questions={questions}
          setQuestions={setQuestions}
          resources={assessmentResources}
          uploading={assessmentUploading}
          uploadError={assessmentUploadError}
          onFileUpload={handleFinalAssessmentFileUpload}
          onFileRemove={removeFinalAssessmentFile}
          courseId={editingCourse?.id}
        />
      );
    }

    if (activeNode.type === 'REVIEW_SUBMIT') {
      return (
        <ReviewSubmitStage
          title={title}
          code={code}
          category={category}
          level={level}
          deliveryMode={deliveryMode}
          description={description}
          objectives={objectives}
          department={department}
          targetAudience={targetAudience}
          prerequisites={prerequisites}
          coverPreview={coverPreview}
          modules={modules}
          quizTitle={quizTitle}
          passMark={passMark}
          timeLimitMinutes={timeLimitMinutes}
          attemptsAllowed={attemptsAllowed}
          allowEarlySubmission={allowEarlySubmission}
          autoSubmitOnExpire={autoSubmitOnExpire}
          questions={questions}
          finalAssessmentWeight={finalAssessmentWeight}
          assessmentResources={assessmentResources}
          saving={saving}
          onSubmitForApproval={() => handleSave(true)}
          onSaveDraft={() => handleSave(false)}
          onSelectNode={setActiveNode}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans antialiased text-slate-800">
      {/* Top Header */}
      <CreatorHeader
        phase={currentPhase}
        onPhaseChange={handleStepSelect}
        activeNode={activeNode}
        title={title}
        code={code}
        deliveryMode={deliveryMode}
        saving={saving}
        onSaveDraft={() => handleSave(false)}
        onSubmitForApproval={() => handleSave(true)}
        onPreview={() => setActiveNode({ type: 'REVIEW_SUBMIT' })}
        onExit={handleExit}
        isEdit={isEdit}
        autosaveStatus={autosaveStatus}
        autosaveError={autosaveError}
        lastSavedAt={lastSavedAt}
        autosaveBlockedReason={!title.trim() || !code.trim() ? 'Add a title and course code to start autosaving' : codeError ? codeError : null}
      />

      {/* Main Studio Body: Sidebar + Editor Stage */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Interactive Tree Sidebar */}
        <CreatorSidebar
          activeNode={activeNode}
          onSelectNode={setActiveNode}
          modules={modules}
          courseTitle={title}
          finalAssessmentWeight={finalAssessmentWeight}
          finalQuestionCount={questions.length}
          onAddModule={handleAddModule}
          onAddLesson={handleAddLesson}
          onAddSubLesson={handleAddSubLesson}
          onAddModuleAssessment={handleAddModuleAssessment}
          onAddLessonAssessment={handleAddLessonAssessment}
          onDeleteModule={handleDeleteModule}
          onDeleteLesson={handleDeleteLesson}
          onDeleteSubLesson={handleDeleteSubLesson}
          onDeleteModuleAssessment={handleDeleteModuleAssessment}
          onDeleteLessonAssessment={handleDeleteLessonAssessment}
        />

        {/* Center Main Stage Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 lg:px-12 bg-slate-50/70">{renderActiveStage()}</main>
      </div>
    </div>
  );
}
