'use client';

import { BookOpen, ChevronRight, Globe, ListChecks, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ApiModule } from '@/lib/api/types';
import type { QuestionFiltersState } from '../../hooks/useQuestionFilters';
import type { QuestionEditorState } from '../../hooks/useQuestionEditor';
import type { ActiveCurriculumNode } from '../../types';
import { getCleanLessonTitle, getCleanModuleTitle, getCleanSubLessonTitle } from '../../utils';
import { QuestionFilters } from '../../components/QuestionFilters';
import { QuestionList } from '../../components/QuestionList';
import { StageHeader } from '../StageHeader';

interface BrowseStageProps {
  filters: QuestionFiltersState;
  editor: QuestionEditorState;
  modules: ApiModule[];
  loading: boolean;
  onRefresh: () => void;
}

/** "Module › Lesson › Sub-lesson" trail for the selected curriculum node. */
function nodeTrail(node: ActiveCurriculumNode, modules: ApiModule[]): string[] {
  if (node.type === 'ALL') return ['All questions'];
  if (node.type === 'GLOBAL') return ['Reusable global'];
  if (node.type === 'COURSE_GENERAL') return ['Course level'];
  const mod = modules.find((m) => m.id === (node.type === 'MODULE' ? node.id : node.moduleId));
  const les = mod?.lessons?.find((l) => l.id === (node.type === 'LESSON' ? node.id : node.lessonId));
  const sub = les?.subLessons?.find((s) => s.id === node.id);
  return [
    mod ? getCleanModuleTitle(mod.titleEn) : null,
    node.type !== 'MODULE' && les ? getCleanLessonTitle(les.titleEn) : null,
    node.type === 'SUB_LESSON' && sub ? getCleanSubLessonTitle(sub.titleEn) : null,
  ].filter((part): part is string => Boolean(part));
}

const NODE_ICON = { ALL: ListChecks, GLOBAL: Globe, COURSE_GENERAL: BookOpen } as const;

export function BrowseStage({ filters, editor, modules, loading, onRefresh }: BrowseStageProps) {
  const node = filters.activeCurriculumNode;
  const trail = nodeTrail(node, modules);
  const NodeIcon = NODE_ICON[node.type as keyof typeof NODE_ICON];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <StageHeader
        eyebrow="Question Bank"
        title={node.title}
        description={
          <span className="flex flex-wrap items-center gap-1 text-xs font-medium">
            {NodeIcon && <NodeIcon className="h-3.5 w-3.5 text-slate-400" />}
            {trail.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                <span className="max-w-[220px] truncate">{part}</span>
              </span>
            ))}
            <span className="mx-1.5 text-slate-300">•</span>
            <span>
              {filters.filteredQuestions.length} question{filters.filteredQuestions.length === 1 ? '' : 's'}
            </span>
          </span>
        }
        actions={
          <Button onClick={() => editor.openCreateQuestion(node)} className="shadow-sm">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        }
      />

      <QuestionFilters
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        filterType={filters.filterType}
        onFilterTypeChange={filters.setFilterType}
        filterScope={filters.filterScope}
        onFilterScopeChange={filters.setFilterScope}
        onRefresh={onRefresh}
        refreshing={loading}
      />

      <QuestionList
        loading={loading}
        filteredQuestions={filters.filteredQuestions}
        page={filters.questionsPage}
        onAddQuestion={() => editor.openCreateQuestion(node)}
        onDuplicate={editor.handleDuplicateQuestion}
        onEdit={editor.openEditQuestion}
        onDelete={editor.setDeletingQuestion}
      />
    </div>
  );
}
