'use client';

import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  CloudOff,
  Eye,
  FileCheck,
  Globe2,
  Layers,
  Loader2,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { NamespaceKey } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { CourseDeliveryMode } from '@/types';
import type { AutosaveStatus, CreatorActiveNode, CreatorPhase } from './types';
import { cn } from '@/lib/utils';

interface CreatorHeaderProps {
  phase: CreatorPhase;
  onPhaseChange: (phase: CreatorPhase) => void;
  activeNode: CreatorActiveNode;
  title: string;
  code: string;
  deliveryMode: CourseDeliveryMode;
  saving: boolean;
  onSaveChanges: () => void;
  onSaveDraft: () => void;
  onSubmitForApproval: () => void;
  onPreview: () => void;
  onExit: () => void;
  isEdit?: boolean;
  autosaveStatus: AutosaveStatus;
  autosaveError?: string | null;
  lastSavedAt?: Date | null;
  /** Why autosave can't run yet (e.g. no title/code). */
  autosaveBlockedReason?: string | null;
}

export function CreatorHeader({
  phase,
  onPhaseChange,
  title,
  code,
  deliveryMode,
  saving,
  onSaveChanges,
  onSaveDraft,
  onSubmitForApproval,
  onPreview,
  onExit,
  isEdit,
  autosaveStatus,
  autosaveError,
  lastSavedAt,
  autosaveBlockedReason,
}: CreatorHeaderProps) {
  const { t } = useTranslation('courses');

  const STEPS: Array<{
    id: CreatorPhase;
    labelKey: NamespaceKey<'courses'>;
    icon: typeof BookOpen;
  }> = [
    {
      id: 'COURSE_DETAILS',
      labelKey: 'creatorHeader.courseDetails',
      icon: BookOpen,
    },
    {
      id: 'CURRICULUM',
      labelKey: 'reviewSubmitStage.curriculumContent',
      icon: Layers,
    },
    {
      id: 'FINAL_ASSESSMENT',
      labelKey: 'reviewSidebar.finalAssessment',
      icon: Award,
    },
    {
      id: 'REVIEW_SUBMIT',
      labelKey: 'creatorSidebar.reviewSubmit',
      icon: FileCheck,
    },
  ];

  const deliveryModeBadge = {
    ONLINE_ONLY: {
      labelKey: 'creatorHeader.online',
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    },
    IN_PERSON_ONLY: {
      labelKey: 'creatorHeader.inPerson',
      bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    },
    BOTH: {
      labelKey: 'creatorHeader.hybrid',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    },
  }[deliveryMode] || {
    labelKey: 'creatorHeader.hybrid',
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <header className="h-16 shrink-0 border-b border-slate-200/80 bg-white px-4 lg:px-6 flex items-center justify-between gap-4 z-20 shadow-2xs">
      {/* Left: Back / Title & Meta */}
      <div className="flex items-center gap-3 min-w-0 max-w-[280px] lg:max-w-xs xl:max-w-sm">
        <button
          type="button"
          onClick={onExit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
          title={t('creatorHeader.backToCourses')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-indigo-700 uppercase bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded shrink-0">
              {code || 'DRAFT'}
            </span>
            <span className={cn('text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0', deliveryModeBadge.bg)}>
              {t(deliveryModeBadge.labelKey as NamespaceKey<'courses'>)}
            </span>
          </div>
          <h1 className="text-xs lg:text-sm font-bold text-slate-900 truncate mt-0.5" title={title}>
            {title.trim() || t('creatorHeader.untitledCourseStudio')}
          </h1>
          <AutosaveIndicator status={autosaveStatus} error={autosaveError} lastSavedAt={lastSavedAt} blockedReason={autosaveBlockedReason} />
        </div>
      </div>

      {/* Center: Phase Steps */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
        {STEPS.map((step, idx) => {
          const isActive = phase === step.id;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onPhaseChange(step.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition',
                isActive
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold transition',
                  isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600',
                )}
              >
                {idx + 1}
              </span>
              <span>{t(step.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Actions (Save Draft, Language, Submit) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Language switch */}

        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="gap-1.5 text-xs font-medium"
          title={t('creatorHeader.previewAsLearner')}
        >
          <Eye className="h-3.5 w-3.5 text-slate-500" />
          <span className="hidden lg:inline">{t('creatorHeader.previewAsLearner')}</span>
        </Button>

        {/* Global Save Changes button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onSaveChanges}
          disabled={saving}
          className="gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/20"
          title={t('creatorHeader.saveChangesToThisCourseImmediately')}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span>{t('creatorHeader.saveChanges')}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSaveDraft}
          disabled={saving}
          className="gap-1.5 text-xs font-medium"
          title={t('creatorHeader.saveAsDraftAndExitStudio')}
        >
          <FileCheck className="h-3.5 w-3.5 text-slate-500" />
          <span className="hidden sm:inline">{t('creatorHeader.saveAsDraft')}</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onSubmitForApproval}
          disabled={saving}
          className="gap-1.5 text-xs font-bold shadow-xs shadow-indigo-600/20"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{isEdit ? t('creatorHeader.updateResubmit') : t('creatorHeader.submitCourse')}</span>
        </Button>
      </div>
    </header>
  );
}

function AutosaveIndicator({
  status,
  error,
  lastSavedAt,
  blockedReason,
}: {
  status: AutosaveStatus;
  error?: string | null;
  lastSavedAt?: Date | null;
  blockedReason?: string | null;
}) {
  const { t } = useTranslation('courses');
  const time = lastSavedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let icon = <Check className="h-3 w-3" />;
  let text: string;
  let tone = 'text-slate-400';
  let hint: string | undefined;

  if (status === 'saving') {
    icon = <Loader2 className="h-3 w-3 animate-spin" />;
    text = t('autosaveIndicator.saving');
  } else if (status === 'error') {
    icon = <CloudOff className="h-3 w-3" />;
    text = t('autosaveIndicator.autosaveFailed');
    tone = 'text-rose-600';
    hint = error ?? undefined;
  } else if (status === 'pending' && blockedReason) {
    icon = <CloudOff className="h-3 w-3" />;
    text = t('autosaveIndicator.notSavedYet');
    tone = 'text-amber-600';
    hint = blockedReason;
  } else if (status === 'pending') {
    text = t('autosaveIndicator.unsavedChanges');
    tone = 'text-amber-600';
  } else if (status === 'saved' && time) {
    text = `${t('autosaveIndicator.saved')} ${time}`;
    tone = 'text-emerald-600';
  } else {
    text = t('autosaveIndicator.autosaveOn');
  }

  return (
    <p className={cn('mt-0.5 flex items-center gap-1 text-[10px] font-medium', tone)} title={hint} aria-live="polite">
      {icon}
      <span className="truncate">{text}</span>
    </p>
  );
}
