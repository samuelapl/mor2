import { useMemo, useState } from 'react';
import {
  bulkCreateQuestionBankItems,
  createQuestionBankItem,
  deleteQuestionBankItem,
  updateQuestionBankItem,
  type ApiQuestionBankQuestion,
} from '@/lib/api/quiz';
import type { ApiModule } from '@/lib/api/types';
import { toast } from '@/lib/toast';
import type {
  ActiveCurriculumNode,
  BankQuestion,
  BankQuestionType,
  StagedQuestion,
  TargetLevel,
} from '../types';
import { correctAnswerForType, optionsForType, toBankQuestion } from '../utils';

interface UseQuestionEditorArgs {
  selectedCourseId: string;
  courseModules: ApiModule[];
  activeCurriculumNode: ActiveCurriculumNode;
  setQuestions: React.Dispatch<React.SetStateAction<BankQuestion[]>>;
}

/** The question form, its batch queue, and create / update / duplicate / delete. */
export function useQuestionEditor({
  selectedCourseId,
  courseModules,
  activeCurriculumNode,
  setQuestions,
}: UseQuestionEditorArgs) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [stagedQuestions, setStagedQuestions] = useState<StagedQuestion[]>([]);

  const [qType, setQType] = useState<BankQuestionType>('MULTIPLE_CHOICE');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qAnswerText, setQAnswerText] = useState('');
  const [qPoints, setQPoints] = useState(10);
  const [qCategory, setQCategory] = useState('General');
  const [qIsReusable, setQIsReusable] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form states for target curriculum level
  const [targetLevel, setTargetLevel] = useState<TargetLevel>('COURSE_GENERAL');
  const [targetModuleId, setTargetModuleId] = useState<string>('');
  const [targetLessonId, setTargetLessonId] = useState<string>('');
  const [targetSubLessonId, setTargetSubLessonId] = useState<string>('');

  const [deletingQuestion, setDeletingQuestion] = useState<BankQuestion | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);

  // Derived options for the placement dropdowns
  const activeModule = useMemo(() => {
    return courseModules.find((m) => m.id === targetModuleId);
  }, [courseModules, targetModuleId]);

  const activeModuleLessons = useMemo(() => {
    return activeModule?.lessons || [];
  }, [activeModule]);

  const activeLesson = useMemo(() => {
    return activeModuleLessons.find((l) => l.id === targetLessonId);
  }, [activeModuleLessons, targetLessonId]);

  const activeLessonSubLessons = useMemo(() => {
    return activeLesson?.subLessons || [];
  }, [activeLesson]);

  const setTarget = (level: TargetLevel, moduleId = '', lessonId = '', subLessonId = '') => {
    setTargetLevel(level);
    setTargetModuleId(moduleId);
    setTargetLessonId(lessonId);
    setTargetSubLessonId(subLessonId);
  };

  /** Level dropdown change: clears the narrower targets and picks a default module. */
  const changeTargetLevel = (lvl: TargetLevel) => {
    setTargetLevel(lvl);
    if (lvl === 'COURSE_GENERAL') {
      setTargetModuleId('');
      setTargetLessonId('');
      setTargetSubLessonId('');
    } else if (lvl === 'MODULE') {
      if (!targetModuleId && courseModules.length > 0) {
        setTargetModuleId(courseModules[0].id);
      }
      setTargetLessonId('');
      setTargetSubLessonId('');
    } else if (lvl === 'LESSON') {
      if (!targetModuleId && courseModules.length > 0) {
        setTargetModuleId(courseModules[0].id);
      }
      setTargetSubLessonId('');
    }
  };

  const changeTargetModule = (moduleId: string) => {
    setTargetModuleId(moduleId);
    setTargetLessonId('');
    setTargetSubLessonId('');
  };

  const changeTargetLesson = (lessonId: string) => {
    setTargetLessonId(lessonId);
    setTargetSubLessonId('');
  };

  const resetQuestionFields = () => {
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrectIndex(0);
    setQAnswerText('');
  };

  const openCreateQuestion = (node?: ActiveCurriculumNode) => {
    const target = node || activeCurriculumNode;
    setEditingQuestion(null);
    setStagedQuestions([]);
    setQType('MULTIPLE_CHOICE');
    resetQuestionFields();
    setQPoints(10);
    setQCategory('General');
    setSaveError(null);

    if (target.type === 'GLOBAL') {
      setQIsReusable(true);
      setTarget('GLOBAL');
    } else if (target.type === 'MODULE') {
      setQIsReusable(false);
      setTarget('MODULE', target.moduleId || target.id || '');
    } else if (target.type === 'LESSON') {
      setQIsReusable(false);
      setTarget('LESSON', target.moduleId || '', target.lessonId || target.id || '');
    } else if (target.type === 'SUB_LESSON') {
      setQIsReusable(false);
      setTarget(
        'SUB_LESSON',
        target.moduleId || '',
        target.lessonId || '',
        target.subLessonId || target.id || '',
      );
    } else {
      setQIsReusable(false);
      setTarget('COURSE_GENERAL');
    }

    setEditorOpen(true);
  };

  const openEditQuestion = (q: BankQuestion) => {
    setEditingQuestion(q);
    setStagedQuestions([]);
    setQType(q.type);
    setQText(q.question);
    setQOptions(q.options.length > 0 ? q.options : ['', '', '', '']);
    setQCorrectIndex(typeof q.correctAnswer === 'number' ? q.correctAnswer : 0);
    setQAnswerText(typeof q.correctAnswer === 'string' ? q.correctAnswer : '');
    setQPoints(q.points || 10);
    setQCategory(q.category || 'General');
    setQIsReusable(!q.courseId);
    setSaveError(null);

    if (!q.courseId) {
      setTarget('GLOBAL');
    } else if (q.subLessonId) {
      setTarget('SUB_LESSON', q.moduleId || '', q.lessonId || '', q.subLessonId);
    } else if (q.lessonId) {
      setTarget('LESSON', q.moduleId || '', q.lessonId);
    } else if (q.moduleId) {
      setTarget('MODULE', q.moduleId);
    } else {
      setTarget('COURSE_GENERAL');
    }

    setEditorOpen(true);
  };

  const handleAddQuestionToBatch = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!qText.trim()) {
      setSaveError('Please enter question prompt before adding.');
      return;
    }

    const options = optionsForType(qType, qOptions);
    if (qType === 'MULTIPLE_CHOICE' && options.length < 2) {
      setSaveError('Please provide at least 2 non-empty answer choices.');
      return;
    }

    const newStaged: StagedQuestion = {
      id: `staged-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: qType,
      question: qText.trim(),
      options,
      correctAnswer: correctAnswerForType(qType, qCorrectIndex, qAnswerText),
      points: qPoints,
      category: qCategory.trim() || 'General',
    };

    setStagedQuestions((prev) => [...prev, newStaged]);
    // Reset inputs for next question, preserving curriculum target level & parameters
    resetQuestionFields();
    setSaveError(null);
    toast.success(`Question added to queue! (${stagedQuestions.length + 1} ready to save)`);
  };

  const handleEditStagedQuestion = (idx: number) => {
    const sq = stagedQuestions[idx];
    if (!sq) return;
    setQType(sq.type);
    setQText(sq.question);
    setQOptions(
      sq.options.length > 0
        ? sq.options.length >= 4
          ? sq.options
          : [...sq.options, ...Array(4 - sq.options.length).fill('')]
        : ['', '', '', ''],
    );
    if (sq.type === 'SHORT_ANSWER') {
      setQAnswerText(sq.correctAnswer || '');
    } else {
      const parsed = parseInt(sq.correctAnswer || '0', 10);
      setQCorrectIndex(!isNaN(parsed) ? parsed : 0);
    }
    setQPoints(sq.points || 10);
    setQCategory(sq.category || 'General');
    setStagedQuestions((prev) => prev.filter((_, i) => i !== idx));
    toast.info('Question loaded back into form for editing.');
  };

  const removeStagedQuestion = (idx: number) => {
    setStagedQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearStagedQuestions = () => setStagedQuestions([]);

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasCurrentText = !!qText.trim();
    if (!hasCurrentText && stagedQuestions.length === 0) {
      setSaveError('Please enter a question prompt or add at least one question before saving.');
      return;
    }

    setSavingQuestion(true);
    setSaveError(null);

    const isGlobal = targetLevel === 'GLOBAL' || qIsReusable;
    const finalModuleId =
      !isGlobal &&
      (targetLevel === 'MODULE' || targetLevel === 'LESSON' || targetLevel === 'SUB_LESSON')
        ? targetModuleId || null
        : null;
    const finalLessonId =
      !isGlobal && (targetLevel === 'LESSON' || targetLevel === 'SUB_LESSON')
        ? targetLessonId || null
        : null;
    const finalSubLessonId =
      !isGlobal && targetLevel === 'SUB_LESSON' ? targetSubLessonId || null : null;

    try {
      if (editingQuestion) {
        const payload = {
          courseId: isGlobal ? null : selectedCourseId,
          moduleId: finalModuleId,
          lessonId: finalLessonId,
          subLessonId: finalSubLessonId,
          type: qType,
          question: qText.trim(),
          options: optionsForType(qType, qOptions),
          correctAnswer: correctAnswerForType(qType, qCorrectIndex, qAnswerText),
          points: qPoints,
          category: qCategory.trim() || 'General',
        };

        const updated = await updateQuestionBankItem(editingQuestion.id, payload);
        const mapped = toBankQuestion(updated);
        setQuestions((prev) =>
          prev.map((item) => (item.id === editingQuestion.id ? mapped : item)),
        );
        toast.success('Question updated successfully!');
      } else {
        const batchItems: StagedQuestion[] = [...stagedQuestions];

        if (hasCurrentText) {
          const options = optionsForType(qType, qOptions);
          if (qType === 'MULTIPLE_CHOICE' && options.length < 2) {
            setSaveError('Current question needs at least 2 answer choices.');
            setSavingQuestion(false);
            return;
          }

          batchItems.push({
            id: `temp-${Date.now()}`,
            type: qType,
            question: qText.trim(),
            options,
            correctAnswer: correctAnswerForType(qType, qCorrectIndex, qAnswerText),
            points: qPoints,
            category: qCategory.trim() || 'General',
          });
        }

        const payloads = batchItems.map((item) => ({
          courseId: isGlobal ? null : selectedCourseId,
          moduleId: finalModuleId,
          lessonId: finalLessonId,
          subLessonId: finalSubLessonId,
          type: item.type,
          question: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer,
          points: item.points,
          category: item.category,
        }));

        let createdList: ApiQuestionBankQuestion[] = [];
        try {
          createdList = await bulkCreateQuestionBankItems(payloads);
        } catch {
          // Fallback to sequential creation if bulk endpoint encountered error
          for (const p of payloads) {
            const res = await createQuestionBankItem(p);
            createdList.push(res);
          }
        }

        const mappedList = createdList.map(toBankQuestion);
        setQuestions((prev) => [...mappedList, ...prev]);
        setStagedQuestions([]);
        toast.success(
          mappedList.length > 1
            ? `Successfully saved ${mappedList.length} questions to question bank!`
            : 'Question added to question bank!',
        );
      }
      setEditorOpen(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save question to bank');
      toast.error(err?.message || 'Failed to save question to bank');
    } finally {
      setSavingQuestion(false);
    }
  };

  const confirmDeleteQuestion = async () => {
    if (!deletingQuestion) return;
    setIsDeletingQuestion(true);
    try {
      await deleteQuestionBankItem(deletingQuestion.id);
      setQuestions((prev) => prev.filter((q) => q.id !== deletingQuestion.id));
      toast.success('Question deleted from bank successfully.');
      setDeletingQuestion(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete question.');
    } finally {
      setIsDeletingQuestion(false);
    }
  };

  const handleDuplicateQuestion = async (q: BankQuestion) => {
    try {
      const created = await createQuestionBankItem({
        courseId: q.courseId,
        moduleId: q.moduleId,
        lessonId: q.lessonId,
        subLessonId: q.subLessonId,
        type: q.type,
        question: `${q.question} (Copy)`,
        options: q.options,
        correctAnswer:
          q.correctAnswer !== undefined && q.correctAnswer !== null
            ? String(q.correctAnswer)
            : null,
        points: q.points,
        category: q.category,
      });
      setQuestions((prev) => [toBankQuestion(created), ...prev]);
      toast.success('Question duplicated successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to duplicate question.');
    }
  };

  return {
    editorOpen,
    setEditorOpen,
    editingQuestion,
    stagedQuestions,
    qType,
    setQType,
    qText,
    setQText,
    qOptions,
    setQOptions,
    qCorrectIndex,
    setQCorrectIndex,
    qAnswerText,
    setQAnswerText,
    qIsReusable,
    setQIsReusable,
    savingQuestion,
    saveError,
    targetLevel,
    targetModuleId,
    targetLessonId,
    targetSubLessonId,
    setTargetSubLessonId,
    changeTargetLevel,
    changeTargetModule,
    changeTargetLesson,
    activeModuleLessons,
    activeLessonSubLessons,
    openCreateQuestion,
    openEditQuestion,
    handleAddQuestionToBatch,
    handleEditStagedQuestion,
    removeStagedQuestion,
    clearStagedQuestions,
    handleSaveQuestion,
    deletingQuestion,
    setDeletingQuestion,
    isDeletingQuestion,
    confirmDeleteQuestion,
    handleDuplicateQuestion,
  };
}

export type QuestionEditorState = ReturnType<typeof useQuestionEditor>;
