'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, BookOpen, X } from 'lucide-react';
import type { Course } from '@/types';

interface SearchableCourseSelectProps {
  courses: Course[];
  value: string;
  onChange: (courseId: string) => void;
  disabled?: boolean;
}

export function SearchableCourseSelect({
  courses,
  value,
  onChange,
  disabled = false,
}: SearchableCourseSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCourse = useMemo(() => courses.find((c) => c.id === value), [courses, value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const query = searchQuery.toLowerCase().trim();
    return courses.filter((c) => {
      const matchCode = (c.code || '').toLowerCase().includes(query);
      const matchTitle = (c.title || '').toLowerCase().includes(query);
      const matchTitleEn = ((c as any).titleEn || '').toLowerCase().includes(query);
      const matchTitleAm = ((c as any).titleAm || '').toLowerCase().includes(query);
      const matchCat = (c.category || '').toLowerCase().includes(query);
      return matchCode || matchTitle || matchTitleEn || matchTitleAm || matchCat;
    });
  }, [courses, searchQuery]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left rounded-xl border bg-white px-3.5 py-2.5 shadow-sm transition outline-none flex items-center justify-between gap-2.5 ${
          isOpen
            ? 'border-indigo-500 ring-4 ring-indigo-500/10'
            : 'border-slate-200/90 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <BookOpen className="h-4 w-4" />
          </div>
          {selectedCourse ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-mono font-bold text-indigo-800">
                  {selectedCourse.code}
                </span>
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {selectedCourse.title}
                </span>
              </div>
              {(selectedCourse as any).titleAm && (
                <p className="text-xs text-slate-500 font-amharic truncate mt-0.5">
                  {(selectedCourse as any).titleAm}
                </p>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400">Select course to host session…</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-400 shrink-0">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input Bar */}
          <div className="relative mb-2 px-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses by code, title, or category..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between px-2 pb-1 text-[11px] text-slate-400 font-medium">
            <span>
              {filteredCourses.length} course{filteredCourses.length === 1 ? '' : 's'} found
            </span>
            {searchQuery && <span className="text-indigo-600 font-medium">Filtered</span>}
          </div>

          {/* Scrollable List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filteredCourses.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No courses match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredCourses.map((c) => {
                const isSelected = c.id === value;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left rounded-xl px-3 py-2 text-xs transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-mono font-bold ${
                            isSelected
                              ? 'bg-indigo-200/80 text-indigo-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.code}
                        </span>
                        <span className="truncate font-medium">{c.title}</span>
                      </div>
                      {(c as any).titleAm && (
                        <p className="text-[11px] text-slate-500 font-amharic truncate mt-0.5">
                          {(c as any).titleAm}
                        </p>
                      )}
                      {c.category && (
                        <span className="inline-block mt-0.5 text-[10px] text-slate-400">
                          {c.category}
                        </span>
                      )}
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
