'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, UserCheck, Star, User, X } from 'lucide-react';
import type { ApiUser } from '@/lib/api/types';

interface SearchableTrainerSelectProps {
  trainers: ApiUser[];
  courseTrainers: ApiUser[];
  value: string;
  onChange: (trainerId: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function SearchableTrainerSelect({
  trainers,
  courseTrainers,
  value,
  onChange,
  loading = false,
  disabled = false,
}: SearchableTrainerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedTrainer = useMemo(() => trainers.find((t) => t.id === value), [trainers, value]);

  const courseTrainerIds = useMemo(
    () => new Set(courseTrainers.map((t) => t.id)),
    [courseTrainers],
  );

  const isSelectedCourseTrainer = selectedTrainer
    ? courseTrainerIds.has(selectedTrainer.id)
    : false;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
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

  // Filter trainers
  const query = searchQuery.toLowerCase().trim();
  const filterFn = (t: ApiUser) => {
    if (!query) return true;
    const matchFirst = (t.firstName || '').toLowerCase().includes(query);
    const matchLast = (t.lastName || '').toLowerCase().includes(query);
    const matchEmail = (t.email || '').toLowerCase().includes(query);
    const matchDept = ((t as any).department || '').toLowerCase().includes(query);
    return matchFirst || matchLast || matchEmail || matchDept;
  };

  const filteredCourseTrainers = useMemo(
    () => courseTrainers.filter(filterFn),
    [courseTrainers, query],
  );

  const filteredOtherTrainers = useMemo(
    () => trainers.filter((t) => !courseTrainerIds.has(t.id) && filterFn(t)),
    [trainers, courseTrainerIds, query],
  );

  const totalFilteredCount = filteredCourseTrainers.length + filteredOtherTrainers.length;

  const getInitials = (user: ApiUser) => {
    const f = user.firstName?.[0] || '';
    const l = user.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'T';
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left rounded-xl border bg-white px-3.5 py-2.5 shadow-xs transition outline-none flex items-center justify-between gap-2.5 ${
          isOpen
            ? 'border-indigo-500 ring-4 ring-indigo-500/10'
            : 'border-indigo-200/90 hover:border-indigo-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedTrainer ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
              {getInitials(selectedTrainer)}
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <UserCheck className="h-4 w-4" />
            </div>
          )}

          {selectedTrainer ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {selectedTrainer.firstName} {selectedTrainer.lastName}
                </span>
                {isSelectedCourseTrainer && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                    Course Trainer
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{selectedTrainer.email}</p>
            </div>
          ) : (
            <span className="text-sm text-slate-400">
              {loading ? 'Loading qualified trainers…' : 'Select trainer to host this session…'}
            </span>
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
              placeholder="Search trainers by name or email..."
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
              {totalFilteredCount} trainer{totalFilteredCount === 1 ? '' : 's'} available
            </span>
            {searchQuery && <span className="text-indigo-600 font-medium">Filtered</span>}
          </div>

          {/* Scrollable List */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {totalFilteredCount === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No trainers match &quot;{searchQuery}&quot;
              </div>
            ) : (
              <>
                {/* 1. Recommended Course Trainers */}
                {filteredCourseTrainers.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      Recommended: Assigned Course Trainers
                    </div>
                    {filteredCourseTrainers.map((t) => {
                      const isSelected = t.id === value;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onChange(t.id);
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full text-left rounded-xl px-3 py-2 text-xs transition flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-amber-50 border border-amber-200 text-slate-900 font-semibold shadow-xs'
                              : 'hover:bg-amber-50/50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                              {getInitials(t)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900">
                                  {t.firstName} {t.lastName}
                                </span>
                                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                                  Assigned
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">{t.email}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. All Qualified LMS Trainers */}
                {filteredOtherTrainers.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      All Qualified Trainers
                    </div>
                    {filteredOtherTrainers.map((t) => {
                      const isSelected = t.id === value;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onChange(t.id);
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full text-left rounded-xl px-3 py-2 text-xs transition flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-bold text-xs">
                              {getInitials(t)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-900">
                                {t.firstName} {t.lastName}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">{t.email}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
