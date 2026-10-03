'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { usePermissions } from '@/lib/usePermissions';
import { CourseCreationWizard } from '../CourseCreationWizard';
import { useCourseReview } from './hooks/useCourseReview';
import { useCourseActions } from './hooks/useCourseActions';
import { buildIssueMap, buildNodeOrder, sameNode } from './nodes';
import type { ReviewNode } from './types';
import { ReviewHeader } from './ReviewHeader';
import { ReviewSidebar } from './ReviewSidebar';
import { OverviewStage } from './stages/OverviewStage';
import { ModuleStage } from './stages/ModuleStage';
import { LessonStage } from './stages/LessonStage';
import { AssessmentStage } from './stages/AssessmentStage';
import { ApprovalHistoryStage } from './stages/ApprovalHistoryStage';
import { SessionPlanStage } from './stages/SessionPlanStage';
import { RejectDialog } from './dialogs/RejectDialog';
import { PublishDialog } from './dialogs/PublishDialog';
import { ConfirmActionDialog } from './dialogs/ConfirmActionDialog';

/** Staff who may open the review page. Learners (course.browse only) use the classroom instead. */
const REVIEW_PERMISSIONS = ['course.view.own', 'course.view.all', 'course.view.assigned', 'course.create', 'course.approve_reject', 'course.publish'];

export function CourseReviewShell({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { tBilingual } = useTranslation();
  const { canAny } = usePermissions();

  const { ready, course, assessments, assessmentsLoading, reloadAssessments, selectedNode, setSelectedNode } = useCourseReview(courseId);
  const actions = useCourseActions(course, { onDeleted: () => router.push('/courses') });

  const [editing, setEditing] = useState(false);
  /** Which reason dialog is open: rejecting a submission or withdrawing an approval. */
  const [reasonDialog, setReasonDialog] = useState<'reject' | 'returnToDraft' | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);

  const order = useMemo(() => (course ? buildNodeOrder(course, assessments) : []), [course, assessments]);
  const issues = useMemo(() => (course ? buildIssueMap(course, assessments) : {}), [course, assessments]);
  const position = order.findIndex((n) => sameNode(n, selectedNode));

  // A deep link or a deleted item can point at a node that no longer exists; fall back to the overview.
  useEffect(() => {
    if (course && !assessmentsLoading && position === -1) setSelectedNode({ type: 'OVERVIEW' });
  }, [course, assessmentsLoading, position, setSelectedNode]);

  const stageRef = useRef<HTMLElement>(null);
  const select = (node: ReviewNode) => {
    setSelectedNode(node);
    stageRef.current?.scrollTo({ top: 0 });
  };

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/courses');
  };

  const handlePublish = () => {
    if (actions.hasTrainer || !actions.requiresTrainer) {
      void actions.publish();
    } else if (actions.can.assignTrainer) {
      setPublishOpen(true);
    } else {
      toast.error('This course has planned sessions. Assign a trainer before publishing it.');
    }
  };

  if (!ready) {
    return (
      <FullScreenMessage icon={<Loader2 className="h-6 w-6 animate-spin text-indigo-600" />} title={tBilingual('Loading course…', 'ኮርስ በመጫን ላይ…')} />
    );
  }

  if (!canAny(REVIEW_PERMISSIONS)) {
    return (
      <FullScreenMessage
        icon={<ShieldAlert className="h-6 w-6 text-rose-500" />}
        title={tBilingual('You do not have access to course review', 'የኮርስ ግምገማ ፈቃድ የለዎትም')}
        action={<Button onClick={() => router.push('/')}>{tBilingual('Go home', 'ወደ መነሻ')}</Button>}
      />
    );
  }

  if (!course) {
    return (
      <FullScreenMessage
        icon={<ShieldAlert className="h-6 w-6 text-slate-400" />}
        title={tBilingual('Course not found', 'ኮርሱ አልተገኘም')}
        subtitle={tBilingual('It may have been deleted, or you may not have access to it.', 'ተሰርዞ ሊሆን ይችላል ወይም ፈቃድ የለዎትም።')}
        action={<Button onClick={() => router.push('/courses')}>{tBilingual('Back to courses', 'ወደ ኮርሶች')}</Button>}
      />
    );
  }

  const renderStage = () => {
    const mod = course.modules.find((m) => m.id === selectedNode.moduleId);
    const moduleIndex = mod ? course.modules.indexOf(mod) : -1;
    const lesson = mod?.lessons.find((l) => l.id === selectedNode.lessonId);
    const lessonIndex = lesson && mod ? mod.lessons.indexOf(lesson) : -1;

    switch (selectedNode.type) {
      case 'MODULE':
        if (!mod) break;
        return (
          <ModuleStage
            module={mod}
            index={moduleIndex}
            assessment={assessments.byModule[mod.id]}
            lessonAssessments={assessments.byLesson}
            onSelectNode={select}
          />
        );
      case 'LESSON':
        if (!mod || !lesson) break;
        return (
          <LessonStage
            lesson={lesson}
            number={`${moduleIndex + 1}.${lessonIndex + 1}`}
            moduleTitle={mod.title}
            moduleId={mod.id}
            assessment={assessments.byLesson[lesson.id]}
            onSelectNode={select}
          />
        );
      case 'SUB_LESSON': {
        const sub = lesson?.subLessons?.find((s) => s.id === selectedNode.subLessonId);
        if (!mod || !lesson || !sub) break;
        return (
          <LessonStage
            lesson={sub}
            number={`${moduleIndex + 1}.${lessonIndex + 1}.${(lesson.subLessons ?? []).indexOf(sub) + 1}`}
            moduleTitle={mod.title}
            moduleId={mod.id}
            parentLesson={lesson}
            onSelectNode={select}
          />
        );
      }
      case 'MODULE_ASSESSMENT':
        if (!mod || !assessments.byModule[mod.id]) break;
        return <AssessmentStage scope="MODULE_ASSESSMENT" assessments={[assessments.byModule[mod.id]]} parentTitle={mod.title} />;
      case 'LESSON_ASSESSMENT':
        if (!lesson || !assessments.byLesson[lesson.id]) break;
        return <AssessmentStage scope="LESSON_ASSESSMENT" assessments={[assessments.byLesson[lesson.id]]} parentTitle={lesson.title} />;
      case 'FINAL_ASSESSMENT':
        if (assessments.final.length === 0) break;
        return <AssessmentStage scope="FINAL_ASSESSMENT" assessments={assessments.final} />;
      case 'SESSION_PLAN': {
        const index = (course.sessionPlans ?? []).findIndex((p) => p.id === selectedNode.sessionPlanId);
        if (index === -1) break;
        const plan = course.sessionPlans![index]!;
        return (
          <SessionPlanStage
            plan={plan}
            index={index}
            courseStatus={course.status}
            quizAssessments={assessments.all.filter((a) => plan.quizzes.some((q) => q.id === a.id))}
          />
        );
      }
      case 'APPROVAL_HISTORY':
        return <ApprovalHistoryStage course={course} />;
      default:
        break;
    }
    return (
      <OverviewStage
        course={course}
        assessments={assessments}
        canEdit={actions.can.edit}
        onEdit={() => setEditing(true)}
        // Trainers run planned sessions; a self-paced course has no trainer section.
        canAssignTrainer={actions.can.assignTrainer && actions.requiresTrainer}
        trainerOptions={actions.trainerOptions}
        busy={actions.busy}
        onAssignTrainer={(id) => void actions.assignTrainer(id)}
        onRemoveTrainer={(id) => void actions.removeTrainer(id)}
      />
    );
  };

  const prev = position > 0 ? order[position - 1] : undefined;
  const next = position >= 0 && position < order.length - 1 ? order[position + 1] : undefined;
  const courseLabel = `${course.code} — ${course.title}`;
  // `rejectionReason` is the latest rejection; `lastRejectionReason` is the one before it.
  const latestRejection = course.status === 'rejected' ? course.rejectionReason || course.lastRejectionReason : undefined;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-800 antialiased">
      <ReviewHeader
        course={course}
        can={actions.can}
        busy={actions.busy}
        onBack={goBack}
        onEdit={() => setEditing(true)}
        onSubmit={() => void actions.submit()}
        onReject={() => setReasonDialog('reject')}
        onReturnToDraft={() => setReasonDialog('returnToDraft')}
        onApprove={() => void actions.approve()}
        onPublish={handlePublish}
        onUnpublish={() => void actions.unpublish()}
        onArchive={() => setConfirmAction('archive')}
        onDelete={() => setConfirmAction('delete')}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <ReviewSidebar course={course} assessments={assessments} selectedNode={selectedNode} onSelectNode={select} issues={issues} />
        </div>

        <main ref={stageRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-12">
          <div className="mx-auto max-w-5xl space-y-6 pb-10">
            {latestRejection && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800">
                <p className="font-bold">{tBilingual('Rejected — reason from reviewer', 'ውድቅ ተደርጓል — የገምጋሚ ምክንያት')}</p>
                <div className="mt-1" dangerouslySetInnerHTML={{ __html: latestRejection }} />
              </div>
            )}

            {assessmentsLoading && selectedNode.type !== 'OVERVIEW' && selectedNode.type !== 'APPROVAL_HISTORY' ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tBilingual('Loading assessments…', 'ምዘናዎች በመጫን ላይ…')}
              </div>
            ) : (
              renderStage()
            )}

            {/* Previous / Next follow the sidebar order */}
            <nav className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <Button variant="outline" size="sm" disabled={!prev} onClick={() => prev && select(prev)} className="gap-1.5 text-xs">
                <ChevronLeft className="h-4 w-4" />
                {tBilingual('Previous', 'ቀዳሚ')}
              </Button>
              <span className="text-xs text-slate-400">{position >= 0 ? `${position + 1} / ${order.length}` : ''}</span>
              <Button variant="outline" size="sm" disabled={!next} onClick={() => next && select(next)} className="gap-1.5 text-xs">
                {tBilingual('Next', 'ቀጣይ')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </main>
      </div>

      <RejectDialog
        open={reasonDialog !== null}
        mode={reasonDialog ?? 'reject'}
        onClose={() => setReasonDialog(null)}
        courseLabel={courseLabel}
        busy={actions.busy}
        onConfirm={reasonDialog === 'returnToDraft' ? actions.returnToDraft : actions.reject}
      />
      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        courseLabel={courseLabel}
        trainerOptions={actions.trainerOptions}
        busy={actions.busy}
        onAssignAndPublish={actions.assignAndPublish}
      />
      <ConfirmActionDialog
        action={confirmAction}
        courseTitle={course.title}
        busy={actions.busy}
        onClose={() => setConfirmAction(null)}
        onConfirm={async (action) => {
          if (action === 'archive') await actions.archive();
          else await actions.remove();
          setConfirmAction(null);
        }}
      />

      {/* Editing happens in the Creator Studio, which mounts itself full-screen. */}
      {editing && (
        <CourseCreationWizard
          key={course.id}
          editingCourse={course}
          onDone={() => {
            setEditing(false);
            reloadAssessments();
          }}
          onCancel={() => {
            setEditing(false);
            reloadAssessments();
          }}
        />
      )}
    </div>
  );
}

function FullScreenMessage({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
      {icon}
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {subtitle && <p className="max-w-sm text-xs text-slate-500">{subtitle}</p>}
      {action}
    </div>
  );
}
