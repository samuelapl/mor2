'use client';

import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileText,
  Globe2,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CourseDeliveryMode, CourseLevel } from '@/types';
import { COURSE_CATEGORIES } from '@/constants/course-categories';
import type { NamespaceKey } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLookupCategories } from '@/lib/api/useLookupCategories';
import { cn } from '@/lib/utils';
import { isDeliveryModeEnabled } from '@/constants/delivery-modes';
import { stripHtmlTags } from '@/components/ui/RichContent';
import { inputClass, labelClass } from '../../wizard-types';
import { RichEditor } from '../../wizard-components';

export interface CourseDetailsStageProps {
  title: string;
  setTitle: (val: string) => void;
  code: string;
  setCode: (val: string) => void;
  /** Set when the entered code is already used by another course. */
  codeError?: string | null;
  /** True once the draft exists on the server; the code can no longer change. */
  codeLocked?: boolean;
  /** "Include online sessions" toggle; only offered for Online Self-Paced courses. */
  hasOnlineSessions?: boolean;
  onToggleOnlineSessions?: (next: boolean) => void;
  category: string;
  setCategory: (val: string) => void;
  level: CourseLevel;
  setLevel: (val: CourseLevel) => void;
  deliveryMode: CourseDeliveryMode;
  setDeliveryMode: (val: CourseDeliveryMode) => void;
  description: string;
  setDescription: (val: string) => void;
  objectives: string;
  setObjectives: (val: string) => void;
  department: string;
  setDepartment: (val: string) => void;
  targetAudience: string;
  setTargetAudience: (val: string) => void;
  prerequisites: string;
  setPrerequisites: (val: string) => void;
  coverPreview: string | null;
  setCoverPreview: (val: string | null) => void;
  setCoverFile: (val: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isEdit: boolean;
  objectivesText?: string;
  onNext?: () => void;
}

const DELIVERY_OPTIONS: Array<{
  id: CourseDeliveryMode;
  labelKey: NamespaceKey<'courses'>;
  descriptionKey: NamespaceKey<'courses'>;
  icon: typeof Globe2;
  iconClass: string;
  selectedClass: string;
  recommended?: boolean;
}> = [
  {
    id: 'ONLINE_ONLY',
    labelKey: 'deliveryFormatModal.onlineSelfPaced',
    descriptionKey: 'courseDetailsStage.selfPacedDigitalModulesVideoStreams',
    icon: Globe2,
    iconClass: 'text-primary',
    selectedClass: 'border-primary bg-primary-soft/60 shadow-xs ring-1 ring-ring',
    recommended: true,
  },
  {
    id: 'IN_PERSON_ONLY',
    labelKey: 'deliveryFormatModal.inPersonClassroom',
    descriptionKey: 'courseDetailsStage.physicalAttendanceAtMinistryBranchRooms',
    icon: Building2,
    iconClass: 'text-warning',
    selectedClass: 'border-warning bg-warning-soft/60 shadow-xs ring-1 ring-warning',
  },
  {
    id: 'BOTH',
    labelKey: 'courseDetailsStage.hybridBlended',
    descriptionKey: 'courseDetailsStage.digitalOnlinePreparationModulesScheduled',
    icon: Layers,
    iconClass: 'text-success',
    selectedClass: 'border-success bg-success-soft/60 shadow-xs ring-1 ring-success',
  },
];

export function CourseDetailsStage({
  title,
  setTitle,
  code,
  setCode,
  codeError,
  codeLocked = false,
  hasOnlineSessions = false,
  onToggleOnlineSessions,
  category,
  setCategory,
  level,
  setLevel,
  deliveryMode,
  setDeliveryMode,
  description,
  setDescription,
  objectives,
  setObjectives,
  department,
  setDepartment,
  targetAudience,
  setTargetAudience,
  prerequisites,
  setPrerequisites,
  coverPreview,
  setCoverPreview,
  setCoverFile,
  fileInputRef,
  isEdit,
  objectivesText,
  onNext,
}: CourseDetailsStageProps) {
  const { isAmharic, t } = useTranslation('courses');
  const resolvedObjectivesText = objectivesText ?? stripHtmlTags(objectives).trim();
  const { items: dynamicCategories } = useLookupCategories('COURSE_CATEGORY');
  const { items: dynamicLevels } = useLookupCategories('COURSE_LEVEL');

  const categoryOptions =
    dynamicCategories.length > 0
      ? dynamicCategories.map((c) => ({
          value: c.labelEn,
          label: isAmharic && c.labelAm ? c.labelAm : c.labelEn,
        }))
      : COURSE_CATEGORIES.map((c) => ({ value: c, label: c }));

  const levelOptions =
    dynamicLevels.length > 0
      ? dynamicLevels.map((lvl) => ({
          value: lvl.value.toLowerCase() as CourseLevel,
          label: isAmharic && lvl.labelAm ? lvl.labelAm : lvl.labelEn,
        }))
      : [
          { value: 'basic' as CourseLevel, label: 'Basic' },
          { value: 'intermediate' as CourseLevel, label: 'Intermediate' },
          { value: 'advanced' as CourseLevel, label: 'Advanced' },
        ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Stage Header Banner */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary-soft/80 via-card to-muted p-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t('courseDetailsStage.courseOverviewIdentification')}
            </h2>
            <p className="text-xs text-secondary-foreground mt-0.5">
              {t('courseDetailsStage.defineFundamentalCourseInformationDelive')}
            </p>
          </div>
        </div>
      </div>

      {/* Basic Identification */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5">
          {t('courseDetailsStage.basicIdentification')}
        </h3>

        <div className="grid gap-4">
          <div>
            <label className={labelClass}>
              {t('courseDetailsStage.courseTitle')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tax Audit Fundamentals & Legal Compliance"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>
              {t('courseDetailsStage.courseCode')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. TAX-201"
              disabled={isEdit || codeLocked}
              className={cn(
                inputClass,
                (isEdit || codeLocked) && 'opacity-75 cursor-not-allowed bg-muted',
                codeError && 'border-danger/30 focus:border-danger/60',
              )}
            />
            {codeError && !isEdit && !codeLocked && <p className="mt-1 text-[11px] font-medium text-danger">{codeError}</p>}
            {(isEdit || codeLocked) && (
              <p className="mt-1 text-[11px] text-subtle-foreground">
                {t('courseDetailsStage.courseCodeCannotBeChangedOnce')}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>{t('courseDetailsStage.category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t('courseDetailsStage.difficultyLevel')}</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as CourseLevel)}
              className={inputClass}
            >
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Delivery Mode & Cover */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5">
          {t('courseDetailsStage.deliveryFormatVisualIdentity')}
        </h3>

        <div>
          <label className={labelClass}>
            {t('courseDetailsStage.courseDeliveryFormat')} <span className="text-rose-500">*</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-3 mt-1.5">
            {DELIVERY_OPTIONS.map((opt) => {
              const enabled = isDeliveryModeEnabled(opt.id);
              const isSelected = deliveryMode === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!enabled}
                  aria-pressed={isSelected}
                  onClick={() => setDeliveryMode(opt.id)}
                  className={cn(
                    'flex flex-col text-left p-3.5 rounded-xl border transition',
                    isSelected
                      ? opt.selectedClass
                      : enabled
                        ? 'cursor-pointer border-border bg-card hover:border-input hover:bg-muted/50'
                        : 'cursor-not-allowed border-border bg-muted opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <Icon className={cn('h-4 w-4', opt.iconClass)} /> {t(opt.labelKey)}
                    {enabled ? (
                      opt.recommended && (
                        <span className="ml-auto rounded-full border border-primary/30 bg-primary-soft px-1.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                          {t('courseDetailsStage.recommended')}
                        </span>
                      )
                    ) : (
                      <span className="ml-auto rounded-full border border-border bg-secondary px-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t('deliveryFormatModal.comingSoon')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{t(opt.descriptionKey)}</p>
                </button>
              );
            })}
          </div>
          {!isDeliveryModeEnabled(deliveryMode) && (
            <p className="mt-2 text-[11px] font-medium text-warning">
              {t('courseDetailsStage.thisDeliveryModeIsNoLonger')}
            </p>
          )}
        </div>

        {deliveryMode === 'ONLINE_ONLY' && onToggleOnlineSessions && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-info/30 bg-info-soft/50 p-3.5">
            <input
              type="checkbox"
              checked={hasOnlineSessions}
              onChange={(e) => onToggleOnlineSessions(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Video className="h-4 w-4 text-info" />
                {t('courseDetailsStage.includeOnlineSessions')}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                {t('courseDetailsStage.planLiveOnlineSessionsNowWith')}
              </span>
            </span>
          </label>
        )}

        <div>
          <label className={labelClass}>{t('courseDetailsStage.courseCoverImage')}</label>
          <div className="flex flex-wrap items-center gap-4 mt-1.5">
            {coverPreview && (
              <div className="relative h-24 w-40 overflow-hidden rounded-xl border border-border shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                  }}
                  className="absolute right-1 top-1 rounded-md bg-slate-950/70 p-1 text-white hover:bg-rose-600 transition"
                  title="Remove Image"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef as any}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setCoverFile(f);
                  setCoverPreview(URL.createObjectURL(f));
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-secondary-foreground shadow-xs hover:bg-muted hover:border-primary/30 transition"
            >
              <Upload className="h-4 w-4 text-indigo-500" />
              <span>{coverPreview ? t('courseDetailsStage.changeCoverImage') : t('courseDetailsStage.uploadCoverImage')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Description & Objectives */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5">
          {t('courseDetailsStage.descriptionLearningObjectives')}
        </h3>

        <div>
          <label className={labelClass}>
            {t('courseDetailsStage.courseDescription')} <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('courseDetailsStage.describeWhatLearnersWillLearnIn')}
            rows={4}
            className={cn(inputClass, 'min-h-[110px] resize-y leading-relaxed')}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass}>
              {t('courseDetailsStage.courseLearningObjectives')} <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-subtle-foreground">Min. 10 characters</span>
          </div>
          <RichEditor
            value={objectives}
            placeholder={t('courseDetailsStage.enterKeyLearningObjectivesAndExpected')}
            onChange={setObjectives}
            minHeight={120}
          />
          {resolvedObjectivesText.length > 0 && resolvedObjectivesText.length < 10 && (
            <p className="mt-1 text-xs text-warning font-medium">
              {t('courseDetailsStage.pleaseEnterAtLeast10Characters')}
            </p>
          )}
        </div>
      </div>

      {/* Audience & Prerequisites */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5">
          {t('courseDetailsStage.audiencePrerequisites')}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t('courseDetailsStage.owningDepartment')}</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Tax Audit Division"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('courseDetailsStage.targetAudience')}</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Junior Tax Auditors, Revenue Officers"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>{t('courseDetailsStage.prerequisitesOptional')}</label>
          <textarea
            value={prerequisites}
            onChange={(e) => setPrerequisites(e.target.value)}
            placeholder="e.g. Introduction to Tax Law, BASIC-101, or 1 year in service"
            rows={2}
            className={cn(inputClass, 'min-h-[70px] resize-y leading-relaxed')}
          />
        </div>
      </div>

      {/* Next Step Prompt */}
      {onNext && (
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={onNext}
            className="gap-2 px-6 py-2.5 shadow-md shadow-indigo-600/20"
          >
            <span>{t('courseDetailsStage.nextBuildCurriculum')}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
