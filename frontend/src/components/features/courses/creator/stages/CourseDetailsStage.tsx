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
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLookupCategories } from '@/lib/api/useLookupCategories';
import { cn } from '@/lib/utils';
import { isDeliveryModeEnabled } from '@/constants/delivery-modes';
import { stripHtmlTags } from '@/components/ui/RichContent';
import { inputClass, labelClass } from '../../wizard-types';
import { RichEditor, SmartTextarea } from '../../wizard-components';

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
  labelEn: string;
  labelAm: string;
  descriptionEn: string;
  descriptionAm: string;
  icon: typeof Globe2;
  iconClass: string;
  selectedClass: string;
  recommended?: boolean;
}> = [
  {
    id: 'ONLINE_ONLY',
    labelEn: 'Online Self-Paced',
    labelAm: 'ኦንላይን (ራስ-አገዝ)',
    descriptionEn: 'Self-paced digital modules, video streams, and automated quizzes.',
    descriptionAm: 'በራስ ፍጥነት የሚጠኑ ዲጂታል ሞጁሎች፣ ቪዲዮዎች እና ራስ-ሰር ፈተናዎች።',
    icon: Globe2,
    iconClass: 'text-indigo-600',
    selectedClass: 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500',
    recommended: true,
  },
  {
    id: 'IN_PERSON_ONLY',
    labelEn: 'In-Person Classroom',
    labelAm: 'በአካል በክፍል ውስጥ',
    descriptionEn: 'Physical attendance at ministry branch rooms with QR check-in.',
    descriptionAm: 'በሚኒስቴሩ ቅርንጫፍ ክፍሎች በአካል መገኘት፣ በQR ምዝገባ።',
    icon: Building2,
    iconClass: 'text-amber-600',
    selectedClass: 'border-amber-600 bg-amber-50/60 shadow-xs ring-1 ring-amber-500',
  },
  {
    id: 'BOTH',
    labelEn: 'Hybrid / Blended',
    labelAm: 'ድብልቅ',
    descriptionEn: 'Digital online preparation modules + scheduled workshops.',
    descriptionAm: 'የኦንላይን ዝግጅት ሞጁሎች እና የታቀዱ አውደ ጥናቶች።',
    icon: Layers,
    iconClass: 'text-emerald-600',
    selectedClass: 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500',
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
  const { isAmharic, tBilingual } = useTranslation();
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
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 p-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {tBilingual('Course Overview & Identification', 'የኮርስ አጠቃላይ እይታ እና መለያ')}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {tBilingual(
                'Define fundamental course information, delivery format, target audience, and syllabus objectives.',
                'መሰረታዊ የኮርስ መረጃን፣ የአሰጣጥ ዘዴን፣ የታለመላቸውን ሰልጣኞች እና የትምህርት ግቦችን ያዋቅሩ።',
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Basic Identification */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          {tBilingual('Basic Identification', 'መሰረታዊ መለያ')}
        </h3>

        <div className="grid gap-4">
          <div>
            <label className={labelClass}>
              {tBilingual('Course Title', 'የኮርስ ርዕስ')} <span className="text-rose-500">*</span>
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
              {tBilingual('Course Code', 'የኮርስ መለያ ኮድ')} <span className="text-rose-500">*</span>
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
                (isEdit || codeLocked) && 'opacity-75 cursor-not-allowed bg-slate-50',
                codeError && 'border-rose-300 focus:border-rose-400',
              )}
            />
            {codeError && !isEdit && !codeLocked && <p className="mt-1 text-[11px] font-medium text-rose-600">{codeError}</p>}
            {(isEdit || codeLocked) && (
              <p className="mt-1 text-[11px] text-slate-400">
                {tBilingual('Course code cannot be changed once created.', 'የኮርስ ኮድ አንዴ ከተፈጠረ በኋላ ሊቀየር አይችልም።')}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>{tBilingual('Category', 'ምድብ')}</label>
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
            <label className={labelClass}>{tBilingual('Difficulty Level', 'የከበደበት ደረጃ')}</label>
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
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          {tBilingual('Delivery Format & Visual Identity', 'የስልጠና አሰጣጥ እና ምስል')}
        </h3>

        <div>
          <label className={labelClass}>
            {tBilingual('Course Delivery Format', 'የኮርስ አሰጣጥ ዘዴ')} <span className="text-rose-500">*</span>
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
                        ? 'cursor-pointer border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <Icon className={cn('h-4 w-4', opt.iconClass)} /> {tBilingual(opt.labelEn, opt.labelAm)}
                    {enabled ? (
                      opt.recommended && (
                        <span className="ml-auto rounded-full border border-indigo-200 bg-indigo-50 px-1.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700">
                          {tBilingual('Recommended', 'ተመራጭ')}
                        </span>
                      )
                    ) : (
                      <span className="ml-auto rounded-full border border-slate-200 bg-slate-100 px-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        {tBilingual('Coming soon', 'በቅርቡ')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{tBilingual(opt.descriptionEn, opt.descriptionAm)}</p>
                </button>
              );
            })}
          </div>
          {!isDeliveryModeEnabled(deliveryMode) && (
            <p className="mt-2 text-[11px] font-medium text-amber-700">
              {tBilingual(
                'This delivery mode is no longer offered for new courses. This course keeps it; it can only be switched to Online Self-Paced.',
                'ይህ የአሰጣጥ ዘዴ ለአዳዲስ ኮርሶች አይሰጥም። ይህ ኮርስ ይህንኑ ይቀጥላል፤ ወደ ኦንላይን (ራስ-አገዝ) ብቻ መቀየር ይችላል።',
              )}
            </p>
          )}
        </div>

        {deliveryMode === 'ONLINE_ONLY' && onToggleOnlineSessions && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3.5">
            <input
              type="checkbox"
              checked={hasOnlineSessions}
              onChange={(e) => onToggleOnlineSessions(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Video className="h-4 w-4 text-sky-600" />
                {tBilingual('Include online sessions', 'የኦንላይን ክፍለ-ጊዜዎችን አካት')}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                {tBilingual(
                  'Plan live online sessions now, with optional weighted quizzes. They are scheduled (date, trainer, platform) after the course is approved.',
                  'የቀጥታ ኦንላይን ክፍለ-ጊዜዎችን አሁን ያቅዱ፤ ክብደት ያላቸው ፈተናዎች መጨመር ይቻላል። ኮርሱ ከጸደቀ በኋላ ቀን፣ አሰልጣኝ እና መድረክ ይወሰናሉ።',
                )}
              </span>
            </span>
          </label>
        )}

        <div>
          <label className={labelClass}>{tBilingual('Course Cover Image', 'የኮርስ ሽፋን ምስል')}</label>
          <div className="flex flex-wrap items-center gap-4 mt-1.5">
            {coverPreview && (
              <div className="relative h-24 w-40 overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-indigo-200 transition"
            >
              <Upload className="h-4 w-4 text-indigo-500" />
              <span>{coverPreview ? tBilingual('Change Cover Image', 'ምስሉን ቀይር') : tBilingual('Upload Cover Image', 'የሽፋን ምስል ጫን')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Description & Objectives */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          {tBilingual('Description & Learning Objectives', 'ማብራሪያ እና የትምህርት ግቦች')}
        </h3>

        <div>
          <label className={labelClass}>
            {tBilingual('Course Description', 'የኮርስ ማብራሪያ')} <span className="text-rose-500">*</span>
          </label>
          <RichEditor
            value={description}
            placeholder={tBilingual('Describe what learners will learn in this course…', 'ሰልጣኞች በዚህ ኮርስ ውስጥ ምን እንደሚማሩ ያብራሩ…')}
            onChange={setDescription}
            minHeight={120}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass}>
              {tBilingual('Course Learning Objectives', 'የትምህርት ግቦች')} <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Min. 10 characters</span>
          </div>
          <RichEditor
            value={objectives}
            placeholder={tBilingual('Enter key learning objectives and expected competencies…', 'ቁልፍ የትምህርት ግቦችን እና የሚጠበቁ ብቃቶችን ያስገቡ…')}
            onChange={setObjectives}
            minHeight={120}
          />
          {resolvedObjectivesText.length > 0 && resolvedObjectivesText.length < 10 && (
            <p className="mt-1 text-xs text-amber-600 font-medium">
              {tBilingual('Please enter at least 10 characters.', 'እባክዎ ቢያንስ 10 ፊደላትን ያስገቡ።')}
            </p>
          )}
        </div>
      </div>

      {/* Audience & Prerequisites */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          {tBilingual('Audience & Prerequisites', 'ተሳታፊዎች እና ቅድመ-ሁኔታዎች')}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{tBilingual('Owning Department', 'ባለቤት የስራ ክፍል')}</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Tax Audit Division"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{tBilingual('Target Audience', 'የታለመለቸው ሰልጣኞች')}</label>
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
          <label className={labelClass}>{tBilingual('Prerequisites (Optional)', 'ቅድመ-ሁኔታዎች (አማራጭ)')}</label>
          <SmartTextarea
            value={prerequisites}
            onChange={setPrerequisites}
            placeholder="e.g. Introduction to Tax Law, BASIC-101, or 1 year in service"
            rows={2}
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
            <span>{tBilingual('Next: Build Curriculum', 'ቀጣይ፡ ስርዓተ-ትምህርቱን ያዘጋጁ')}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
