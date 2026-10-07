'use client';

import React, { useEffect, useState } from 'react';
import { UploadCloud, CheckCircle2, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type {
  CreateLegalDocumentInput,
  LawCategory,
  LawStatus,
  LegalDocument,
  UpdateLegalDocumentInput,
} from '@/types/laws';
import { LAW_STATUS_CONFIG } from '@/types/laws';
import { uploadAttachment } from '@/lib/api/files';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateLegalDocumentInput | UpdateLegalDocumentInput) => Promise<void>;
  categories: LawCategory[];
  defaultCategoryId?: string;
  initialData?: LegalDocument | null;
}

export function DocumentFormModal({
  isOpen,
  onClose,
  onSave,
  categories,
  defaultCategoryId,
  initialData,
}: DocumentFormModalProps) {
  const { lang, tBilingual } = useTranslation();

  const [categoryId, setCategoryId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleAm, setTitleAm] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionAm, setDescriptionAm] = useState('');
  const [status, setStatus] = useState<LawStatus>('IN_FORCE');
  const [yearIssued, setYearIssued] = useState<number | ''>('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCategoryId(initialData.categoryId);
      setDocumentNumber(initialData.documentNumber);
      setTitleEn(initialData.titleEn);
      setTitleAm(initialData.titleAm || '');
      setDescriptionEn(initialData.descriptionEn || '');
      setDescriptionAm(initialData.descriptionAm || '');
      setStatus(initialData.status);
      setYearIssued(initialData.yearIssued ?? '');
      setPdfUrl(initialData.pdfUrl);
      setFileName(initialData.fileName);
      setFileSize(initialData.fileSize ?? undefined);
      setCoverImageUrl(initialData.coverImageUrl || '');
    } else {
      setCategoryId(defaultCategoryId || (categories.length > 0 ? categories[0].id : ''));
      setDocumentNumber('');
      setTitleEn('');
      setTitleAm('');
      setDescriptionEn('');
      setDescriptionAm('');
      setStatus('IN_FORCE');
      setYearIssued(new Date().getFullYear());
      setPdfUrl('');
      setFileName('');
      setFileSize(undefined);
      setCoverImageUrl('');
    }
    setError(null);
    setUploadError(null);
  }, [initialData, defaultCategoryId, categories, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError(tBilingual('Please select a valid PDF document', 'እባክዎ ትክክለኛ የፒዲኤፍ ሰነድ ይምረጡ'));
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const res = await uploadAttachment(file, { purpose: 'attachment' });
      setPdfUrl(res.fileUrl);
      setFileName(res.fileName || file.name);
      setFileSize(res.sizeBytes || file.size);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload PDF file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      setError(tBilingual('Please select a category', 'እባክዎ ምድብ ይምረጡ'));
      return;
    }
    if (!documentNumber.trim()) {
      setError(tBilingual('Document number is required (e.g. 33/1984)', 'የሰነድ ቁጥር ማስገባት አስፈላጊ ነው'));
      return;
    }
    if (!titleEn.trim()) {
      setError(tBilingual('English title is required', 'የእንግሊዝኛ ርዕስ ማስገባት አስፈላጊ ነው'));
      return;
    }
    if (!pdfUrl.trim()) {
      setError(tBilingual('Please upload or provide a PDF document URL', 'እባክዎ ፒዲኤፍ ሰነድ ይጫኑ'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        categoryId,
        documentNumber: documentNumber.trim(),
        titleEn: titleEn.trim(),
        titleAm: titleAm.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        descriptionAm: descriptionAm.trim() || undefined,
        status,
        yearIssued: yearIssued ? Number(yearIssued) : undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        pdfUrl: pdfUrl.trim(),
        fileName: fileName.trim() || 'document.pdf',
        fileSize,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        initialData
          ? tBilingual('Edit Legal Document', 'የሕግ ሰነድ አርትዕ')
          : tBilingual('Attach New Legal Document', 'አዲስ የሕግ ሰነድ ጫን')
      }
      subtitle={tBilingual(
        'Upload proclamation, regulation, or directive PDF with Negarit Gazeta metadata',
        'የአዋጅ፣ ደንብ ወይም መመሪያ ፒዲኤፍ ሰነድ ከመረጃዎች ጋር ያያይዙ',
      )}
      size="xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {tBilingual('Cancel', 'ሰርዝ')}
          </Button>
          <Button
            type="submit"
            form="document-form"
            isLoading={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          >
            {initialData ? tBilingual('Save Changes', 'ለውጦችን መዝግብ') : tBilingual('Upload Document', 'ሰነድ መዝግብ')}
          </Button>
        </div>
      }
    >
      <form id="document-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs sm:text-sm border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
            {error}
          </div>
        )}

        {/* 1. Category & Document Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Target Category', 'የሚመደብበት ምድብ')} *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'am' && c.nameAm ? c.nameAm : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Official Document Number', 'ይፋዊ የሰነድ ቁጥር')} *
            </label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="e.g. 33/1984 or 979/2016"
              required
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 2. Titles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Amharic Title (Primary)', 'የአማርኛ ርዕስ (ዋና)')}
            </label>
            <input
              type="text"
              value={titleAm}
              onChange={(e) => setTitleAm(e.target.value)}
              placeholder="ምሳሌ፡ የፌዴራል የታክስ አስተዳደር አዋጅ"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('English Title', 'የእንግሊዝኛ ርዕስ')} *
            </label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. Federal Tax Administration Proclamation"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 3. Status & Year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Enforcement Status', 'የሕጉ ሁኔታ')} *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LawStatus)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {(Object.keys(LAW_STATUS_CONFIG) as LawStatus[]).map((st) => (
                <option key={st} value={st}>
                  {lang === 'am' ? LAW_STATUS_CONFIG[st].labelAm : LAW_STATUS_CONFIG[st].labelEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Year Issued', 'የወጣበት ዓመት')}
            </label>
            <input
              type="number"
              value={yearIssued}
              onChange={(e) => setYearIssued(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 2016"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Cover Image / Gazeta Thumbnail URL', 'የነጋሪት ጋዜጣ ገጽ ምስል')}
            </label>
            <input
              type="text"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="Optional image URL"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 4. PDF File Upload */}
        <div className="p-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
          <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-2">
            {tBilingual('PDF Document Attachment', 'የፒዲኤፍ ሰነድ አባሪ')} *
          </label>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white shadow-sm transition-colors">
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              <span>{isUploading ? tBilingual('Uploading...', 'በመጫን ላይ...') : tBilingual('Choose PDF File', 'ፒዲኤፍ ፋይል ምረጥ')}</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            {isUploading && (
              <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{tBilingual('Uploading file to server...', 'ፋይሉ ወደ ሰርቨር በመጫን ላይ ነው...')}</span>
              </div>
            )}

            {pdfUrl && !isUploading && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium truncate max-w-xs">{fileName || pdfUrl}</span>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mt-2 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Or manual URL */}
          <div className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-900/40 flex items-center gap-2">
            <span className="text-[11px] text-slate-500 whitespace-nowrap">
              {tBilingual('Or direct URL:', 'ወይም ቀጥተኛ ማስፈንጠሪያ፡')}
            </span>
            <input
              type="text"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="e.g. /file-sample.pdf or https://..."
              className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* 5. Summaries */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Amharic Summary / Objectives', 'የአማርኛ ማጠቃለያ')}
            </label>
            <textarea
              rows={2}
              value={descriptionAm}
              onChange={(e) => setDescriptionAm(e.target.value)}
              placeholder="የሰነዱ አጭር ማብራሪያ..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('English Summary / Objectives', 'የእንግሊዝኛ ማጠቃለያ')}
            </label>
            <textarea
              rows={2}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="Brief summary or scope..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

