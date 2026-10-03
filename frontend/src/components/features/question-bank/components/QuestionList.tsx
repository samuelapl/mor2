'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Skeleton';
import type { usePagination } from '@/lib/usePagination';
import type { BankQuestion } from '../types';
import { QuestionCard } from './QuestionCard';

interface QuestionListProps {
  loading: boolean;
  filteredQuestions: BankQuestion[];
  page: ReturnType<typeof usePagination<BankQuestion>>;
  onAddQuestion: () => void;
  onDuplicate: (q: BankQuestion) => void;
  onEdit: (q: BankQuestion) => void;
  onDelete: (q: BankQuestion) => void;
}

/** Question cards (or empty state) and pagination. */
export function QuestionList({
  loading,
  filteredQuestions,
  page,
  onAddQuestion,
  onDuplicate,
  onEdit,
  onDelete,
}: QuestionListProps) {
  return (
    <>
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton count={4} />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <EmptyState
          title="No questions prepared yet for this content item"
          description="Add targeted questions for this module, lesson, or course so trainers can import or randomly generate them during live classes."
        >
          <Button size="sm" onClick={onAddQuestion} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {page.pageItems.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              number={(page.page - 1) * page.pageSize + idx + 1}
              onDuplicate={() => onDuplicate(q)}
              onEdit={() => onEdit(q)}
              onDelete={() => onDelete(q)}
            />
          ))}
        </div>
      )}

      <Pagination
        page={page.page}
        totalPages={page.totalPages}
        onPageChange={page.setPage}
        totalItems={page.totalItems}
        pageSize={page.pageSize}
        onPageSizeChange={page.setPageSize}
        pageSizeOptions={[5, 10, 20, 50]}
      />
    </>
  );
}
