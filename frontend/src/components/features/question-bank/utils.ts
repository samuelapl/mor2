import type { ApiQuestionBankQuestion } from '@/lib/api/quiz';
import type { BankQuestion, BankQuestionType } from './types';

export function getCleanModuleTitle(title?: string | null): string {
  if (!title) return '';
  return title.replace(/^(module\s*\d+|m\d+)[\s:.-]*/i, '').trim() || title;
}

export function getCleanLessonTitle(title?: string | null): string {
  if (!title) return '';
  return (
    title
      .replace(/^lesson\s*\d+(\.\d+)?[\s:.-]*/i, '')
      .replace(/^\d+\.\d+[\s:.-]*/, '')
      .trim() || title
  );
}

export function getCleanSubLessonTitle(title?: string | null): string {
  if (!title) return '';
  return (
    title
      .replace(/^sub-?lesson\s*(\d+\.?)*[\s:.-]*/i, '')
      .replace(/^\d+\.\d+\.\d+[\s:.-]*/, '')
      .trim() || title
  );
}

export function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim() || html;
}

/** Maps a question-bank API item to the shape the workspace renders. */
export function toBankQuestion(q: ApiQuestionBankQuestion): BankQuestion {
  let parsedAnswer: number | string | null = q.correctAnswer;
  if (q.type !== 'SHORT_ANSWER' && q.correctAnswer !== null && q.correctAnswer !== undefined) {
    const num = parseInt(q.correctAnswer, 10);
    if (!isNaN(num)) parsedAnswer = num;
  }
  return {
    id: q.id,
    type: q.type,
    question: q.question,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    correctAnswer: parsedAnswer,
    points: q.points || 10,
    courseId: q.courseId,
    moduleId: q.moduleId,
    lessonId: q.lessonId,
    subLessonId: q.subLessonId,
    category: q.category || 'General',
    isReusable: !q.courseId,
    module: q.module,
    lesson: q.lesson,
    subLesson: q.subLesson,
  };
}

/** Answer options as stored for each question type (blank choices dropped). */
export function optionsForType(type: BankQuestionType, options: string[]): string[] {
  if (type === 'TRUE_FALSE') return ['True', 'False'];
  if (type === 'SHORT_ANSWER') return [];
  return options.filter((o) => o.trim() !== '');
}

/** Correct answer as stored: the option index for choice questions, the text for short answer. */
export function correctAnswerForType(
  type: BankQuestionType,
  correctIndex: number,
  answerText: string,
): string | null {
  if (type === 'SHORT_ANSWER') return answerText.trim() ? answerText.trim() : null;
  return String(correctIndex);
}
