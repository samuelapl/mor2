'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardPen,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Film,
  Globe2,
  Headphones,
  HelpCircle,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Paperclip,
  Pencil,
  Presentation,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Badge, CourseStatusBadge, courseLevelLabel, courseLevelVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { RichContent, stripHtmlTags } from '@/components/ui/RichContent';
import { RichTextArea } from '@/components/ui/RichTextArea';
import { CourseCreationWizard } from '@/components/features/courses/CourseCreationWizard';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLms } from '@/lib/lms-store';
import { usePermissions } from '@/lib/usePermissions';
import { fetchAssessment, fetchCourseAssessments } from '@/lib/api/quiz';
import { fetchTrainers } from '@/lib/api/users';
import { userFromApi } from '@/lib/api/transform';
import type { ApiAssessment, ApiAssessmentQuestion } from '@/lib/api/types';
import type { UploadedResource, User } from '@/types';
import { cn } from '@/lib/utils';
import { AttachmentCard } from './detail/AttachmentCard';
import { CourseCurriculumSection } from './detail/CourseCurriculumSection';
import { AssessmentDetailSection } from './detail/AssessmentDetailSection';
import { getItemAttachments } from './wizard-components';

interface CourseDetailModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  /**
   * @deprecated Review actions now derive from permissions + course status
   */
  reviewActions?: {
    onApprove: () => void;
    onReject: () => void;
  };
}

export function CourseDetailModal({ open, onClose, courseId }: CourseDetailModalProps) {
  const { tBilingual, isAmharic } = useTranslation();
  const {
    courseById,
    userName,
    assignTrainerToCourse,
    unassignTrainerFromCourse,
    submitForApproval,
    approveCourse,
    rejectCourse,
    publishCourse,
    unpublishCourse,
    archiveCourse,
    deleteCourse,
  } = useLms();
  const course = courseById(courseId);
  const [assessments, setAssessments] = useState<ApiAssessment[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [flashError, setFlashError] = useState(false);
  const [trainerOptions, setTrainerOptions] = useState<User[]>([]);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [needsTrainerForPublish, setNeedsTrainerForPublish] = useState(false);
  const [publishTrainerId, setPublishTrainerId] = useState('');
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { can, hasRole } = usePermissions();
  const canAssignTrainer = can('course.assign_trainer');
  const canUnpublish = can('course.unpublish');
  const canPublish = can('course.publish') && course?.status === 'approved' && !course.published;

  // Initialize all module and lesson IDs for default-expanded review view
  const allModuleIds = useMemo(() => new Set((course?.modules || []).map((m) => m.id)), [course?.modules]);
  const allLessonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of course?.modules || []) {
      for (const l of m.lessons || []) {
        ids.add(l.id);
        if (l.subLessons) {
          for (const s of l.subLessons) {
            ids.add(s.id);
          }
        }
      }
    }
    return ids;
  }, [course?.modules]);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  // Keep expanded states sync'd on open
  useEffect(() => {
    if (open && course?.modules) {
      setExpandedModules(new Set(course.modules.map((m) => m.id)));
      const lIds = new Set<string>();
      for (const m of course.modules) {
        for (const l of m.lessons || []) {
          lIds.add(l.id);
          if (l.subLessons) {
            for (const s of l.subLessons) {
              lIds.add(s.id);
            }
          }
        }
      }
      setExpandedLessons(lIds);
    }
  }, [open, course?.modules]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLesson = (id: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModules(allModuleIds);
    setExpandedLessons(allLessonIds);
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedLessons(new Set());
  };

  // Aggregated totals (unconditionally declared at the top level)
  const totalLessons = useMemo(() => (course?.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0), [course?.modules]);

  const totalSubLessons = useMemo(
    () => (course?.modules || []).reduce((sum, m) => sum + (m.lessons || []).reduce((s, l) => s + (l.subLessons?.length || 0), 0), 0),
    [course?.modules],
  );

  const courseLevelAttachments: UploadedResource[] = useMemo(() => {
    return (course?.attachments || []).map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      type: a.type,
    }));
  }, [course?.attachments]);

  const totalAttachments = useMemo(() => {
    let count = courseLevelAttachments.length;
    for (const m of course?.modules || []) {
      count += getItemAttachments(m).length;
      for (const l of m.lessons || []) {
        count += getItemAttachments(l).length;
        if (l.subLessons) {
          for (const s of l.subLessons) {
            count += getItemAttachments(s).length;
          }
        }
      }
    }
    for (const ass of assessments) {
      if (ass.resourceUrl) count += 1;
    }
    return count;
  }, [course?.modules, courseLevelAttachments, assessments]);

  const totalQuestions = useMemo(() => {
    return assessments.reduce((sum, ass) => sum + (ass.questions?.length || 0), 0);
  }, [assessments]);

  const totalEstimatedDurationMin = useMemo(() => {
    let total = 0;
    for (const m of course?.modules || []) {
      if (m.durationMinutes) {
        total += m.durationMinutes;
      } else {
        const lessonDuration = (m.lessons || []).reduce((s, l) => {
          const subSum = (l.subLessons || []).reduce((ss, sub) => ss + (sub.durationMin || 0), 0);
          return s + (l.durationMin || 0) + subSum;
        }, 0);
        total += lessonDuration || 60;
      }
    }
    return total;
  }, [course?.modules]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAssessments([]);
    setFlash(null);
    setFlashError(false);
    setMode('view');
    setRejectOpen(false);
    setReason('');
    setReasonError(null);
    setNeedsTrainerForPublish(false);
    setPublishTrainerId('');
    setAssessmentLoading(true);
    (async () => {
      try {
        const list = await fetchCourseAssessments(courseId);
        if (cancelled || list.length === 0) return;
        const details = await Promise.all(list.map((item) => fetchAssessment(item.id)));
        if (!cancelled) setAssessments(details);
      } catch {
        // assessment preview is best-effort
      } finally {
        if (!cancelled) setAssessmentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, courseId]);

  useEffect(() => {
    if (!open || !(canAssignTrainer || canPublish)) {
      setTrainerOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTrainers();
        if (!cancelled) {
          setTrainerOptions(res.data.map(userFromApi).filter((u) => u.status === 'active'));
        }
      } catch {
        // trainer picker is best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, canAssignTrainer, canPublish]);

  if (!course) return null;

  const notify = (ok: boolean, message: string) => {
    setFlashError(!ok);
    setFlash(message);
    if (ok) {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const addTrainer = async (trainerId: string) => {
    if (!trainerId) return;
    const result = await assignTrainerToCourse(course.id, trainerId);
    notify(result.ok, result.ok ? 'Trainer assigned.' : result.message);
  };

  const removeTrainer = async (trainerId: string) => {
    const result = await unassignTrainerFromCourse(course.id, trainerId);
    notify(result.ok, result.ok ? 'Trainer removed.' : result.message);
  };

  const doPublish = async () => {
    if (!course.trainerId) {
      if (canAssignTrainer) {
        setPublishTrainerId('');
        setNeedsTrainerForPublish(true);
      } else {
        notify(false, 'Assign a trainer before publishing the course.');
      }
      return;
    }
    setBusy(true);
    const result = await publishCourse(course.id);
    setBusy(false);
    notify(result.ok, result.ok ? 'Course published. Learners can now enroll.' : result.message);
  };

  const doAssignAndPublish = async () => {
    if (!publishTrainerId) return;
    setBusy(true);
    const assigned = await assignTrainerToCourse(course.id, publishTrainerId);
    if (!assigned.ok) {
      setBusy(false);
      notify(false, assigned.message);
      return;
    }
    const result = await publishCourse(course.id);
    setBusy(false);
    setNeedsTrainerForPublish(false);
    notify(result.ok, result.ok ? 'Trainer assigned and course published.' : result.message);
  };

  const doUnpublish = async () => {
    setBusy(true);
    const result = await unpublishCourse(course.id);
    setBusy(false);
    notify(result.ok, result.ok ? 'Course unpublished. It no longer appears in the learner catalog.' : result.message);
  };

  const doSubmit = async () => {
    setBusy(true);
    const result = await submitForApproval(course.id);
    setBusy(false);
    notify(result.ok, result.ok ? 'Course submitted for approval.' : result.message);
  };

  const doApprove = async () => {
    setBusy(true);
    const result = await approveCourse(course.id);
    setBusy(false);
    notify(result.ok, result.ok ? 'Course approved.' : result.message);
  };

  const openReject = () => {
    setReason('');
    setReasonError(null);
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError('A reason is required.');
      return;
    }
    setBusy(true);
    const result = await rejectCourse(course.id, trimmed);
    setBusy(false);
    if (!result.ok) {
      setReasonError(result.message);
      return;
    }
    setRejectOpen(false);
    notify(true, 'Course rejected and moved back to draft. The owner has been notified.');
  };

  const doArchive = async () => {
    setBusy(true);
    const result = await archiveCourse(course.id);
    setBusy(false);
    setConfirmArchiveOpen(false);
    notify(result.ok, result.ok ? 'Course archived.' : result.message);
  };

  const doDelete = async () => {
    setBusy(true);
    const result = await deleteCourse(course.id);
    setBusy(false);
    setConfirmDeleteOpen(false);
    if (result.ok) {
      toast.success('Course deleted successfully.');
      onClose();
      return;
    }
    notify(false, result.message);
  };

  const isPrivilegedAdmin = hasRole('training_admin') || hasRole('system_admin');
  const canEdit = (can('course.update.own') || can('course.update.all')) && (course.status === 'draft' || course.status === 'rejected');
  const canSubmit = can('course.submit_approval') && (course.status === 'draft' || course.status === 'rejected');
  const canRejectAction = can('course.approve_reject') && course.status === 'under_review';
  const canApproveAction = can('course.approve_reject') && course.status === 'under_review';
  const canArchiveAction =
    can('course.archive') && course.status !== 'archived' && course.status !== 'under_review' && (isPrivilegedAdmin || course.status === 'draft');
  const canDeleteAction = can('course.delete') && course.status !== 'published' && (isPrivilegedAdmin || course.status === 'draft');

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canEdit ? (
        <Button size="sm" variant="outline" onClick={() => setMode('edit')} className="gap-1.5 shadow-2xs">
          <Pencil className="h-3.5 w-3.5" />
          {tBilingual('Edit course', 'ኮርስ አርትዕ')}
        </Button>
      ) : null}
      {canSubmit ? (
        <Button size="sm" disabled={busy} onClick={() => void doSubmit()} className="gap-1.5 shadow-2xs">
          <Send className="h-3.5 w-3.5" />
          {course.status === 'rejected' ? tBilingual('Resubmit for approval', 'ለማጽደቅ በድጋሚ ላክ') : tBilingual('Submit for approval', 'ለማጽደቅ ላክ')}
        </Button>
      ) : null}
      {canRejectAction ? (
        <Button size="sm" variant="danger" onClick={openReject} className="gap-1.5 shadow-2xs">
          {tBilingual('Reject', 'ውድቅ አድርግ')}
        </Button>
      ) : null}
      {canApproveAction ? (
        <Button
          size="sm"
          variant="success"
          disabled={busy}
          onClick={() => void doApprove()}
          className="gap-1.5 shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {tBilingual('Approve', 'አጽድቅ')}
        </Button>
      ) : null}
      {canPublish ? (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void doPublish()}
          className="gap-1.5 shadow-2xs bg-indigo-600 hover:bg-indigo-700 text-white"
          title={
            course.trainerId
              ? tBilingual('Publish this course to all learners', 'ይህንን ኮርስ ለሁሉም ሰልጣኞች አትም')
              : tBilingual('Assign a trainer before publishing', 'ከማተምዎ በፊት አሰልጣኝ ይመድቡ')
          }
        >
          <Globe2 className="h-3.5 w-3.5" />
          {tBilingual('Publish course', 'ኮርስ አትም')}
        </Button>
      ) : null}
      {canUnpublish && course.published ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void doUnpublish()}
          className="gap-1.5 shadow-2xs"
          title={tBilingual('Hide this course from the learner catalog', 'ይህን ኮርስ ከሰልጣኞች ካታሎግ ደብቅ')}
        >
          <Globe2 className="h-3.5 w-3.5" />
          {tBilingual('Unpublish course', 'ከህትመት አንሳ')}
        </Button>
      ) : null}
      {canArchiveAction ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmArchiveOpen(true)} className="gap-1.5 shadow-2xs">
          <Archive className="h-3.5 w-3.5" />
          {tBilingual('Archive course', 'ኮርስ አስቀምጥ')}
        </Button>
      ) : null}
      {canDeleteAction ? (
        <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirmDeleteOpen(true)} className="gap-1.5 shadow-2xs">
          <Trash2 className="h-3.5 w-3.5" />
          {tBilingual('Delete course', 'ኮርስ ሰርዝ')}
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <WorkspaceDetailOverlay
        open={open}
        onClose={onClose}
        title={
          mode === 'edit'
            ? `${tBilingual('Edit Course:', 'ኮርስ አርትዕ፡')} ${isAmharic ? (course as any).titleAm || course.title : course.title}`
            : isAmharic
              ? (course as any).titleAm || course.title
              : course.title
        }
        subtitle={
          mode === 'edit'
            ? `${course.code} · ${tBilingual('Update curriculum, objectives, materials, and assessment', 'ስርዓተ-ትምህርት፣ ዓላማዎችን፣ ሰነዶችን እና ምዘናዎችን ያሻሽሉ')}`
            : `${course.code} · ${course.category}`
        }
        badge={mode === 'edit' ? undefined : <CourseStatusBadge status={course.published ? 'published' : course.status} />}
        actions={mode === 'view' ? headerActions : undefined}
      >
        {mode === 'edit' ? (
          <div className="w-full">
            <CourseCreationWizard key={course.id} editingCourse={course} onDone={() => setMode('view')} onCancel={() => setMode('view')} />
          </div>
        ) : (
          <div className="w-full space-y-7">
            {/* ── Global Controls Banner & Quick Expand ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white p-5 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
                    {course.code}
                  </span>
                  <h3 className="font-display text-lg font-bold text-slate-900">{tBilingual('Comprehensive Course Review', 'አጠቃላይ የኮርስ ግምገማ')}</h3>
                </div>
                <p className="text-xs text-slate-500">
                  {tBilingual(
                    'Full overview of course curriculum, learning objectives, attached documents, and evaluation questions.',
                    'የኮርስ ስርዓተ-ትምህርት፣ የመማሪያ ዓላማዎች፣ የተያያዙ ሰነዶች እና የምዘና ጥያቄዎች ሙሉ እይታ።',
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  className="gap-1.5 text-xs text-slate-700 hover:text-indigo-700 border-slate-200 bg-white shadow-2xs"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  {tBilingual('Expand All', 'ሁሉንም ዘርጋ')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 bg-white shadow-2xs"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  {tBilingual('Collapse All', 'ሁሉንም ሰብስብ')}
                </Button>
              </div>
            </div>

            {/* ── Summary Stat Pills Bar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{tBilingual('Modules', 'ምዕራፎች / ሞጁሎች')}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{course.modules.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{tBilingual('Lessons', 'ትምህርቶች')}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{totalLessons}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{tBilingual('Sub-Lessons', 'ንዑስ ትምህርቶች')}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{totalSubLessons}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{tBilingual('Attachments', 'አባሪ ፋይሎች')}</p>
                <p className="mt-1 text-xl font-bold text-indigo-600">{totalAttachments}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{tBilingual('Questions', 'ጥያቄዎች')}</p>
                <p className="mt-1 text-xl font-bold text-emerald-600">{totalQuestions}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{tBilingual('Est. Time', 'የሚፈጀው ጊዜ')}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {totalEstimatedDurationMin >= 60
                    ? `${Math.floor(totalEstimatedDurationMin / 60)}${isAmharic ? 'ሰዓ ' : 'h '}${totalEstimatedDurationMin % 60}${isAmharic ? 'ደ' : 'm'}`
                    : `${totalEstimatedDurationMin} ${isAmharic ? 'ደቂቃ' : 'm'}`}
                </p>
              </div>
            </div>

            {/* Flash messages */}
            {flash ? (
              <div
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm shadow-2xs',
                  flashError ? 'border-red-200/70 bg-red-50/80 text-red-700' : 'border-emerald-200/70 bg-emerald-50/80 text-emerald-700',
                )}
              >
                {flash}
              </div>
            ) : null}

            {/* Needs Trainer For Publish Notice */}
            {needsTrainerForPublish ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-2xs space-y-3">
                <p className="text-sm font-semibold text-amber-900">
                  {tBilingual(
                    '⚠ This course needs a trainer assigned before it can be published to learners.',
                    '⚠ ይህ ኮርስ ለሰልጣኞች ከመታተሙ በፊት አሰልጣኝ መመደብ አለበት።',
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={publishTrainerId}
                    onChange={(event) => setPublishTrainerId(event.target.value)}
                    className="rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm text-slate-700 shadow-xs outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                  >
                    <option value="">
                      {trainerOptions.length ? tBilingual('Select a trainer…', 'አሰልጣኝ ይምረጡ…') : tBilingual('No trainers available', 'ምንም አሰልጣኞች የሉም')}
                    </option>
                    {trainerOptions.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name} ({trainer.email})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!publishTrainerId || busy}
                    onClick={() => void doAssignAndPublish()}
                    className="shadow-xs"
                  >
                    {tBilingual('Assign & Publish', 'መድብ እና አትም')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setNeedsTrainerForPublish(false)} className="shadow-xs bg-white">
                    {tBilingual('Cancel', 'ሰርዝ')}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* ── Section 1: Course Details Overview ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                    {tBilingual('1. Course Overview & Attributes', '1. የኮርስ አጠቃላይ እይታ እና መረጃ')}
                  </h4>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode('edit')}
                    className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {tBilingual('Edit Details', 'መረጃዎችን አርትዕ')}
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Cover Image */}
                <div className="w-full md:w-52 shrink-0">
                  {course.cover ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-2xs aspect-video md:aspect-[4/3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={course.cover} alt="Course Cover" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center aspect-video md:aspect-[4/3]">
                      <BookOpen className="h-8 w-8 text-slate-300 mb-1" />
                      <p className="text-xs text-slate-400 font-medium">{tBilingual('No cover image', 'የሽፋን ምስል የለም')}</p>
                    </div>
                  )}
                </div>

                {/* Title & Metadata */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="space-y-1">
                    <span className="inline-block rounded-md bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                      <RichContent inline html={course.code} placeholder="NO-CODE" />
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 leading-snug">
                      <RichContent
                        inline
                        html={isAmharic ? (course as any).titleAm || course.title : course.title}
                        placeholder={tBilingual('Untitled Course', 'ያልተሰየመ ኮርስ')}
                      />
                    </h2>
                    {(course as any).titleAm && (course as any).titleAm !== course.title && !isAmharic ? (
                      <p className="text-sm text-slate-600 font-medium">
                        የስልጠና ርዕስ (አማርኛ): <RichContent inline html={(course as any).titleAm} />
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="outline" className="border-slate-300 text-slate-700 bg-slate-50 font-medium">
                      {course.category}
                    </Badge>
                    <Badge variant={courseLevelVariant(course.level)} className="font-bold tracking-wider">
                      {courseLevelLabel(course.level, isAmharic)}
                    </Badge>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                      <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                      {tBilingual('Owner:', 'ባለቤት:')} {userName(course.ownerId)}
                    </span>
                    {(course.trainerIds?.length ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                        <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                        {tBilingual('Trainers:', 'አሰልጣኞች:')} {(course.trainerIds ?? []).map(userName).join(', ')}
                      </span>
                    ) : course.trainerId ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                        <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                        {tBilingual('Trainer:', 'አሰልጣኝ:')} {userName(course.trainerId)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200">
                        {tBilingual('No trainer assigned', 'አሰልጣኝ አልተመደበም')}
                      </span>
                    )}
                  </div>

                  {/* Department / Audience / Prerequisites */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                      <span className="font-semibold text-slate-500 block mb-0.5">{tBilingual('Department:', 'ክፍል / መምሪያ:')}</span>
                      <span className="text-slate-800 font-medium">
                        <RichContent inline html={course.department} placeholder={tBilingual('Not specified', 'አልተገለጸም')} />
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                      <span className="font-semibold text-slate-500 block mb-0.5">{tBilingual('Target Audience:', 'የታለመው ተደራሽ:')}</span>
                      <span className="text-slate-800 font-medium">
                        <RichContent inline html={course.targetAudience} placeholder={tBilingual('All Staff', 'ሁሉም ሰራተኞች')} />
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                      <span className="font-semibold text-slate-500 block mb-0.5">{tBilingual('Prerequisites:', 'ቅድመ-ሁኔታዎች:')}</span>
                      <span className="text-slate-800 font-medium">
                        <RichContent inline html={course.prerequisites} placeholder={tBilingual('None', 'ምንም የለም')} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Description */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{tBilingual('Course Description', 'የኮርስ ማብራሪያ')}</p>
                {course.description && stripHtmlTags(course.description) ? (
                  <div
                    className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none bg-slate-50/50 p-4 rounded-xl border border-slate-100"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-800 italic">
                    {tBilingual('⚠ No course description provided.', '⚠ የኮርስ ማብራሪያ አልተሰጠም።')}
                  </div>
                )}
              </div>

              {/* Course Learning Objectives */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {tBilingual('Learning Objectives & Outcomes', 'የመማሪያ ዓላማዎች እና ውጤቶች')}
                </p>
                {course.objectives && stripHtmlTags(course.objectives) ? (
                  <div className="rounded-xl bg-blue-50/60 p-4 border border-blue-100/90 space-y-1">
                    <div
                      className="text-sm text-blue-950 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: course.objectives }}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-800 italic">
                    {tBilingual('⚠ No learning objectives specified.', '⚠ የመማሪያ ዓላማዎች አልተገለጹም።')}
                  </div>
                )}
              </div>

              {/* Trainer Assignment Management (if permitted) */}
              {canAssignTrainer ? (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {tBilingual('Trainer Assignment Management', 'የአሰልጣኝ ምደባ አስተዳደር')}
                  </p>
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                    <div className="space-y-2">
                      {(course.trainerIds?.length ?? 0) > 0 ? (
                        course.trainerIds?.map((trainerId) => (
                          <div
                            key={trainerId}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs shadow-2xs"
                          >
                            <span className="font-semibold text-slate-800 flex items-center gap-2">
                              <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                              {userName(trainerId)}
                            </span>
                            <button
                              type="button"
                              onClick={() => void removeTrainer(trainerId)}
                              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove trainer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          {tBilingual(
                            'No trainer assigned yet. Course publication requires at least one trainer.',
                            'እስካሁን ምንም አሰልጣኝ አልተመደበም። ኮርሱን ለማተም ቢያንስ አንድ አሰልጣኝ ያስፈልጋል።',
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value=""
                        onChange={(event) => void addTrainer(event.target.value)}
                        className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="">
                          {trainerOptions.length
                            ? tBilingual('Assign a trainer…', 'አሰልጣኝ ይምረጡ…')
                            : tBilingual('No trainers available', 'ምንም አሰልጣኞች የሉም')}
                        </option>
                        {trainerOptions.map((trainer) => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.name} ({trainer.email})
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="outline" disabled={trainerOptions.length === 0} className="text-xs gap-1 shadow-2xs">
                        <UserPlus className="h-3.5 w-3.5" />
                        {tBilingual('Assign', 'መድብ')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── Section 2: Complete Curriculum Hierarchy & Attachments ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
              <CourseCurriculumSection
                modules={course.modules}
                expandedModules={expandedModules}
                toggleModule={toggleModule}
                expandedLessons={expandedLessons}
                toggleLesson={toggleLesson}
                canEdit={canEdit}
                onEdit={() => setMode('edit')}
                isAmharic={isAmharic}
              />
            </div>

            {/* ── Section 3: Course-Level Attachments ── */}
            {courseLevelAttachments.length > 0 && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Paperclip className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                    {tBilingual(
                      `Course-Level General Reference Materials (${courseLevelAttachments.length})`,
                      `የኮርስ አጠቃላይ የማመሳከሪያ ሰነዶች (${courseLevelAttachments.length})`,
                    )}
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {courseLevelAttachments.map((file, idx) => (
                    <AttachmentCard key={file.id || file.url || idx} file={file} isAmharic={isAmharic} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Section 4: Final Assessment & Evaluation Rules ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                      {tBilingual('3. Final Assessment & Evaluation Rules', '3. የማጠቃለያ ፈተና እና የምዘና ደንቦች')}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    {tBilingual(
                      'Review passing thresholds, time limits, and all exam questions.',
                      'የማለፊያ ነጥቦችን፣ የጊዜ ገደቦችን እና ሁሉንም የፈተና ጥያቄዎች ይገምግሙ።',
                    )}
                  </p>
                </div>
                {assessments.length > 0 ? (
                  <Badge variant="green" dot className="font-bold">
                    {assessments.length} {tBilingual(assessments.length > 1 ? 'Assessments Attached' : 'Assessment Attached', 'የተያያዘ ምዘና')}
                  </Badge>
                ) : null}
              </div>

              {assessmentLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-slate-400">
                  {tBilingual('Loading assessment and question bank…', 'ምዘና እና የጥያቄ ባንክ በመጫን ላይ…')}
                </div>
              ) : (
                <AssessmentDetailSection assessments={assessments} isAmharic={isAmharic} />
              )}
            </div>
          </div>
        )}
      </WorkspaceDetailOverlay>

      {/* Reject Modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={tBilingual('Reject course', 'ኮርስ ውድቅ አድርግ')}
        subtitle={`${course.code} — ${course.title}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              {tBilingual('Cancel', 'ሰርዝ')}
            </Button>
            <Button variant="danger" disabled={!reason.trim() || busy} onClick={() => void confirmReject()}>
              {busy ? tBilingual('Rejecting…', 'ውድቅ በማድረግ ላይ…') : tBilingual('Confirm Reject', 'ውድቅ ማድረግ አረጋግጥ')}
            </Button>
          </>
        }
      >
        <RichTextArea
          id="courseRejectReason"
          label={tBilingual('Reason for rejection', 'ውድቅ የተደረገበት ምክንያት')}
          required
          rows={3}
          value={reason}
          onChange={(val) => {
            setReason(val);
            setReasonError(null);
          }}
          placeholder={tBilingual(
            'Explain why this course is rejected. The course owner is notified with this reason and the course moves back to draft...',
            'ይህ ኮርስ ለምን ውድቅ እንደተደረገ ያብራሩ። ለኮርሱ ባለቤት ማሳወቂያ ይላካል እና ኮርሱ ወደ ረቂቅ ይመለሳል...',
          )}
          error={reasonError}
        />
      </Modal>

      <ConfirmModal
        open={confirmArchiveOpen}
        title={tBilingual('Archive Course', 'ኮርስ አስቀምጥ')}
        description={
          isAmharic ? `"${course.title}" ወደ ማህደር ይቀመጥ? ከንቁ ካታሎግ ይወጣል።` : `Archive "${course.title}"? It will move out of the active catalog.`
        }
        confirmText={tBilingual('Archive Course', 'ኮርስ አስቀምጥ')}
        variant="warning"
        isLoading={busy}
        onConfirm={doArchive}
        onClose={() => !busy && setConfirmArchiveOpen(false)}
      />

      <ConfirmModal
        open={confirmDeleteOpen}
        title={tBilingual('Delete Course', 'ኮርስ ሰርዝ')}
        description={
          isAmharic
            ? `"${course.title}" ይሰረዝ? ይህ እርምጃ ሊቀለበስ አይችልም እና ሁሉንም ተያያዥ ይዘቶች በቋሚነት ያስወግዳል።`
            : `Delete "${course.title}"? This action cannot be undone and will permanently remove all associated course content.`
        }
        confirmText={tBilingual('Delete Course', 'ኮርስ ሰርዝ')}
        variant="danger"
        isLoading={busy}
        onConfirm={doDelete}
        onClose={() => !busy && setConfirmDeleteOpen(false)}
      />
    </>
  );
}
