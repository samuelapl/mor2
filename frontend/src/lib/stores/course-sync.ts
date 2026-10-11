'use client';

import { fetchCourseModules, replaceCurriculum } from '@/lib/api/courses';
import { createLessonAssessment, createModuleAssessment, replaceAssessment } from '@/lib/api/quiz';
import type { AssessmentQuestionInput } from '@/lib/api/quiz';
import { moduleToCreateBody, uploadedResourceToApiAttachment } from '@/lib/api/transform';
import type { ApiModule, CreateCurriculumAttachmentBody, ReplaceSessionPlansBody } from '@/lib/api/types';
import type { Question, Quiz, UploadedResource } from '@/types';

import { errorMessage } from './store-utils';

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
  quizQuestions?: Question[];
  quizWeight?: number;
  quizPassMark?: number;
  quizTimeLimitMinutes?: number | null;
  quizAttemptsAllowed?: number;
  subLessons?: WizardLessonInput[];
}

/** A planned online session as the creator studio sends it (see ReplaceSessionPlansBody). */
export type SessionPlanInput = ReplaceSessionPlansBody['plans'][number];

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
  isMediaLecture: boolean = false,
): CreateCurriculumAttachmentBody[] | undefined {
  const rawList = attachments?.length ? attachments : resources?.length ? resources : [];
  // Ensure the primary lecture media resourceUrl is never in attachments
  const list = isMediaLecture && resourceUrl ? rawList.filter((r) => r.url !== resourceUrl) : rawList;

  if (list.length > 0) {
    return list.map(uploadedResourceToApiAttachment);
  }
  // If this is a video, audio, or presentation lecture, NEVER fallback to resourceUrl as an attachment
  if (!isMediaLecture && resourceUrl) {
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

function normalizeLessonContentType(type?: string): 'DOCUMENT' | 'INTERACTIVE' | 'VIDEO' | 'AUDIO' | 'PRESENTATION' | 'EXTERNAL_LINK' | 'SCORM' {
  if (!type) return 'DOCUMENT';
  if (type === 'ASSIGNMENT') return 'DOCUMENT';
  if (type === 'QUIZ' || type === 'ASSESSMENT') return 'INTERACTIVE';
  if (['DOCUMENT', 'INTERACTIVE', 'VIDEO', 'AUDIO', 'PRESENTATION', 'EXTERNAL_LINK', 'SCORM'].includes(type)) {
    return type as any;
  }
  return 'DOCUMENT';
}

function questionToApi(
  q: {
    id?: string;
    type: string;
    text?: string;
    question?: string;
    options: string[];
    correctIndex?: number;
    correctAnswer?: number | string;
    answerText?: string;
    category?: string;
    points?: number;
  },
  idx = 0,
): AssessmentQuestionInput {
  const qId = q.id?.trim() || `q-${idx}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const text = (q.text || q.question || '').trim();
  const qType = (q.type || 'multiple_choice').toLowerCase();

  if (qType === 'short_answer') {
    return {
      id: qId,
      type: 'SHORT_ANSWER',
      question: text,
      options: [],
      correctAnswer: (q.answerText ?? (typeof q.correctAnswer === 'string' ? q.correctAnswer : '')).trim(),
      category: q.category,
      points: q.points ?? 10,
    };
  }
  const correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;

  return {
    id: qId,
    type: qType === 'true_false' ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
    question: text,
    options: q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2'],
    correctAnswer: correctIdx,
    category: q.category,
    points: q.points ?? 10,
  };
}

function formatQuestionsForApi(questions: any[]): AssessmentQuestionInput[] {
  const seenIds = new Set<string>();
  return questions.map((q, idx) => {
    let qId = (q.id || '').trim();
    if (!qId || seenIds.has(qId)) {
      qId = `q-${idx}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    }
    seenIds.add(qId);
    return questionToApi({ ...q, id: qId }, idx);
  });
}

function isModuleAssessmentItem(l: WizardLessonInput): boolean {
  const t = (l.title || '').trim().toLowerCase();
  const c = (l.contentType || '').toUpperCase();
  return c === 'ASSESSMENT' || c === 'QUIZ' || t === 'module assessment' || t.startsWith('module assessment');
}

function isLessonAssessmentItem(sub: WizardLessonInput): boolean {
  const t = (sub.title || '').trim().toLowerCase();
  const c = (sub.contentType || '').toUpperCase();
  return c === 'ASSESSMENT' || c === 'QUIZ' || t === 'lesson assessment' || t.startsWith('lesson assessment');
}

function extractModuleAssessmentDef(mod: WizardModuleInput) {
  const item = mod.lessons.find((l) => isModuleAssessmentItem(l) && l.quizQuestions && l.quizQuestions.length > 0);
  if (!item || !item.quizQuestions || item.quizQuestions.length === 0) return null;
  return {
    title: item.title.trim() || 'Module Assessment',
    questions: item.quizQuestions,
    weight: item.quizWeight ?? 20,
    passMark: item.quizPassMark,
    timeLimitMinutes: item.quizTimeLimitMinutes,
    attemptsAllowed: item.quizAttemptsAllowed,
  };
}

function extractLessonAssessmentDef(lesson: WizardLessonInput) {
  // Check subLessons first
  const sub = (lesson.subLessons ?? []).find((s) => isLessonAssessmentItem(s) && s.quizQuestions && s.quizQuestions.length > 0);
  if (sub && sub.quizQuestions && sub.quizQuestions.length > 0) {
    return {
      title: sub.title.trim() || 'Lesson Assessment',
      questions: sub.quizQuestions,
      weight: sub.quizWeight ?? 20,
      passMark: sub.quizPassMark,
      timeLimitMinutes: sub.quizTimeLimitMinutes,
      attemptsAllowed: sub.quizAttemptsAllowed,
    };
  }

  // Check on lesson itself if configured as assessment
  if (isLessonAssessmentItem(lesson) && lesson.quizQuestions && lesson.quizQuestions.length > 0) {
    return {
      title: lesson.title.trim() || 'Lesson Assessment',
      questions: lesson.quizQuestions,
      weight: lesson.quizWeight ?? 20,
      passMark: lesson.quizPassMark,
      timeLimitMinutes: lesson.quizTimeLimitMinutes,
      attemptsAllowed: lesson.quizAttemptsAllowed,
    };
  }

  return null;
}

export async function syncCurriculumAndAssessments(courseId: string, rawModules: WizardModuleInput[], quiz?: Quiz): Promise<{ savedModules: ApiModule[] }> {
  // Filter instructional content to pass to replaceCurriculum
  const curriculumPayload = rawModules.map((mod) => {
    // Exclude module assessment dummy lesson rows from instructional lessons
    const instructionalLessons = mod.lessons.filter((l) => !isModuleAssessmentItem(l));
    const lessonsToSave =
      instructionalLessons.length > 0
        ? instructionalLessons
        : [
            {
              title: mod.title ? `${mod.title} - Overview` : 'Lesson 1',
              content: '',
              durationMin: 15,
              subLessons: [],
            },
          ];

    return moduleToCreateBody({
      title: mod.title,
      description: mod.description || 'Course module',
      objectives: mod.objectives,
      durationMinutes: mod.durationMinutes,
      attachments: toAttachmentBodies(mod.attachments, mod.resources, mod.resourceUrl, mod.fileName, mod.fileSize),
      lessons: lessonsToSave.map((lesson) => {
        const instructionalSubLessons = (lesson.subLessons ?? []).filter((s) => !isLessonAssessmentItem(s));
        const lessonType = normalizeLessonContentType(lesson.contentType);
        const isLessonMedia = lessonType === 'VIDEO' || lessonType === 'AUDIO' || lessonType === 'PRESENTATION';

        return {
          title: lesson.title,
          content: lesson.content,
          durationMinutes: lesson.durationMin,
          contentType: lessonType,
          resourceUrl: lesson.resourceUrl,
          attachments: toAttachmentBodies(lesson.attachments, lesson.resources, lesson.resourceUrl, lesson.fileName, lesson.fileSize, isLessonMedia),
          subLessons: instructionalSubLessons.map((sub) => {
            const subType = normalizeLessonContentType(sub.contentType);
            const isSubMedia = subType === 'VIDEO' || subType === 'AUDIO' || subType === 'PRESENTATION';

            return {
              title: sub.title,
              content: sub.content,
              durationMinutes: sub.durationMin,
              contentType: subType,
              resourceUrl: sub.resourceUrl,
              attachments: toAttachmentBodies(sub.attachments, sub.resources, sub.resourceUrl, sub.fileName, sub.fileSize, isSubMedia),
            };
          }),
        };
      }),
    });
  });

  await replaceCurriculum(courseId, curriculumPayload);

  // Fetch updated curriculum modules from backend to obtain their generated IDs
  const savedModules = await fetchCourseModules(courseId);

  // Assessment failures are collected rather than aborting, so one bad quiz doesn't
  // block the rest, but they are reported to the caller instead of being swallowed.
  const failures: string[] = [];
  const failureText = (label: string, err: unknown) => `${label}: ${errorMessage(err, 'request failed')}`;

  // Loop through modules and create module & lesson assessments
  for (let mIdx = 0; mIdx < rawModules.length; mIdx++) {
    const rawMod = rawModules[mIdx];
    const savedMod = savedModules[mIdx];
    if (!savedMod) continue;

    // 1. Module-level assessment
    const modAssess = extractModuleAssessmentDef(rawMod);
    if (modAssess && modAssess.questions.length > 0) {
      try {
        await createModuleAssessment(courseId, savedMod.id, {
          titleEn: modAssess.title,
          titleAm: modAssess.title,
          passingScore: modAssess.passMark,
          weight: modAssess.weight,
          maxAttempts: modAssess.attemptsAllowed ?? 3,
          timeLimitMinutes: modAssess.timeLimitMinutes,
          questions: formatQuestionsForApi(modAssess.questions),
        });
      } catch (err) {
        failures.push(failureText(`Module assessment "${modAssess.title}"`, err));
      }
    }

    // 2. Lesson-level assessments
    const instructionalLessons = rawMod.lessons.filter((l) => !isModuleAssessmentItem(l));
    for (let lIdx = 0; lIdx < instructionalLessons.length; lIdx++) {
      const rawLesson = instructionalLessons[lIdx];
      const savedLesson = savedMod.lessons?.[lIdx];
      if (!savedLesson) continue;

      const lessonAssess = extractLessonAssessmentDef(rawLesson);
      if (lessonAssess && lessonAssess.questions.length > 0) {
        try {
          await createLessonAssessment(courseId, savedMod.id, savedLesson.id, {
            titleEn: lessonAssess.title,
            titleAm: lessonAssess.title,
            passingScore: lessonAssess.passMark,
            weight: lessonAssess.weight,
            maxAttempts: lessonAssess.attemptsAllowed ?? 3,
            timeLimitMinutes: lessonAssess.timeLimitMinutes,
            questions: formatQuestionsForApi(lessonAssess.questions),
          });
        } catch (err) {
          failures.push(failureText(`Lesson assessment "${lessonAssess.title}"`, err));
        }
      }
    }
  }

  // 3. Final assessment
  if (quiz && quiz.questions.length > 0) {
    try {
      const quizTitle = quiz.title.trim() || 'Final Assessment';
      await replaceAssessment(courseId, {
        titleEn: quizTitle,
        titleAm: quizTitle,
        passingScore: quiz.passMark,
        weight: quiz.weight ?? 60,
        maxAttempts: quiz.attemptsAllowed,
        timeLimitMinutes: quiz.timeLimitMinutes,
        questions: formatQuestionsForApi(quiz.questions),
      });
    } catch (err) {
      failures.push(failureText('Final assessment', err));
    }
  }

  if (failures.length > 0) {
    throw new Error(`Course content saved, but some assessments were not: ${failures.join('; ')}`);
  }

  return { savedModules };
}
