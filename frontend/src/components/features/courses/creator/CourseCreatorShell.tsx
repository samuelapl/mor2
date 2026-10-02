'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Course, CourseDeliveryMode, CourseLevel, Question, UploadedResource, Quiz } from '@/types';
import { useLms } from '@/lib/lms-store';
import { uploadAttachment } from '@/lib/api/files';
import { fetchAssessmentWithAnswers, fetchCourseAssessments } from '@/lib/api/quiz';
import { COURSE_CATEGORIES } from '@/constants/course-categories';
import { toast } from '@/lib/toast';

import { type LessonDraft, type ModuleDraft, uid } from '../wizard-types';
import type { CreatorActiveNode, CreatorPhase } from './types';
import { CreatorHeader } from './CreatorHeader';
import { CreatorSidebar } from './CreatorSidebar';
import { CourseDetailsStage } from './stages/CourseDetailsStage';
import { ModuleEditorStage } from './stages/ModuleEditorStage';
import { LessonEditorStage } from './stages/LessonEditorStage';
import { AssessmentEditorStage } from './stages/AssessmentEditorStage';
import { ReviewSubmitStage } from './stages/ReviewSubmitStage';

export interface CourseCreatorShellProps {
  onDone: () => void;
  onCancel: () => void;
  editingCourse?: Course | null;
  initialDeliveryMode?: CourseDeliveryMode;
}

export function CourseCreatorShell({ onDone, onCancel, editingCourse, initialDeliveryMode = 'BOTH' }: CourseCreatorShellProps) {
  const { createCourse, updateCourseFull, submitForApproval } = useLms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedCourseIdRef = useRef<string | undefined>(editingCourse?.id);

  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(editingCourse);

  // ── Step 1: Course Details ──
  const [title, setTitle] = useState(editingCourse?.title ?? '');
  const [titleAm, setTitleAm] = useState((editingCourse as any)?.titleAm ?? '');
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

  // Load existing assessment from backend if editing
  useEffect(() => {
    if (!editingCourse?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchCourseAssessments(editingCourse.id);
        if (cancelled || list.length === 0) return;
        const detail = await fetchAssessmentWithAnswers(list[0].id);
        if (cancelled || !detail) return;
        setQuizTitle(detail.titleEn || 'Final Assessment');
        if (detail.passingScore !== undefined) setPassMark(detail.passingScore);
        if (detail.weight !== undefined) setFinalAssessmentWeight(detail.weight);
        if (detail.maxAttempts !== undefined) setAttemptsAllowed(detail.maxAttempts);
        setTimeLimitMinutes(detail.timeLimitMinutes ?? 60);
        if (Array.isArray(detail.questions) && detail.questions.length > 0) {
          setQuestions(
            (detail.questions as any[]).map((q) => ({
              id: q.id || uid('q'),
              type: q.type === 'TRUE_FALSE' ? 'true_false' : q.type === 'SHORT_ANSWER' ? 'short_answer' : 'multiple_choice',
              text: q.question || '',
              options: Array.isArray(q.options) ? q.options : ['True', 'False'],
              correctIndex: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
              answerText: typeof q.correctAnswer === 'string' ? q.correctAnswer : '',
              points: q.points || 10,
              category: q.category || '',
            })),
          );
        }
      } catch {}
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
        const exists = m.lessons.some(
          (l) => l.contentType === 'ASSESSMENT' || l.contentType === 'QUIZ' || l.title.toLowerCase().includes('module assessment'),
        );
        if (exists) return m;
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
          lessons: m.lessons.filter(
            (l) => l.contentType !== 'ASSESSMENT' && l.contentType !== 'QUIZ' && !l.title.toLowerCase().includes('module assessment'),
          ),
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
            return {
              ...l,
              quizQuestions: l.quizQuestions?.length
                ? l.quizQuestions
                : [
                    {
                      id: uid('q'),
                      type: 'multiple_choice',
                      text: 'Sample question on this lesson?',
                      options: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4'],
                      correctIndex: 0,
                      points: 10,
                    },
                  ],
              quizWeight: l.quizWeight ?? 20,
              quizPassMark: l.quizPassMark ?? passMark ?? 70,
              quizTimeLimitMinutes: l.quizTimeLimitMinutes ?? 15,
              quizAttemptsAllowed: l.quizAttemptsAllowed ?? 3,
            };
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
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const updated = { ...l };
            delete updated.quizQuestions;
            delete updated.quizWeight;
            delete updated.quizPassMark;
            delete updated.quizTimeLimitMinutes;
            delete updated.quizAttemptsAllowed;
            return updated;
          }),
        };
      }),
    );
    if (activeNode.type === 'LESSON_ASSESSMENT' && (activeNode as any).lessonId === lessonId) {
      setActiveNode({ type: 'LESSON', moduleId, lessonId });
    }
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
          id: res.fileId || `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: res.originalName || f.name,
          url: res.fileUrl,
          size: res.size || f.size,
          type: res.mimeType || f.type,
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

  // ── Save Draft & Submit Handlers ──
  const handleSave = async (andSubmit = false) => {
    setSaving(true);
    const quiz = buildQuizPayload();
    const curriculum = buildCurriculumPayload();

    try {
      let savedCourseId = savedCourseIdRef.current || editingCourse?.id;

      if (editingCourse || savedCourseIdRef.current) {
        const courseId = savedCourseIdRef.current || editingCourse!.id;
        const result = await updateCourseFull(courseId, {
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
          cover: coverFile,
          modules: curriculum,
          quiz,
        });

        if (result?.id) savedCourseIdRef.current = result.id;
        toast.success(andSubmit ? 'Course updated' : 'Course draft saved successfully');
      } else {
        const result = await createCourse({
          title: title.trim(),
          code: code.trim().toUpperCase() || 'DRAFT',
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
          cover: coverFile,
          modules: curriculum,
          quiz,
        });

        const newId = (result as any)?.courseId || (result as any)?.id;
        if (newId) {
          savedCourseId = newId;
          savedCourseIdRef.current = newId;
        }
        toast.success(andSubmit ? 'Course created' : 'Course saved as draft');
      }

      if (andSubmit) {
        const finalId = savedCourseIdRef.current || savedCourseId;
        if (finalId) {
          await submitForApproval(finalId);
          toast.success('Course submitted for approval successfully!');
        }
      }

      onDone();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
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
          titleAm={titleAm}
          setTitleAm={setTitleAm}
          code={code}
          setCode={setCode}
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
      const currentModule = modules.find((m) => m.id === activeNode.moduleId);
      if (!currentModule) {
        return <div className="p-8 text-center text-slate-500">Module not found. Please select another item from the sidebar.</div>;
      }
      return (
        <ModuleEditorStage
          module={currentModule}
          onUpdateModule={(patch) => {
            setModules((prev) => prev.map((m) => (m.id === currentModule.id ? { ...m, ...patch } : m)));
          }}
          onAddLesson={() => handleAddLesson(currentModule.id)}
          onAddModuleAssessment={() => handleAddModuleAssessment(currentModule.id)}
          onSelectLesson={(lessonId) => setActiveNode({ type: 'LESSON', moduleId: currentModule.id, lessonId })}
          onSelectAssessment={() => setActiveNode({ type: 'MODULE_ASSESSMENT', moduleId: currentModule.id })}
        />
      );
    }

    if (activeNode.type === 'LESSON') {
      const currentModule = modules.find((m) => m.id === activeNode.moduleId);
      const currentLesson = currentModule?.lessons.find((l) => l.id === activeNode.lessonId);
      if (!currentModule || !currentLesson) {
        return <div className="p-8 text-center text-slate-500">Lesson not found. Please select another item from the sidebar.</div>;
      }
      return (
        <LessonEditorStage
          lesson={currentLesson}
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
          onAddLessonAssessment={() => handleAddLessonAssessment(currentModule.id, currentLesson.id)}
          onSelectSubLesson={(subId) =>
            setActiveNode({
              type: 'SUB_LESSON',
              moduleId: currentModule.id,
              lessonId: currentLesson.id,
              subLessonId: subId,
            })
          }
          onSelectAssessment={() =>
            setActiveNode({
              type: 'LESSON_ASSESSMENT',
              moduleId: currentModule.id,
              lessonId: currentLesson.id,
            })
          }
        />
      );
    }

    if (activeNode.type === 'SUB_LESSON') {
      const currentModule = modules.find((m) => m.id === activeNode.moduleId);
      const parentLesson = currentModule?.lessons.find((l) => l.id === activeNode.lessonId);
      const currentSub = parentLesson?.subLessons?.find((s) => s.id === activeNode.subLessonId);
      if (!currentModule || !parentLesson || !currentSub) {
        return <div className="p-8 text-center text-slate-500">Sub-lesson not found. Please select another item from the sidebar.</div>;
      }
      return (
        <LessonEditorStage
          lesson={currentSub}
          isSubLesson
          moduleTitle={`${currentModule.title} › ${parentLesson.title}`}
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
          onBackToParentLesson={() =>
            setActiveNode({
              type: 'LESSON',
              moduleId: currentModule.id,
              lessonId: parentLesson.id,
            })
          }
        />
      );
    }

    if (activeNode.type === 'MODULE_ASSESSMENT') {
      const currentModule = modules.find((m) => m.id === activeNode.moduleId);
      const assessmentLesson = currentModule?.lessons.find(
        (l) => l.contentType === 'ASSESSMENT' || l.contentType === 'QUIZ' || l.title.toLowerCase().includes('module assessment'),
      );
      if (!currentModule || !assessmentLesson) {
        return <div className="p-8 text-center text-slate-500">Module assessment not found.</div>;
      }
      return (
        <AssessmentEditorStage
          scope="MODULE_ASSESSMENT"
          parentTitle={currentModule.title}
          quizTitle={assessmentLesson.title}
          setQuizTitle={(val) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === assessmentLesson.id ? { ...l, title: val } : l)),
                    }
                  : m,
              ),
            );
          }}
          weight={assessmentLesson.quizWeight ?? 20}
          setWeight={(val) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === assessmentLesson.id ? { ...l, quizWeight: val } : l)),
                    }
                  : m,
              ),
            );
          }}
          totalAllocatedWeight={totalAllocatedWeight}
          passMark={assessmentLesson.quizPassMark ?? passMark ?? 70}
          setPassMark={(val) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === assessmentLesson.id ? { ...l, quizPassMark: val } : l)),
                    }
                  : m,
              ),
            );
          }}
          timeLimitMinutes={assessmentLesson.quizTimeLimitMinutes ?? 30}
          setTimeLimitMinutes={(val) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === assessmentLesson.id ? { ...l, quizTimeLimitMinutes: val } : l)),
                    }
                  : m,
              ),
            );
          }}
          attemptsAllowed={assessmentLesson.quizAttemptsAllowed ?? 2}
          setAttemptsAllowed={(val) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === assessmentLesson.id ? { ...l, quizAttemptsAllowed: val } : l)),
                    }
                  : m,
              ),
            );
          }}
          questions={assessmentLesson.quizQuestions ?? []}
          setQuestions={(updater) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === assessmentLesson.id ? { ...l, quizQuestions: updater(l.quizQuestions ?? []) } : l)),
                    }
                  : m,
              ),
            );
          }}
        />
      );
    }

    if (activeNode.type === 'LESSON_ASSESSMENT') {
      const currentModule = modules.find((m) => m.id === activeNode.moduleId);
      const currentLesson = currentModule?.lessons.find((l) => l.id === activeNode.lessonId);
      if (!currentModule || !currentLesson) {
        return <div className="p-8 text-center text-slate-500">Lesson assessment not found.</div>;
      }
      return (
        <AssessmentEditorStage
          scope="LESSON_ASSESSMENT"
          parentTitle={currentLesson.title}
          quizTitle={`${currentLesson.title} Quiz`}
          setQuizTitle={() => {}}
          weight={currentLesson.quizWeight ?? 20}
          setWeight={(val) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === currentLesson.id ? { ...l, quizWeight: val } : l)),
                    }
                  : m,
              ),
            );
          }}
          totalAllocatedWeight={totalAllocatedWeight}
          passMark={currentLesson.quizPassMark ?? passMark ?? 70}
          setPassMark={(val) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === currentLesson.id ? { ...l, quizPassMark: val } : l)),
                    }
                  : m,
              ),
            );
          }}
          timeLimitMinutes={currentLesson.quizTimeLimitMinutes ?? 15}
          setTimeLimitMinutes={(val) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === currentLesson.id ? { ...l, quizTimeLimitMinutes: val } : l)),
                    }
                  : m,
              ),
            );
          }}
          attemptsAllowed={currentLesson.quizAttemptsAllowed ?? 3}
          setAttemptsAllowed={(val) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === currentLesson.id ? { ...l, quizAttemptsAllowed: val } : l)),
                    }
                  : m,
              ),
            );
          }}
          questions={currentLesson.quizQuestions ?? []}
          setQuestions={(updater) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === currentModule.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => (l.id === currentLesson.id ? { ...l, quizQuestions: updater(l.quizQuestions ?? []) } : l)),
                    }
                  : m,
              ),
            );
          }}
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
          titleAm={titleAm}
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
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
      {/* Top Header */}
      <CreatorHeader
        courseTitle={title}
        courseCode={code}
        deliveryMode={deliveryMode}
        currentPhase={currentPhase}
        onSelectPhase={handleStepSelect}
        onSaveDraft={() => handleSave(false)}
        onSubmitForApproval={() => handleSave(true)}
        onClose={onCancel}
        saving={saving}
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
