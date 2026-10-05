'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  MessageCircle,
  ImagePlus,
  MessageSquare,
  Save,
  Send,
  Share2,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Undo2,
  Upload,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Modal } from '@/components/ui/Modal';
import { RichTextArea } from '@/components/ui/RichTextArea';
import { stripHtmlTags } from '@/components/ui/RichContent';
import { PageLoader } from '@/components/ui/Spinner';
import {
  adminGetNews,
  createNews,
  deleteNews,
  deleteNewsImage,
  featureNews,
  republishNews,
  reviewNews,
  submitNews,
  unpublishNews,
  updateNews,
  updateNewsImage,
  uploadNewsImage,
} from '@/lib/api/news';
import type { ApiAdminNews, ApiNewsImage, NewsCategory, NewsInput } from '@/lib/api/types';
import { useLms } from '@/lib/lms-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { usePermissions } from '@/lib/usePermissions';
import {
  AUTHOR_EDITABLE_STATUSES,
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABELS,
  NEWS_PERMISSIONS,
  formatNewsDate,
  newsPath,
  newsTextLang,
} from '@/lib/news';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { NewsArticleView } from './NewsArticleView';
import { NewsStatusBadge } from './NewsBadges';
import { NewsCover } from './NewsCover';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_SOURCE = 'የገቢዎች ሚኒስቴር';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:disabled:bg-slate-800/60';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400';

interface FormState {
  headline: string;
  summary: string;
  content: string;
  category: NewsCategory;
  source: string;
  eventDate: string; // yyyy-mm-dd or ''
  allowComments: boolean;
}

const EMPTY_FORM: FormState = {
  headline: '',
  summary: '',
  content: '',
  category: 'PRESS_RELEASE',
  source: DEFAULT_SOURCE,
  eventDate: '',
  allowComments: true,
};

function toForm(news: ApiAdminNews): FormState {
  return {
    headline: news.headline,
    summary: news.summary ?? '',
    content: news.content ?? '',
    category: news.category,
    source: news.source,
    eventDate: news.eventDate ? news.eventDate.slice(0, 10) : '',
    allowComments: news.allowComments,
  };
}

function toInput(form: FormState): NewsInput {
  return {
    headline: form.headline.trim(),
    summary: form.summary.trim() || null,
    content: form.content,
    category: form.category,
    source: form.source.trim() || DEFAULT_SOURCE,
    eventDate: form.eventDate || null,
    allowComments: form.allowComments,
  };
}

function checkImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Only JPEG, PNG or WebP images are allowed';
  if (file.size > MAX_IMAGE_BYTES) return 'Images must be 5 MB or smaller';
  return null;
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

/**
 * Create/edit a news post and drive its review workflow. What is editable and which
 * actions show depends on news.manage / news.publish, authorship and status — the same
 * rules the API enforces, so the UI never offers an action that would be refused.
 */
export function NewsEditor({ newsId }: { newsId?: string }) {
  const router = useRouter();
  const { currentUser } = useLms();
  const { can, isSystemAdmin } = usePermissions();
  const { tBilingual, lang } = useTranslation();

  const [news, setNews] = useState<ApiAdminNews | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(Boolean(newsId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirm, setConfirm] = useState<'delete' | 'unpublish' | null>(null);
  const [imageToDelete, setImageToDelete] = useState<ApiNewsImage | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!newsId) return;
    let cancelled = false;
    adminGetNews(newsId)
      .then((data) => {
        if (cancelled) return;
        setNews(data);
        setForm(toForm(data));
        setSavedForm(toForm(data));
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err, 'Could not load this news')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [newsId]);

  // ── Who may do what (mirrors NewsService on the API) ──
  const canManage = can(NEWS_PERMISSIONS.manage);
  const canPublish = can(NEWS_PERMISSIONS.publish);
  const status = news?.status;
  const isAuthor = !news || news.createdById === currentUser?.id;
  const authorEditable = Boolean(status && AUTHOR_EDITABLE_STATUSES.includes(status));
  const canEdit = news ? canPublish || (canManage && isAuthor && authorEditable) : canManage;
  const canSubmit = Boolean(news && canManage && (isAuthor || isSystemAdmin) && authorEditable);
  const canReview = Boolean(
    news && canPublish && status === 'PENDING_REVIEW' && (!isAuthor || isSystemAdmin),
  );
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const images = [...(news?.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.headline.trim()) next.headline = tBilingual('Headline is required', 'ርዕስ ያስፈልጋል');
    else if (form.headline.trim().length > 200)
      next.headline = tBilingual('At most 200 characters', 'ቢበዛ 200 ፊደላት');
    if (form.summary.trim().length > 300)
      next.summary = tBilingual('At most 300 characters', 'ቢበዛ 300 ፊደላት');
    if (!stripHtmlTags(form.content).trim())
      next.content = tBilingual('Content is required', 'ይዘት ያስፈልጋል');
    if (form.source.trim().length > 120)
      next.source = tBilingual('At most 120 characters', 'ቢበዛ 120 ፊደላት');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const applyServerNews = (data: ApiAdminNews) => {
    setNews(data);
    setForm(toForm(data));
    setSavedForm(toForm(data));
  };

  /** Runs one workflow action with a shared busy flag and error toast; undefined means it failed. */
  const run = async <T,>(key: string, action: () => Promise<T>, failMessage: string) => {
    setBusy(key);
    try {
      return await action();
    } catch (err) {
      toast.error(errorMessage(err, failMessage));
      return undefined;
    } finally {
      setBusy(null);
    }
  };

  /** Saves the form; returns the saved post (creating it first when new). */
  const save = async (): Promise<ApiAdminNews | undefined> => {
    if (!validate()) return undefined;
    if (!news) {
      const created = await run('save', () => createNews(toInput(form)), 'Could not save the draft');
      if (created) {
        toast.success(tBilingual('Draft saved — you can now add photos', 'ረቂቁ ተቀምጧል — አሁን ፎቶዎችን ማከል ይችላሉ'));
        router.replace(`/news-management/${created.id}`);
      }
      return created;
    }
    if (!isDirty) return news;
    const updated = await run('save', () => updateNews(news.id, toInput(form)), 'Could not save changes');
    if (updated) {
      applyServerNews(updated);
      toast.success(tBilingual('Changes saved', 'ለውጦቹ ተቀምጠዋል'));
    }
    return updated;
  };

  const submit = async () => {
    const saved = await save();
    if (!saved || !news) return;
    const result = await run('submit', () => submitNews(news.id), 'Could not submit for review');
    if (result) {
      applyServerNews(result);
      toast.success(tBilingual('Submitted for review', 'ለግምገማ ተልኳል'));
    }
  };

  const approve = async () => {
    if (!news) return;
    const result = await run('approve', () => reviewNews(news.id, { approve: true }), 'Could not publish');
    if (result) {
      applyServerNews(result);
      toast.success(tBilingual('Published', 'ታትሟል'));
    }
  };

  const reject = async () => {
    if (!news || !rejectReason.trim()) return;
    const result = await run(
      'reject',
      () => reviewNews(news.id, { approve: false, reason: rejectReason.trim() }),
      'Could not reject',
    );
    if (result) {
      applyServerNews(result);
      setRejectOpen(false);
      setRejectReason('');
      toast.success(tBilingual('Returned to the author', 'ለጸሐፊው ተመልሷል'));
    }
  };

  const unpublish = async () => {
    if (!news) return;
    const result = await run('unpublish', () => unpublishNews(news.id), 'Could not unpublish');
    setConfirm(null);
    if (result) {
      applyServerNews(result);
      toast.success(tBilingual('Taken off the public site', 'ከህዝብ ገጽ ተወግዷል'));
    }
  };

  const republish = async () => {
    if (!news) return;
    const result = await run('republish', () => republishNews(news.id), 'Could not republish');
    if (result) {
      applyServerNews(result);
      toast.success(tBilingual('Published again', 'እንደገና ታትሟል'));
    }
  };

  const toggleFeatured = async () => {
    if (!news) return;
    const result = await run('feature', () => featureNews(news.id, !news.isFeatured), 'Could not update');
    if (result) applyServerNews(result);
  };

  const remove = async () => {
    if (!news) return;
    const ok = await run('delete', () => deleteNews(news.id).then(() => true), 'Could not delete');
    setConfirm(null);
    if (ok) {
      toast.success(tBilingual('News deleted', 'ዜናው ተሰርዟል'));
      router.push('/news-management');
    }
  };

  // ── Images ──

  const uploadCover = async (file: File | undefined) => {
    if (!file || !news) return;
    const problem = checkImage(file);
    if (problem) return toast.error(problem);
    const result = await run('cover', () => uploadNewsImage(news.id, file, true), 'Upload failed');
    if (result?.coverImageUrl) setNews({ ...news, coverImageUrl: result.coverImageUrl });
  };

  const uploadGallery = async (files: FileList | null) => {
    if (!files || !news) return;
    const added: ApiNewsImage[] = [];
    setBusy('gallery');
    for (const file of Array.from(files)) {
      const problem = checkImage(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        continue;
      }
      try {
        const image = await uploadNewsImage(news.id, file, false);
        if (image.id) added.push(image as ApiNewsImage);
      } catch (err) {
        toast.error(`${file.name}: ${errorMessage(err, 'Upload failed')}`);
      }
    }
    setBusy(null);
    setNews((n) => (n ? { ...n, images: [...(n.images ?? []), ...added] } : n));
  };

  const saveCaption = async (image: ApiNewsImage, caption: string) => {
    if (!news || (image.caption ?? '') === caption.trim()) return;
    try {
      const updated = await updateNewsImage(news.id, image.id, { caption: caption.trim() || null });
      setNews((n) =>
        n ? { ...n, images: n.images?.map((i) => (i.id === image.id ? { ...i, ...updated } : i)) } : n,
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the caption'));
    }
  };

  /** Swaps an image with its neighbour; positions are renumbered 0..n so ties never stick. */
  const moveImage = async (index: number, delta: -1 | 1) => {
    if (!news) return;
    const reordered = [...images];
    const target = index + delta;
    if (target < 0 || target >= reordered.length) return;
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const renumbered = reordered.map((img, i) => ({ ...img, sortOrder: i }));
    setNews({ ...news, images: renumbered });
    try {
      await Promise.all(
        renumbered
          .filter((img, i) => images.find((o) => o.id === img.id)?.sortOrder !== i)
          .map((img) => updateNewsImage(news.id, img.id, { sortOrder: img.sortOrder })),
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Could not reorder'));
    }
  };

  const removeImage = async () => {
    if (!news || !imageToDelete) return;
    const target = imageToDelete;
    const ok = await run(
      'image-delete',
      () => deleteNewsImage(news.id, target.id).then(() => true),
      'Could not delete',
    );
    setImageToDelete(null);
    if (ok) {
      setNews((n) => (n ? { ...n, images: n.images?.filter((i) => i.id !== target.id) } : n));
    }
  };

  // ── Render ──

  if (loading) return <PageLoader />;
  if (loadError) {
    return (
      <div className="px-6 py-16 text-center lg:px-10">
        <p className="text-sm text-red-600">{loadError}</p>
        <Link href="/news-management" className="mt-4 inline-block text-sm font-semibold text-indigo-600">
          {tBilingual('Back to news', 'ወደ ዜናዎች ተመለስ')}
        </Link>
      </div>
    );
  }

  const readOnly = !canEdit;
  const textLang = newsTextLang(form.headline, form.content);

  return (
    <div className="w-full animate-fade-in px-6 py-8 lg:px-10">
      <Link
        href="/news-management"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        {tBilingual('All news', 'ሁሉም ዜናዎች')}
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          {news ? tBilingual('Edit news', 'ዜና አስተካክል') : tBilingual('New news', 'አዲስ ዜና')}
        </h1>
        {status && <NewsStatusBadge status={status} />}
        {news?.isFeatured && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
            <Star className="h-3.5 w-3.5 fill-current" />
            {tBilingual('Featured', 'ተለይቶ የቀረበ')}
          </span>
        )}
      </div>

      {/* Status banners */}
      {status === 'REJECTED' && news?.rejectionReason && (
        <Banner tone="red" icon={<XCircle className="h-4 w-4" />}>
          <strong>{tBilingual('Returned by the reviewer:', 'በገምጋሚው የተመለሰ፦')}</strong>{' '}
          <span lang={newsTextLang(news.rejectionReason)}>{news.rejectionReason}</span>
          {canSubmit && (
            <span className="block text-xs opacity-80">
              {tBilingual('Fix it and submit again.', 'አስተካክለው እንደገና ይላኩ።')}
            </span>
          )}
        </Banner>
      )}
      {status === 'PENDING_REVIEW' && !canReview && (
        <Banner tone="amber" icon={<Clock className="h-4 w-4" />}>
          {isAuthor
            ? tBilingual(
                'Waiting for a publisher to review this news. It cannot be edited until it is reviewed.',
                'ይህ ዜና በአሳታሚ እስኪገመገም በመጠባበቅ ላይ ነው። እስኪገመገም ድረስ ሊስተካከል አይችልም።',
              )
            : tBilingual(
                'Waiting for review. You cannot review news you wrote.',
                'ግምገማ በመጠባበቅ ላይ። እርስዎ የጻፉትን ዜና መገምገም አይችሉም።',
              )}
        </Banner>
      )}
      {status === 'PUBLISHED' && canEdit && (
        <Banner tone="blue" icon={<AlertTriangle className="h-4 w-4" />}>
          {tBilingual(
            'This news is live. Saved changes appear on the public site immediately.',
            'ይህ ዜና ታትሟል። የሚቀመጡ ለውጦች ወዲያውኑ በህዝብ ገጽ ላይ ይታያሉ።',
          )}
        </Banner>
      )}
      {readOnly && status !== 'PENDING_REVIEW' && (
        <Banner tone="slate" icon={<Eye className="h-4 w-4" />}>
          {tBilingual('You can view this news but not change it.', 'ይህን ዜና ማየት ይችላሉ ግን መቀየር አይችሉም።')}
        </Banner>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Main column ── */}
        <div className="space-y-6">
          <Card>
            <div className="space-y-5">
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                {tBilingual(
                  'Write in Amharic or English. Readers see the text exactly as written, whatever language their screen is set to.',
                  'በአማርኛ ወይም በእንግሊዝኛ ይጻፉ። አንባቢዎች የስክሪናቸው ቋንቋ ምንም ይሁን ጽሑፉን እንደተጻፈ ያያሉ።',
                )}
              </p>

              <div>
                <label htmlFor="news-headline" className={labelClass}>
                  {tBilingual('Headline', 'ርዕስ')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="news-headline"
                  lang={textLang}
                  value={form.headline}
                  onChange={(e) => set('headline', e.target.value)}
                  maxLength={200}
                  disabled={readOnly}
                  className={cn(inputClass, 'text-base font-semibold', errors.headline && 'border-red-400')}
                  placeholder="የገቢዎች ሚኒስቴር…"
                />
                <FieldFoot error={errors.headline} count={form.headline.length} max={200} />
              </div>

              <div>
                <label htmlFor="news-summary" className={labelClass}>
                  {tBilingual('Summary', 'ማጠቃለያ')}{' '}
                  <span className="font-normal text-slate-400">
                    {tBilingual('(optional — taken from the content if empty)', '(አማራጭ — ባዶ ከሆነ ከይዘቱ ይወሰዳል)')}
                  </span>
                </label>
                <textarea
                  id="news-summary"
                  lang={textLang}
                  value={form.summary}
                  onChange={(e) => set('summary', e.target.value)}
                  maxLength={300}
                  rows={2}
                  disabled={readOnly}
                  className={cn(inputClass, 'resize-y', errors.summary && 'border-red-400')}
                />
                <FieldFoot error={errors.summary} count={form.summary.length} max={300} />
              </div>

              <div lang={textLang}>
                <RichTextArea
                  label={tBilingual('Content', 'ይዘት')}
                  required
                  value={form.content}
                  onChange={(v) => set('content', v)}
                  minHeight={320}
                  disabled={readOnly}
                  error={errors.content}
                />
              </div>
            </div>
          </Card>

          {/* Photos */}
          <Card>
            <h2 className="mb-1 font-display text-base font-bold text-slate-900 dark:text-white">
              {tBilingual('Photos', 'ፎቶዎች')}
            </h2>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'JPEG, PNG or WebP, up to 5 MB each. The cover appears on cards and in link previews.',
                'JPEG፣ PNG ወይም WebP፣ እያንዳንዱ እስከ 5 MB። የሽፋን ፎቶው በካርዶች እና በሊንክ ቅድመ-እይታ ላይ ይታያል።',
              )}
            </p>

            {!news ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
                {tBilingual('Save the draft first to add a cover and photos.', 'የሽፋን ፎቶ እና ፎቶዎችን ለማከል መጀመሪያ ረቂቁን ያስቀምጡ።')}
              </p>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className={labelClass}>
                    {tBilingual('Cover image', 'የሽፋን ፎቶ')} <span className="text-red-500">*</span>
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <NewsCover
                      src={news.coverImageUrl}
                      alt=""
                      className="aspect-[16/9] w-full rounded-xl sm:w-72"
                    />
                    {canEdit && (
                      <>
                        <input
                          ref={coverInput}
                          type="file"
                          accept={IMAGE_TYPES.join(',')}
                          className="hidden"
                          onChange={(e) => {
                            void uploadCover(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Upload className="h-3.5 w-3.5" />}
                          isLoading={busy === 'cover'}
                          onClick={() => coverInput.current?.click()}
                        >
                          {news.coverImageUrl
                            ? tBilingual('Replace cover', 'ሽፋኑን ቀይር')
                            : tBilingual('Upload cover', 'ሽፋን ስቀል')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className={cn(labelClass, 'mb-0')}>
                      {tBilingual('Gallery', 'የፎቶ ማዕከል')} ({images.length})
                    </p>
                    {canEdit && (
                      <>
                        <input
                          ref={galleryInput}
                          type="file"
                          multiple
                          accept={IMAGE_TYPES.join(',')}
                          className="hidden"
                          onChange={(e) => {
                            void uploadGallery(e.target.files);
                            e.target.value = '';
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<ImagePlus className="h-3.5 w-3.5" />}
                          isLoading={busy === 'gallery'}
                          onClick={() => galleryInput.current?.click()}
                        >
                          {tBilingual('Add photos', 'ፎቶዎችን አክል')}
                        </Button>
                      </>
                    )}
                  </div>
                  {images.length === 0 ? (
                    <p className="text-xs text-slate-400">{tBilingual('No gallery photos.', 'ምንም የማዕከል ፎቶ የለም።')}</p>
                  ) : (
                    <ul className="space-y-3">
                      {images.map((image, index) => (
                        <li
                          key={image.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-2 dark:border-slate-800"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.url} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                          <input
                            defaultValue={image.caption ?? ''}
                            onBlur={(e) => void saveCaption(image, e.target.value)}
                            placeholder={tBilingual('Caption (optional)', 'መግለጫ (አማራጭ)')}
                            maxLength={300}
                            disabled={!canEdit}
                            className={cn(inputClass, 'py-2')}
                          />
                          {canEdit && (
                            <div className="flex shrink-0 items-center">
                              <IconButton
                                label={tBilingual('Move up', 'ወደ ላይ')}
                                disabled={index === 0}
                                onClick={() => void moveImage(index, -1)}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label={tBilingual('Move down', 'ወደ ታች')}
                                disabled={index === images.length - 1}
                                onClick={() => void moveImage(index, 1)}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label={tBilingual('Delete photo', 'ፎቶ ሰርዝ')}
                                danger
                                onClick={() => setImageToDelete(image)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </IconButton>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Side column ── */}
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div>
                <label htmlFor="news-category" className={labelClass}>
                  {tBilingual('Category', 'ምድብ')}
                </label>
                <select
                  id="news-category"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value as NewsCategory)}
                  disabled={readOnly}
                  className={inputClass}
                >
                  {NEWS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {tBilingual(NEWS_CATEGORY_LABELS[c])}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="news-source" className={labelClass}>
                  {tBilingual('Source', 'ምንጭ')}
                </label>
                <input
                  id="news-source"
                  value={form.source}
                  onChange={(e) => set('source', e.target.value)}
                  maxLength={120}
                  disabled={readOnly}
                  className={cn(inputClass, errors.source && 'border-red-400')}
                />
                {errors.source && <p className="mt-1 text-xs text-red-600">{errors.source}</p>}
              </div>
              <div>
                <label htmlFor="news-event-date" className={labelClass}>
                  {tBilingual('Event date', 'የዝግጅቱ ቀን')}{' '}
                  <span className="font-normal text-slate-400">
                    {tBilingual('(shown instead of the publish date)', '(ከህትመት ቀኑ ይልቅ ይታያል)')}
                  </span>
                </label>
                <input
                  id="news-event-date"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => set('eventDate', e.target.value)}
                  disabled={readOnly}
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.allowComments}
                  onChange={(e) => set('allowComments', e.target.checked)}
                  disabled={readOnly}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                {tBilingual('Allow comments', 'አስተያየት ፍቀድ')}
              </label>
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <div className="flex flex-col gap-2">
              {canEdit && (
                <Button
                  variant={canSubmit ? 'outline' : 'primary'}
                  icon={<Save className="h-4 w-4" />}
                  isLoading={busy === 'save'}
                  disabled={Boolean(busy) || (Boolean(news) && !isDirty)}
                  onClick={() => void save()}
                >
                  {!news
                    ? tBilingual('Save draft', 'ረቂቅ አስቀምጥ')
                    : isDirty
                      ? tBilingual('Save changes', 'ለውጦችን አስቀምጥ')
                      : tBilingual('All changes saved', 'ሁሉም ለውጦች ተቀምጠዋል')}
                </Button>
              )}
              {canSubmit && (
                <Button
                  icon={<Send className="h-4 w-4" />}
                  isLoading={busy === 'submit'}
                  disabled={Boolean(busy)}
                  onClick={() => void submit()}
                >
                  {status === 'REJECTED'
                    ? tBilingual('Resubmit for review', 'እንደገና ለግምገማ ላክ')
                    : tBilingual('Submit for review', 'ለግምገማ ላክ')}
                </Button>
              )}
              {canReview && (
                <>
                  <Button
                    variant="success"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    isLoading={busy === 'approve'}
                    disabled={Boolean(busy) || isDirty}
                    onClick={() => void approve()}
                  >
                    {tBilingual('Approve & publish', 'አጽድቅ እና አትም')}
                  </Button>
                  <Button
                    variant="danger"
                    icon={<XCircle className="h-4 w-4" />}
                    disabled={Boolean(busy)}
                    onClick={() => setRejectOpen(true)}
                  >
                    {tBilingual('Reject', 'ውድቅ አድርግ')}
                  </Button>
                  {isDirty && (
                    <p className="text-xs text-amber-600">
                      {tBilingual('Save your edits before approving.', 'ከማጽደቅዎ በፊት ለውጦችዎን ያስቀምጡ።')}
                    </p>
                  )}
                </>
              )}
              {canPublish && status === 'PUBLISHED' && (
                <>
                  <Button
                    variant="outline"
                    icon={<Star className="h-4 w-4" />}
                    isLoading={busy === 'feature'}
                    disabled={Boolean(busy)}
                    onClick={() => void toggleFeatured()}
                  >
                    {news?.isFeatured
                      ? tBilingual('Remove from featured', 'ከተለዩት አስወግድ')
                      : tBilingual('Feature on home page', 'በዋና ገጽ ላይ አጉላ')}
                  </Button>
                  <Button
                    variant="outline"
                    icon={<Undo2 className="h-4 w-4" />}
                    disabled={Boolean(busy)}
                    onClick={() => setConfirm('unpublish')}
                  >
                    {tBilingual('Unpublish', 'ከህትመት አውርድ')}
                  </Button>
                </>
              )}
              {canPublish && status === 'ARCHIVED' && (
                <Button
                  variant="success"
                  icon={<Send className="h-4 w-4" />}
                  isLoading={busy === 'republish'}
                  disabled={Boolean(busy)}
                  onClick={() => void republish()}
                >
                  {tBilingual('Publish again', 'እንደገና አትም')}
                </Button>
              )}
              <Button
                variant="ghost"
                icon={<Eye className="h-4 w-4" />}
                onClick={() => setPreviewOpen(true)}
              >
                {tBilingual('Preview', 'ቅድመ-እይታ')}
              </Button>
              {status === 'PUBLISHED' && news && (
                <Link
                  href={newsPath(news.slug)}
                  target="_blank"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  {tBilingual('View public page', 'የህዝብ ገጹን ይመልከቱ')}
                </Link>
              )}
              {news && canEdit && (
                <Button
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                  icon={<Trash2 className="h-4 w-4" />}
                  disabled={Boolean(busy)}
                  onClick={() => setConfirm('delete')}
                >
                  {tBilingual('Delete', 'ሰርዝ')}
                </Button>
              )}
            </div>
          </Card>

          {/* Details + engagement */}
          {news && (
            <Card>
              <dl className="space-y-2.5 text-xs">
                <Detail label={tBilingual('Author', 'ጸሐፊ')}>
                  {news.createdBy.firstName} {news.createdBy.lastName}
                </Detail>
                <Detail label={tBilingual('Created', 'የተፈጠረበት')}>{formatNewsDate(news.createdAt, lang)}</Detail>
                {news.updatedBy && (
                  <Detail label={tBilingual('Last edited by', 'መጨረሻ ያስተካከለው')}>
                    {news.updatedBy.firstName} {news.updatedBy.lastName}
                  </Detail>
                )}
                {news.reviewedBy && (
                  <Detail label={tBilingual('Reviewed by', 'የገመገመው')}>
                    {news.reviewedBy.firstName} {news.reviewedBy.lastName}
                    {news.reviewedAt ? ` · ${formatNewsDate(news.reviewedAt, lang)}` : ''}
                  </Detail>
                )}
                {news.publishedAt && (
                  <Detail label={tBilingual('First published', 'መጀመሪያ የታተመበት')}>
                    {formatNewsDate(news.publishedAt, lang)}
                  </Detail>
                )}
              </dl>
              <div className="mt-4 grid grid-cols-5 gap-1 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
                <Stat icon={ThumbsUp} value={news.likeCount} title={tBilingual('Likes', 'ወደድኩት')} />
                <Stat icon={ThumbsDown} value={news.dislikeCount} title={tBilingual('Dislikes', 'አልወደድኩትም')} />
                <Stat icon={MessageCircle} value={news.commentCount} title={tBilingual('Comments', 'አስተያየቶች')} />
                <Stat icon={Eye} value={news.viewCount} title={tBilingual('Views', 'እይታዎች')} />
                <Stat icon={Share2} value={news.shareCount} title={tBilingual('Shares', 'ማጋራቶች')} />
              </div>
              {canPublish && (
                <Link
                  href={`/news-management/${news.id}/comments`}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {tBilingual('Moderate comments', 'አስተያየቶችን አስተዳድር')}
                </Link>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Preview renders exactly what readers will see */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={tBilingual('Preview', 'ቅድመ-እይታ')}
        size="xl"
      >
        <div className="mx-auto max-w-3xl">
          <NewsArticleView
            news={{
              headline: form.headline || '—',
              content: form.content,
              coverImageUrl: news?.coverImageUrl ?? null,
              category: form.category,
              source: form.source,
              eventDate: form.eventDate || null,
              publishedAt: news?.publishedAt ?? new Date().toISOString(),
              images,
            }}
          />
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={tBilingual('Reject news', 'ዜናውን ውድቅ አድርግ')}
        subtitle={tBilingual('The author will see this reason.', 'ጸሐፊው ይህን ምክንያት ያያል።')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {tBilingual('Cancel', 'ሰርዝ')}
            </Button>
            <Button
              variant="danger"
              isLoading={busy === 'reject'}
              disabled={!rejectReason.trim()}
              onClick={() => void reject()}
            >
              {tBilingual('Reject', 'ውድቅ አድርግ')}
            </Button>
          </div>
        }
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={1000}
          rows={4}
          autoFocus
          placeholder={tBilingual('What needs to change?', 'ምን መቀየር አለበት?')}
          className={cn(inputClass, 'resize-y')}
        />
      </Modal>

      <ConfirmModal
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        isLoading={busy === 'delete'}
        title={tBilingual('Delete this news?', 'ይህ ዜና ይሰረዝ?')}
        description={tBilingual(
          'It will disappear from the site and this list. The record is kept for audit purposes.',
          'ከድረ-ገጹ እና ከዚህ ዝርዝር ይጠፋል። መዝገቡ ለኦዲት ዓላማ ይቀመጣል።',
        )}
        confirmText={tBilingual('Delete', 'ሰርዝ')}
        variant="danger"
      />
      <ConfirmModal
        open={confirm === 'unpublish'}
        onClose={() => setConfirm(null)}
        onConfirm={unpublish}
        isLoading={busy === 'unpublish'}
        title={tBilingual('Unpublish this news?', 'ይህ ዜና ከህትመት ይውረድ?')}
        description={tBilingual(
          'It will be removed from the public site. You can publish it again later.',
          'ከህዝብ ገጹ ይወገዳል። በኋላ እንደገና ማተም ይችላሉ።',
        )}
        confirmText={tBilingual('Unpublish', 'ከህትመት አውርድ')}
        variant="warning"
      />
      <ConfirmModal
        open={Boolean(imageToDelete)}
        onClose={() => setImageToDelete(null)}
        onConfirm={removeImage}
        isLoading={busy === 'image-delete'}
        title={tBilingual('Delete this photo?', 'ይህ ፎቶ ይሰረዝ?')}
        description={tBilingual('This cannot be undone.', 'ይህ ሊቀለበስ አይችልም።')}
        confirmText={tBilingual('Delete', 'ሰርዝ')}
        variant="danger"
      />
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'red' | 'amber' | 'blue' | 'slate';
  icon: ReactNode;
  children: ReactNode;
}) {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    blue: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
    slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
  };
  return (
    <div className={cn('mb-5 flex gap-2.5 rounded-xl border px-4 py-3 text-sm', tones[tone])}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

function FieldFoot({ error, count, max }: { error?: string; count: number; max: number }) {
  return (
    <div className="mt-1 flex justify-between text-xs">
      <span className="text-red-600">{error}</span>
      <span className="tabular-nums text-slate-400">
        {count}/{max}
      </span>
    </div>
  );
}

function IconButton({
  label,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 text-slate-400 transition disabled:opacity-30',
        danger
          ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40'
          : 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800 dark:text-slate-200">{children}</dd>
    </div>
  );
}

function Stat({ icon: Icon, value, title }: { icon: LucideIcon; value: number; title: string }) {
  return (
    <div title={title}>
      <Icon className="mx-auto h-4 w-4 text-slate-400" aria-hidden />
      <div className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">{value}</div>
      <div className="sr-only">{title}</div>
    </div>
  );
}
