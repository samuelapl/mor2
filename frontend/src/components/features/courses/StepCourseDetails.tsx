'use client';

import type React from 'react';
import { Trash2, Upload } from 'lucide-react';
import type { CourseLevel } from '@/types';
import { COURSE_CATEGORIES } from '@/constants/course-categories';
import { cn } from '@/lib/utils';
import { inputClass, labelClass } from './wizard-types';
import { RichEditor } from './wizard-components';

export interface StepCourseDetailsProps {
  title: string;
  setTitle: (val: string) => void;
  titleAm: string;
  setTitleAm: (val: string) => void;
  code: string;
  setCode: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  level: CourseLevel;
  setLevel: (val: CourseLevel) => void;
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
  objectivesText: string;
}

export function StepCourseDetails({
  title,
  setTitle,
  titleAm,
  setTitleAm,
  code,
  setCode,
  category,
  setCategory,
  level,
  setLevel,
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
}: StepCourseDetailsProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Course Title (English) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter course title"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Course Title (Amharic / አማርኛ)</label>
          <input
            type="text"
            value={titleAm}
            onChange={(e) => setTitleAm(e.target.value)}
            placeholder="የኮርስ ርዕስ በአማርኛ ያስገቡ (አማራጭ)"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Course Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. TAX-201"
            disabled={isEdit}
            className={cn(inputClass, isEdit && 'opacity-75 cursor-not-allowed bg-slate-50')}
          />
          {isEdit ? (
            <p className="mt-1 text-[11px] text-slate-400">
              Course code cannot be changed once created.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {COURSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Difficulty Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as CourseLevel)}
              className={inputClass}
            >
              <option value="basic">Basic</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Course Cover Image</label>
        <div className="flex flex-wrap items-center gap-4">
          {coverPreview ? (
            <div className="relative h-24 w-40 overflow-hidden rounded-xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setCoverFile(null);
                  setCoverPreview(null);
                }}
                className="absolute right-1 top-1 rounded-md bg-slate-950/70 p-1 text-white hover:bg-red-600 transition"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : null}

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
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Upload className="h-4 w-4 text-indigo-500" />
            {coverPreview ? 'Change Cover Image' : 'Upload Cover Image'}
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass}>Course Description *</label>
        <RichEditor
          value={description}
          placeholder="Describe what learners will learn in this course…"
          onChange={setDescription}
          minHeight={120}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelClass}>Course Learning Objectives *</label>
          <span className="text-[11px] text-slate-400">Min. 10 characters</span>
        </div>
        <RichEditor
          value={objectives}
          placeholder="Enter the learning objectives for this course…"
          onChange={setObjectives}
          minHeight={120}
        />
        {objectivesText.length > 0 && objectivesText.length < 10 ? (
          <p className="mt-1 text-xs text-amber-600">Please enter at least 10 characters.</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Owning Department</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Tax Audit Division"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Target Audience</label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g. Junior Tax Auditors, Revenue Staff"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Prerequisites (Optional)</label>
        <textarea
          value={prerequisites}
          onChange={(e) => setPrerequisites(e.target.value)}
          placeholder="e.g. Introduction to Tax Law, BASIC-101, or 1 year in service"
          rows={2}
          className={inputClass}
        />
      </div>
    </div>
  );
}
