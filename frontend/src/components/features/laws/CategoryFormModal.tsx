'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type {
  CreateLawCategoryInput,
  LawCategory,
  LawDomain,
  LawInstrumentType,
  UpdateLawCategoryInput,
} from '@/types/laws';
import { LAW_DOMAINS, LAW_INSTRUMENT_TYPES } from '@/types/laws';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateLawCategoryInput | UpdateLawCategoryInput) => Promise<void>;
  initialData?: LawCategory | null;
  defaultDomain?: LawDomain;
  defaultInstrumentType?: LawInstrumentType;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDomain = 'TAX_LAW',
  defaultInstrumentType = 'PROCLAMATION',
}: CategoryFormModalProps) {
  const { lang, tBilingual } = useTranslation();

  const [domain, setDomain] = useState<LawDomain>(defaultDomain);
  const [instrumentType, setInstrumentType] = useState<LawInstrumentType>(defaultInstrumentType);
  const [nameEn, setNameEn] = useState('');
  const [nameAm, setNameAm] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setDomain(initialData.domain);
      setInstrumentType(initialData.instrumentType);
      setNameEn(initialData.nameEn || '');
      setNameAm(initialData.nameAm || '');
      setDescription(initialData.description || '');
      setOrder(initialData.order ?? 0);
    } else {
      setDomain(defaultDomain);
      setInstrumentType(defaultInstrumentType);
      setNameEn('');
      setNameAm('');
      setDescription('');
      setOrder(0);
    }
    setError(null);
  }, [initialData, defaultDomain, defaultInstrumentType, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      setError(tBilingual('English category name is required', 'የእንግሊዝኛ ምድብ ስም ማስገባት አስፈላጊ ነው'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        domain,
        instrumentType,
        nameEn: nameEn.trim(),
        nameAm: nameAm.trim() || undefined,
        description: description.trim() || undefined,
        order: Number(order) || 0,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save category');
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
          ? tBilingual('Edit Category', 'ምድብ አርትዕ')
          : tBilingual('Add New Legal Category', 'አዲስ የሕግ ምድብ አክል')
      }
      subtitle={tBilingual(
        'Define a dynamic category under a law domain and instrument type',
        'በሕግ ዘርፍ እና በአዋጅ/ደንብ ስር የሚገኝ አዲስ ምድብ ይፍጠሩ',
      )}
      size="lg"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {tBilingual('Cancel', 'ሰርዝ')}
          </Button>
          <Button
            type="submit"
            form="category-form"
            isLoading={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          >
            {initialData ? tBilingual('Save Changes', 'ለውጦችን መዝግብ') : tBilingual('Create Category', 'ምድብ ፍጠር')}
          </Button>
        </div>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs sm:text-sm border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Domain */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Law Domain', 'የሕግ ዘርፍ')} *
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as LawDomain)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LAW_DOMAINS.map((d) => (
                <option key={d.key} value={d.key}>
                  {lang === 'am' ? d.labelAm : d.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Instrument Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Instrument Type', 'የሰነድ አይነት')} *
            </label>
            <select
              value={instrumentType}
              onChange={(e) => setInstrumentType(e.target.value as LawInstrumentType)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LAW_INSTRUMENT_TYPES.map((it) => (
                <option key={it.key} value={it.key}>
                  {lang === 'am' ? it.labelAm : it.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* English Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {tBilingual('Category Name (English)', 'የምድብ ስም (እንግሊዝኛ)')} *
          </label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="e.g. Value Added Tax Proclamation"
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Amharic Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {tBilingual('Category Name (Amharic)', 'የምድብ ስም (አማርኛ)')}
          </label>
          <input
            type="text"
            value={nameAm}
            onChange={(e) => setNameAm(e.target.value)}
            placeholder="ምሳሌ፡ የተጨማሪ እሴት ታክስ አዋጅ"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif"
          />
        </div>

        {/* Description & Order */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Description', 'መግለጫ')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tBilingual('Optional description', 'አስፈላጊ ከሆነ አጭር መግለጫ')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tBilingual('Display Order', 'ቅደም ተከተል')}
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

