'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Scale,
  Plus,
  Search,
  Filter,
  Eye,
  Settings,
  BookOpen,
  FileText,
  Trash2,
  Edit2,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type {
  CreateLawCategoryInput,
  CreateLegalDocumentInput,
  LawCategory,
  LawDomain,
  LawInstrumentType,
  LawStatus,
  LegalDocument,
  UpdateLawCategoryInput,
  UpdateLegalDocumentInput,
} from '@/types/laws';
import {
  LAW_DOMAINS,
  LAW_INSTRUMENT_TYPES,
  LAW_STATUS_CONFIG,
} from '@/types/laws';
import {
  createLawCategory,
  createLegalDocument,
  deleteLawCategory,
  deleteLegalDocument,
  fetchLawCategories,
  fetchLegalDocuments,
  updateLawCategory,
  updateLegalDocument,
} from '@/lib/api/laws';
import { NegaritGazetaCard } from './NegaritGazetaCard';
import { PdfViewerModal } from './PdfViewerModal';
import { CategoryFormModal } from './CategoryFormModal';
import { DocumentFormModal } from './DocumentFormModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { usePermissions } from '@/lib/usePermissions';

interface LawsSplitViewProps {
  isAdmin?: boolean;
}

export function LawsSplitView({ isAdmin = false }: LawsSplitViewProps) {
  const { lang, t } = useTranslation('laws');
  const { can } = usePermissions();
  const canManage = can('laws.manage');

  // Filter States
  const [selectedDomain, setSelectedDomain] = useState<LawDomain>('TAX_LAW');
  const [selectedInstrument, setSelectedInstrument] = useState<LawInstrumentType | 'ALL'>('PROCLAMATION');
  const [statusFilter, setStatusFilter] = useState<LawStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [categories, setCategories] = useState<LawCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<LawCategory | null>(null);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);

  // Loading States
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Modal States
  const [pdfModalDoc, setPdfModalDoc] = useState<LegalDocument | null>(null);

  // Category CRUD Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LawCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<LawCategory | null>(null);

  // Document CRUD Modal States
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<LegalDocument | null>(null);

  // Error/Feedback
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Categories for active Domain & Instrument Type
  const loadCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      const data = await fetchLawCategories({
        domain: selectedDomain,
        instrumentType: selectedInstrument === 'ALL' ? undefined : selectedInstrument,
      });
      setCategories(data);
      // Retain active selection if it exists in data, or stay null for All Categories
      if (data.length > 0) {
        setSelectedCategory((prev) => {
          if (!prev) return null;
          const found = data.find((c) => c.id === prev.id);
          return found || null;
        });
      } else {
        setSelectedCategory(null);
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to load categories' });
    } finally {
      setIsLoadingCategories(false);
    }
  }, [selectedDomain, selectedInstrument]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 2. Fetch Documents for active Category & Filters
  const loadDocuments = useCallback(async () => {
    try {
      setIsLoadingDocs(true);
      const res = await fetchLegalDocuments({
        categoryId: selectedCategory?.id,
        domain: selectedDomain,
        instrumentType: selectedInstrument === 'ALL' ? undefined : selectedInstrument,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
        limit: 100,
      });
      setDocuments(res.data);
      setTotalDocs(res.total);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to load documents' });
    } finally {
      setIsLoadingDocs(false);
    }
  }, [selectedCategory, selectedDomain, selectedInstrument, statusFilter, searchQuery]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle Category Save
  const handleSaveCategory = async (data: CreateLawCategoryInput | UpdateLawCategoryInput) => {
    if (editingCategory) {
      await updateLawCategory(editingCategory.id, data);
      setFeedbackMessage({ type: 'success', text: t('lawsSplitView.categoryUpdated') });
    } else {
      const created = await createLawCategory(data as CreateLawCategoryInput);
      setFeedbackMessage({ type: 'success', text: t('lawsSplitView.categoryCreated') });
      setSelectedCategory(created);
    }
    await loadCategories();
  };

  // Handle Category Delete
  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await deleteLawCategory(deletingCategory.id);
      setFeedbackMessage({ type: 'success', text: t('lawsSplitView.categoryDeleted') });
      setDeletingCategory(null);
      await loadCategories();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to delete category' });
    }
  };

  // Handle Document Save
  const handleSaveDocument = async (data: CreateLegalDocumentInput | UpdateLegalDocumentInput) => {
    if (editingDocument) {
      await updateLegalDocument(editingDocument.id, data);
      setFeedbackMessage({ type: 'success', text: t('lawsSplitView.documentUpdated') });
    } else {
      await createLegalDocument(data as CreateLegalDocumentInput);
      setFeedbackMessage({ type: 'success', text: t('lawsSplitView.documentAttached') });
    }
    await loadDocuments();
    await loadCategories();
  };

  // Handle Document Delete
  const handleConfirmDeleteDocument = async () => {
    if (!deletingDocument) return;
    try {
      await deleteLegalDocument(deletingDocument.id);
      setFeedbackMessage({ type: 'success', text: t('lawsSplitView.documentDeleted') });
      setDeletingDocument(null);
      await loadDocuments();
      await loadCategories();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to delete document' });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Scale className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              {isAdmin
                ? t('lawsSplitView.legalRepositoryManagement')
                : t('lawsSplitView.knowledgeBaseLegalLibrary')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('lawsSplitView.taxCustomsLaws')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            {t('lawsSplitView.officialFederalDemocraticRepublicOfEthio')}
          </p>
        </div>

        {/* Top actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin ? (
            <>
              <Link
                href="/laws"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>{t('lawsSplitView.learnerPortalView')}</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>{t('lawsSplitView.addCategory')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingDocument(null);
                  setIsDocumentModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('documentFormModal.uploadDocument')}</span>
              </button>
            </>
          ) : (
            canManage && (
              <Link
                href="/laws-management"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>{t('lawsSplitView.manageLegalLaws')}</span>
              </Link>
            )
          )}
        </div>
      </div>

      {/* FEEDBACK TOAST / BANNER */}
      {feedbackMessage && (
        <div
          className={cn(
            'flex items-center justify-between p-3.5 rounded-xl text-xs sm:text-sm border animate-in fade-in',
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
          )}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-80"
          >
            {t('lawsSplitView.dismiss')}
          </button>
        </div>
      )}

      {/* ── LEVEL 1: DOMAIN TABS ────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Law Domains">
          {LAW_DOMAINS.map((dom) => {
            const active = selectedDomain === dom.key;
            return (
              <button
                key={dom.key}
                type="button"
                onClick={() => {
                  setSelectedDomain(dom.key);
                }}
                className={cn(
                  'whitespace-nowrap pb-3 px-3 sm:px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2',
                  active
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300',
                )}
              >
                <span>{t(`domain.${dom.key}`)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── LEVEL 2: INSTRUMENT PILLS + SEARCH + STATUS FILTER & CATEGORIES ── */}
      <div className="flex flex-col gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        {/* Row 1: Instrument Type Pills (left) & Search / Status (right) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Instrument Type Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedInstrument('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                selectedInstrument === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700',
              )}
            >
              {t('lawsSplitView.allTypes')}
            </button>
            {LAW_INSTRUMENT_TYPES.map((inst) => {
              const active = selectedInstrument === inst.key;
              return (
                <button
                  key={inst.key}
                  type="button"
                  onClick={() => setSelectedInstrument(inst.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                    active
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700',
                  )}
                >
                  {t(`instrumentType.${inst.key}`)}
                </button>
              );
            })}
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('lawsSplitView.searchTitleNumber')}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LawStatus | 'ALL')}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                <option value="ALL">{t('lawsSplitView.allStatuses')}</option>
                {(Object.keys(LAW_STATUS_CONFIG) as LawStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {t(`status.${st}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Category Dropdown Selector Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
                {t('lawsSplitView.lawCategory')}
              </span>
              <div className="relative flex-1 max-w-xl">
                <select
                  value={selectedCategory?.id || 'ALL'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ALL') {
                      setSelectedCategory(null);
                    } else {
                      const found = categories.find((c) => c.id === val);
                      if (found) setSelectedCategory(found);
                    }
                  }}
                  className="w-full text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer truncate shadow-2xs"
                >
                  <option value="ALL">
                    {t('lawsSplitView.allCategories')} ({categories.reduce((acc, c) => acc + (c._count?.documents ?? 0), 0)} {t('lawsSplitView.documents')})
                  </option>
                  {categories.map((cat) => {
                    const label = lang === 'am' ? cat.nameAm || cat.nameEn : cat.nameEn || cat.nameAm;
                    return (
                      <option key={cat.id} value={cat.id}>
                        {label} ({cat._count?.documents ?? 0} {t('lawsSplitView.documents')})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Admin category management buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {selectedCategory && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(selectedCategory);
                      setIsCategoryModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
                    title={t('lawsSplitView.editCurrentCategory')}
                  >
                    <Edit2 className="w-3 h-3 text-indigo-600" />
                    <span>{t('lawsSplitView.edit')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(selectedCategory)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors shadow-2xs"
                    title={t('lawsSplitView.deleteCurrentCategory')}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t('lawsSplitView.delete')}</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>{t('lawsSplitView.addCategory2')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── DOCUMENTS SHOWCASE (FULL WIDTH PROFESSIONAL LAYOUT) ────────── */}
      <div className="flex flex-col gap-4">
        {/* Category Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {(() => {
                  if (!selectedCategory) {
                    const inst = LAW_INSTRUMENT_TYPES.find((i) => i.key === selectedInstrument);
                    return inst ? t(`instrumentType.${inst.key}`) : t('lawsSplitView.allCategories');
                  }
                  const inst = LAW_INSTRUMENT_TYPES.find((i) => i.key === selectedCategory.instrumentType);
                  return inst ? t(`instrumentType.${inst.key}`) : selectedCategory.instrumentType;
                })()}
              </span>
              <span className="text-xs text-slate-500">
                {totalDocs} {t('lawsSplitView.documentSFound')}
              </span>
            </div>
            <h2
              className={cn(
                'text-lg font-bold text-slate-900 dark:text-white truncate mt-1',
                lang === 'am' && 'font-serif',
              )}
            >
              {selectedCategory
                ? (lang === 'am'
                    ? selectedCategory.nameAm || selectedCategory.nameEn
                    : selectedCategory.nameEn || selectedCategory.nameAm)
                : t('lawsSplitView.allTaxCustomsLawsDecrees')}
            </h2>
            {selectedCategory?.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {selectedCategory.description}
              </p>
            )}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingDocument(null);
                setIsDocumentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all shrink-0 active:scale-95 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('lawsSplitView.addDocument')}</span>
            </button>
          )}
        </div>

        {/* Documents List */}
        {isLoadingDocs ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400">
            <Spinner className="size-8 text-indigo-600" />
            <span className="text-sm">{t('lawsSplitView.loadingDocuments')}</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {t('lawsSplitView.noLegalDocumentsUploadedYet')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {t('lawsSplitView.noDecreesMatchTheCurrentCategory')}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingDocument(null);
                  setIsDocumentModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('lawsSplitView.uploadFirstDocument')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <NegaritGazetaCard
                key={doc.id}
                document={doc}
                isAdmin={isAdmin}
                onOpenPdf={(d) => setPdfModalDoc(d)}
                onEdit={(d) => {
                  setEditingDocument(d);
                  setIsDocumentModalOpen(true);
                }}
                onDelete={(d) => setDeletingDocument(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── PDF VIEWER MODAL ──────────────────────────────────────────────── */}
      <PdfViewerModal
        isOpen={Boolean(pdfModalDoc)}
        document={pdfModalDoc}
        onClose={() => setPdfModalDoc(null)}
      />

      {/* ── CATEGORY FORM MODAL (ADMIN ONLY) ─────────────────────────────── */}
      {isAdmin && (
        <CategoryFormModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSave={handleSaveCategory}
          initialData={editingCategory}
          defaultDomain={selectedDomain}
          defaultInstrumentType={selectedInstrument === 'ALL' ? 'PROCLAMATION' : selectedInstrument}
        />
      )}

      {/* ── DOCUMENT FORM MODAL (ADMIN ONLY) ─────────────────────────────── */}
      {isAdmin && (
        <DocumentFormModal
          isOpen={isDocumentModalOpen}
          onClose={() => setIsDocumentModalOpen(false)}
          onSave={handleSaveDocument}
          categories={categories}
          defaultCategoryId={selectedCategory?.id || categories[0]?.id}
          initialData={editingDocument}
        />
      )}

      {/* ── CONFIRM DELETE CATEGORY MODAL ─────────────────────────────────── */}
      <ConfirmModal
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleConfirmDeleteCategory}
        title={t('lawsSplitView.deleteCategory')}
        description={
          <span>
            {t('lawsSplitView.deleteCategoryConfirm', {
              name: (lang === 'am' ? deletingCategory?.nameAm || deletingCategory?.nameEn : deletingCategory?.nameEn) ?? '',
            })}
          </span>
        }
        confirmText={t('lawsSplitView.delete')}
        cancelText={t('categoryFormModal.cancel')}
        variant="danger"
      />

      {/* ── CONFIRM DELETE DOCUMENT MODAL ─────────────────────────────────── */}
      <ConfirmModal
        isOpen={Boolean(deletingDocument)}
        onClose={() => setDeletingDocument(null)}
        onConfirm={handleConfirmDeleteDocument}
        title={t('lawsSplitView.deleteLegalDocument')}
        description={
          <span>
            {t('lawsSplitView.deleteDocumentConfirm', {
              number: deletingDocument?.documentNumber ?? '',
              title: (lang === 'am' ? deletingDocument?.titleAm || deletingDocument?.titleEn : deletingDocument?.titleEn) ?? '',
            })}
          </span>
        }
        confirmText={t('lawsSplitView.delete')}
        cancelText={t('categoryFormModal.cancel')}
        variant="danger"
      />
    </div>
  );
}

