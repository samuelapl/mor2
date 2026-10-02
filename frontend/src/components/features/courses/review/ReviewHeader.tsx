'use client';

import { useEffect, useRef, useState } from 'react';
import { Archive, ArrowLeft, Check, Globe2, MoreHorizontal, Pencil, Send, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CourseStatusBadge } from '@/components/ui/Badge';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';
import type { CourseActionKey } from './types';

interface ReviewHeaderProps {
  course: Course;
  can: Record<CourseActionKey, boolean>;
  busy: boolean;
  onBack: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onReject: () => void;
  onApprove: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const DELIVERY_LABEL: Record<string, { en: string; am: string }> = {
  ONLINE_ONLY: { en: 'Online', am: 'ኦንላይን' },
  IN_PERSON_ONLY: { en: 'In-person', am: 'በአካል' },
  BOTH: { en: 'Hybrid', am: 'ድብልቅ' },
};

export function ReviewHeader({
  course,
  can,
  busy,
  onBack,
  onEdit,
  onSubmit,
  onReject,
  onApprove,
  onPublish,
  onUnpublish,
  onArchive,
  onDelete,
}: ReviewHeaderProps) {
  const { lang, setLang, tBilingual } = useTranslation();
  const delivery = DELIVERY_LABEL[course.deliveryMode ?? 'BOTH'] ?? DELIVERY_LABEL.BOTH;
  const hasOverflow = can.archive || can.delete;

  return (
    <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-4 shadow-2xs lg:px-6">
      {/* Left: back, code, status, title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          title={tBilingual('Back', 'ተመለስ')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded border border-indigo-200/60 bg-indigo-50 px-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              {course.code}
            </span>
            <CourseStatusBadge status={course.published ? 'published' : course.status} />
            <span className="hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 sm:inline">
              {tBilingual(delivery.en, delivery.am)}
            </span>
          </div>
          <h1 className="mt-0.5 truncate text-xs font-bold text-slate-900 lg:text-sm" title={course.title}>
            {course.title}
          </h1>
        </div>
      </div>

      {/* Right: actions (each one already gated by permission + status) */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
          className="hidden items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:flex"
          title="Switch Language"
        >
          <Globe2 className="h-3.5 w-3.5 text-slate-500" />
          <span>{lang === 'en' ? 'አማ' : 'EN'}</span>
        </button>

        {can.edit && (
          <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5 text-xs">
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{tBilingual('Edit course', 'ኮርስ አርትዕ')}</span>
          </Button>
        )}
        {can.unpublish && (
          <Button size="sm" variant="outline" disabled={busy} onClick={onUnpublish} className="gap-1.5 text-xs">
            <Globe2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{tBilingual('Unpublish', 'ከህትመት አንሳ')}</span>
          </Button>
        )}
        {can.reject && (
          <Button size="sm" variant="danger" disabled={busy} onClick={onReject} className="gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" />
            {tBilingual('Reject', 'ውድቅ አድርግ')}
          </Button>
        )}

        {hasOverflow && (
          <OverflowMenu
            busy={busy}
            items={[
              ...(can.archive ? [{ key: 'archive', label: tBilingual('Archive course', 'ኮርስ አስቀምጥ'), icon: Archive, onClick: onArchive }] : []),
              ...(can.delete
                ? [{ key: 'delete', label: tBilingual('Delete course', 'ኮርስ ሰርዝ'), icon: Trash2, onClick: onDelete, danger: true }]
                : []),
            ]}
          />
        )}

        {/* Primary action for the current status sits last, on the far right. */}
        {can.submit && (
          <Button size="sm" variant="primary" disabled={busy} onClick={onSubmit} className="gap-1.5 text-xs font-bold">
            <Send className="h-3.5 w-3.5" />
            {course.status === 'rejected' ? tBilingual('Resubmit for approval', 'ለማጽደቅ በድጋሚ ላክ') : tBilingual('Submit for approval', 'ለማጽደቅ ላክ')}
          </Button>
        )}
        {can.approve && (
          <Button
            size="sm"
            variant="success"
            disabled={busy}
            onClick={onApprove}
            className="gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Check className="h-3.5 w-3.5" />
            {tBilingual('Approve', 'አጽድቅ')}
          </Button>
        )}
        {can.publish && (
          <Button
            size="sm"
            disabled={busy}
            onClick={onPublish}
            className="gap-1.5 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
            title={
              course.trainerId
                ? tBilingual('Publish this course to all learners', 'ይህንን ኮርስ ለሁሉም ሰልጣኞች አትም')
                : tBilingual('Assign a trainer before publishing', 'ከማተምዎ በፊት አሰልጣኝ ይመድቡ')
            }
          >
            <Globe2 className="h-3.5 w-3.5" />
            {tBilingual('Publish course', 'ኮርስ አትም')}
          </Button>
        )}
      </div>
    </header>
  );
}

interface OverflowItem {
  key: string;
  label: string;
  icon: typeof Archive;
  onClick: () => void;
  danger?: boolean;
}

function OverflowMenu({ items, busy }: { items: OverflowItem[]; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        className="px-2"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map(({ key, label, icon: Icon, onClick, danger }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition',
                danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
