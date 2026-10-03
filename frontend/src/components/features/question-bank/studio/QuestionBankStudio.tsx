'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudioPortal } from '@/components/shared/StudioPortal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { ActiveCurriculumNode } from '../types';
import { stripHtml } from '../utils';
import { useBankCourses, type QuestionBankRole } from '../hooks/useBankCourses';
import { useBankData } from '../hooks/useBankData';
import { useQuestionFilters } from '../hooks/useQuestionFilters';
import { useQuestionEditor } from '../hooks/useQuestionEditor';
import type { StudioStage } from './types';
import { StudioHeader } from './StudioHeader';
import { StudioSidebar } from './StudioSidebar';
import { BrowseStage } from './stages/BrowseStage';
import { ComposeStage } from './stages/ComposeStage';

interface QuestionBankStudioProps {
  role: QuestionBankRole;
}

const ROLE_HOME: Record<QuestionBankRole, string> = {
  course_owner: '/course-owner',
  trainer: '/trainer',
};

/** Full-screen question store: header, curriculum sidebar, and a browse or compose stage. */
export function QuestionBankStudio({ role }: QuestionBankStudioProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Action waiting for the user to confirm discarding unsaved questions. */
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  const bankCourses = useBankCourses(role);
  const { selectedCourseId, currentCourse } = bankCourses;

  const data = useBankData(selectedCourseId);

  const filters = useQuestionFilters({
    questions: data.questions,
    courseModules: data.courseModules,
    selectedCourseId,
  });

  const editor = useQuestionEditor({
    selectedCourseId,
    courseModules: data.courseModules,
    activeCurriculumNode: filters.activeCurriculumNode,
    setQuestions: data.setQuestions,
  });

  // The editor flag decides the stage, so saving returns to the list exactly as before.
  const stage: StudioStage = editor.editorOpen ? 'COMPOSE' : 'BROWSE';

  const hasUnsavedQuestions =
    editor.editorOpen && !editor.editingQuestion && (editor.stagedQuestions.length > 0 || Boolean(editor.qText.trim()));

  /** Runs `action`, first asking to discard questions that were queued or typed but not saved. */
  const guard = (action: () => void) => {
    if (hasUnsavedQuestions) setPendingLeave(() => action);
    else action();
  };

  const selectNode = (node: ActiveCurriculumNode) =>
    guard(() => {
      editor.setEditorOpen(false);
      filters.setActiveCurriculumNode(node);
      setSidebarOpen(false);
    });

  const addQuestionAt = (node: ActiveCurriculumNode) =>
    guard(() => {
      editor.openCreateQuestion(node);
      setSidebarOpen(false);
    });

  const selectCourse = (id: string) =>
    guard(() => {
      editor.setEditorOpen(false);
      bankCourses.setSelectedCourseId(id);
    });

  const exit = () =>
    guard(() => {
      if (window.history.length > 1) router.back();
      else router.push(ROLE_HOME[role]);
    });

  const sidebarProps = {
    modules: data.courseModules,
    loading: data.loadingModules,
    courseQuestions: filters.courseQuestions,
    activeNode: filters.activeCurriculumNode,
    onSelectNode: selectNode,
    onAddQuestion: addQuestionAt,
    questionCounts: filters.questionCounts,
    expandedModules: filters.expandedModules,
    expandedLessons: filters.expandedLessons,
    onToggleModule: filters.toggleModuleAccordion,
    onToggleLesson: filters.toggleLessonAccordion,
  };

  return (
    <StudioPortal>
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-200">
        <StudioHeader
          role={role}
          stage={stage}
          onExit={exit}
          onToggleSidebar={() => setSidebarOpen(true)}
          questionCount={filters.courseQuestions.length}
          currentCourse={currentCourse}
          courses={bankCourses.filteredRelevantCourses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={selectCourse}
          courseSearch={bankCourses.courseSearch}
          onCourseSearchChange={bankCourses.setCourseSearch}
          courseFilterMode={bankCourses.courseFilterMode}
          onCourseFilterModeChange={bankCourses.setCourseFilterMode}
          totalCourseCount={bankCourses.courses.length}
          myCourseCount={bankCourses.myCourses.length}
        />

        <div className="relative flex flex-1 overflow-hidden">
          <StudioSidebar {...sidebarProps} className="hidden lg:flex" />

          {/* Mobile drawer */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Curriculum">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
              <StudioSidebar {...sidebarProps} onClose={() => setSidebarOpen(false)} className="relative max-w-[88vw] bg-slate-50 shadow-2xl dark:bg-slate-900" />
            </div>
          )}

          <main className="flex-1 overflow-y-auto bg-slate-50/70 px-4 py-6 sm:px-6 md:px-10 md:py-8 lg:px-12 dark:bg-slate-950">
            {stage === 'COMPOSE' ? (
              <ComposeStage
                editor={editor}
                courseModules={data.courseModules}
                currentCourse={currentCourse}
                onCancel={() => guard(() => editor.setEditorOpen(false))}
              />
            ) : (
              <BrowseStage
                filters={filters}
                editor={editor}
                modules={data.courseModules}
                loading={data.loadingQuestions}
                onRefresh={() => data.loadQuestions(selectedCourseId)}
              />
            )}
          </main>
        </div>

        <ConfirmModal
          open={Boolean(editor.deletingQuestion)}
          title="Delete Question from Bank"
          description={`Are you sure you want to delete this question? "${stripHtml(editor.deletingQuestion?.question).slice(0, 80)}..." This action cannot be undone.`}
          confirmText="Delete Question"
          variant="danger"
          isLoading={editor.isDeletingQuestion}
          onConfirm={editor.confirmDeleteQuestion}
          onClose={() => !editor.isDeletingQuestion && editor.setDeletingQuestion(null)}
        />

        <ConfirmModal
          open={pendingLeave !== null}
          title="Discard unsaved questions?"
          description={`You have ${editor.stagedQuestions.length + (editor.qText.trim() ? 1 : 0)} question(s) that are not saved to the bank yet. Leaving now will discard them.`}
          confirmText="Discard questions"
          variant="warning"
          onConfirm={() => {
            const action = pendingLeave;
            setPendingLeave(null);
            action?.();
          }}
          onClose={() => setPendingLeave(null)}
        />
      </div>
    </StudioPortal>
  );
}
