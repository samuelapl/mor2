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
import { useAuthStore } from '@/lib/stores/auth-store';
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
  const currentUser = useAuthStore((s) => s.currentUser);
  const { can, isSystemAdmin } = usePermissions();
  const { lang, t } = useTranslation('news');

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
    if (!form.headline.trim()) next.headline = t('newsEditor.headlineIsRequired');
    else if (form.headline.trim().length > 200)
      next.headline = t('newsEditor.atMost200Characters');
    if (form.summary.trim().length > 300)
      next.summary = t('newsEditor.atMost300Characters');
    if (!stripHtmlTags(form.content).trim())
      next.content = t('newsEditor.contentIsRequired');
    if (form.source.trim().length > 120)
      next.source = t('newsEditor.atMost120Characters');
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
        toast.success(t('newsEditor.draftSavedYouCanNowAdd'));
        router.replace(`/news-management/${created.id}`);
      }
      return created;
    }
    if (!isDirty) return news;
    const updated = await run('save', () => updateNews(news.id, toInput(form)), 'Could not save changes');
    if (updated) {
      applyServerNews(updated);
      toast.success(t('newsEditor.changesSaved'));
    }
    return updated;
  };

  const submit = async () => {
    const saved = await save();
    if (!saved || !news) return;
    const result = await run('submit', () => submitNews(news.id), 'Could not submit for review');
    if (result) {
      applyServerNews(result);
      toast.success(t('newsEditor.submittedForReview'));
    }
  };

  const approve = async () => {
    if (!news) return;
    const result = await run('approve', () => reviewNews(news.id, { approve: true }), 'Could not publish');
    if (result) {
      applyServerNews(result);
      toast.success(t('newsEditor.published'));
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
      toast.success(t('newsEditor.returnedToTheAuthor'));
    }
  };

  const unpublish = async () => {
    if (!news) return;
    const result = await run('unpublish', () => unpublishNews(news.id), 'Could not unpublish');
    setConfirm(null);
    if (result) {
      applyServerNews(result);
      toast.success(t('newsEditor.takenOffThePublicSite'));
    }
  };

  const republish = async () => {
    if (!news) return;
    const result = await run('republish', () => republishNews(news.id), 'Could not republish');
    if (result) {
      applyServerNews(result);
      toast.success(t('newsEditor.publishedAgain'));
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
      toast.success(t('newsEditor.newsDeleted'));
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
          {t('newsEditor.backToNews')}
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
        {t('newsDetailView.allNews')}
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          {news ? t('newsEditor.editNews') : t('newsEditor.newNews')}
        </h1>
        {status && <NewsStatusBadge status={status} />}
        {news?.isFeatured && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
            <Star className="h-3.5 w-3.5 fill-current" />
            {t('newsCard.featured')}
          </span>
        )}
      </div>

      {/* Status banners */}
      {status === 'REJECTED' && news?.rejectionReason && (
        <Banner tone="red" icon={<XCircle className="h-4 w-4" />}>
          <strong>{t('newsEditor.returnedByTheReviewer')}</strong>{' '}
          <span lang={newsTextLang(news.rejectionReason)}>{news.rejectionReason}</span>
          {canSubmit && (
            <span className="block text-xs opacity-80">
              {t('newsEditor.fixItAndSubmitAgain')}
            </span>
          )}
        </Banner>
      )}
      {status === 'PENDING_REVIEW' && !canReview && (
        <Banner tone="amber" icon={<Clock className="h-4 w-4" />}>
          {isAuthor
            ? t('newsEditor.waitingForAPublisherToReview')
            : t('newsEditor.waitingForReviewYouCannotReview')}
        </Banner>
      )}
      {status === 'PUBLISHED' && canEdit && (
        <Banner tone="blue" icon={<AlertTriangle className="h-4 w-4" />}>
          {t('newsEditor.thisNewsIsLiveSavedChanges')}
        </Banner>
      )}
      {readOnly && status !== 'PENDING_REVIEW' && (
        <Banner tone="slate" icon={<Eye className="h-4 w-4" />}>
          {t('newsEditor.youCanViewThisNewsBut')}
        </Banner>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Main column ── */}
        <div className="space-y-6">
          <Card>
            <div className="space-y-5">
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                {t('newsEditor.writeInAmharicOrEnglishReaders')}
              </p>

              <div>
                <label htmlFor="news-headline" className={labelClass}>
                  {t('newsEditor.headline')} <span className="text-red-500">*</span>
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
                  {t('newsEditor.summary')}{' '}
                  <span className="font-normal text-slate-400">
                    {t('newsEditor.optionalTakenFromTheContentIf')}
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
                  label={t('newsEditor.content')}
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
              {t('newsEditor.photos')}
            </h2>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {t('newsEditor.jpegPngOrWebpUpTo')}
            </p>

            {!news ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
                {t('newsEditor.saveTheDraftFirstToAdd')}
              </p>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className={labelClass}>
                    {t('newsEditor.coverImage')} <span className="text-red-500">*</span>
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
                            ? t('newsEditor.replaceCover')
                            : t('newsEditor.uploadCover')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className={cn(labelClass, 'mb-0')}>
                      {t('newsEditor.gallery')} ({images.length})
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
                          {t('newsEditor.addPhotos')}
                        </Button>
                      </>
                    )}
                  </div>
                  {images.length === 0 ? (
                    <p className="text-xs text-slate-400">{t('newsEditor.noGalleryPhotos')}</p>
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
                            placeholder={t('newsEditor.captionOptional')}
                            maxLength={300}
                            disabled={!canEdit}
                            className={cn(inputClass, 'py-2')}
                          />
                          {canEdit && (
                            <div className="flex shrink-0 items-center">
                              <IconButton
                                label={t('newsEditor.moveUp')}
                                disabled={index === 0}
                                onClick={() => void moveImage(index, -1)}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label={t('newsEditor.moveDown')}
                                disabled={index === images.length - 1}
                                onClick={() => void moveImage(index, 1)}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label={t('newsEditor.deletePhoto')}
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
                  {t('newsEditor.category')}
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
                      {t(NEWS_CATEGORY_LABELS[c])}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="news-source" className={labelClass}>
                  {t('newsEditor.source')}
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
                  {t('newsEditor.eventDate')}{' '}
                  <span className="font-normal text-slate-400">
                    {t('newsEditor.shownInsteadOfThePublishDate')}
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
                {t('newsEditor.allowComments')}
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
                    ? t('newsEditor.saveDraft')
                    : isDirty
                      ? t('newsComments.saveChanges')
                      : t('newsEditor.allChangesSaved')}
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
                    ? t('newsEditor.resubmitForReview')
                    : t('newsEditor.submitForReview')}
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
                    {t('newsEditor.approvePublish')}
                  </Button>
                  <Button
                    variant="danger"
                    icon={<XCircle className="h-4 w-4" />}
                    disabled={Boolean(busy)}
                    onClick={() => setRejectOpen(true)}
                  >
                    {t('newsEditor.reject')}
                  </Button>
                  {isDirty && (
                    <p className="text-xs text-amber-600">
                      {t('newsEditor.saveYourEditsBeforeApproving')}
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
                      ? t('newsEditor.removeFromFeatured')
                      : t('newsEditor.featureOnHomePage')}
                  </Button>
                  <Button
                    variant="outline"
                    icon={<Undo2 className="h-4 w-4" />}
                    disabled={Boolean(busy)}
                    onClick={() => setConfirm('unpublish')}
                  >
                    {t('newsEditor.unpublish')}
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
                  {t('newsEditor.publishAgain')}
                </Button>
              )}
              <Button
                variant="ghost"
                icon={<Eye className="h-4 w-4" />}
                onClick={() => setPreviewOpen(true)}
              >
                {t('newsEditor.preview')}
              </Button>
              {status === 'PUBLISHED' && news && (
                <Link
                  href={newsPath(news.slug)}
                  target="_blank"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('newsEditor.viewPublicPage')}
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
                  {t('newsComments.delete')}
                </Button>
              )}
            </div>
          </Card>

          {/* Details + engagement */}
          {news && (
            <Card>
              <dl className="space-y-2.5 text-xs">
                <Detail label={t('newsEditor.author')}>
                  {news.createdBy.firstName} {news.createdBy.lastName}
                </Detail>
                <Detail label={t('newsEditor.created')}>{formatNewsDate(news.createdAt, lang)}</Detail>
                {news.updatedBy && (
                  <Detail label={t('newsEditor.lastEditedBy')}>
                    {news.updatedBy.firstName} {news.updatedBy.lastName}
                  </Detail>
                )}
                {news.reviewedBy && (
                  <Detail label={t('newsEditor.reviewedBy')}>
                    {news.reviewedBy.firstName} {news.reviewedBy.lastName}
                    {news.reviewedAt ? ` · ${formatNewsDate(news.reviewedAt, lang)}` : ''}
                  </Detail>
                )}
                {news.publishedAt && (
                  <Detail label={t('newsEditor.firstPublished')}>
                    {formatNewsDate(news.publishedAt, lang)}
                  </Detail>
                )}
              </dl>
              <div className="mt-4 grid grid-cols-5 gap-1 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
                <Stat icon={ThumbsUp} value={news.likeCount} title={t('newsEditor.likes')} />
                <Stat icon={ThumbsDown} value={news.dislikeCount} title={t('newsEditor.dislikes')} />
                <Stat icon={MessageCircle} value={news.commentCount} title={t('newsComments.comments')} />
                <Stat icon={Eye} value={news.viewCount} title={t('newsEditor.views')} />
                <Stat icon={Share2} value={news.shareCount} title={t('newsEditor.shares')} />
              </div>
              {canPublish && (
                <Link
                  href={`/news-management/${news.id}/comments`}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t('newsEditor.moderateComments')}
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
        title={t('newsEditor.preview')}
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
        title={t('newsEditor.rejectNews')}
        subtitle={t('newsEditor.theAuthorWillSeeThisReason')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {t('newsComments.cancel')}
            </Button>
            <Button
              variant="danger"
              isLoading={busy === 'reject'}
              disabled={!rejectReason.trim()}
              onClick={() => void reject()}
            >
              {t('newsEditor.reject')}
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
          placeholder={t('newsEditor.whatNeedsToChange')}
          className={cn(inputClass, 'resize-y')}
        />
      </Modal>

      <ConfirmModal
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        isLoading={busy === 'delete'}
        title={t('newsEditor.deleteThisNews')}
        description={t('newsEditor.itWillDisappearFromTheSite')}
        confirmText={t('newsComments.delete')}
        variant="danger"
      />
      <ConfirmModal
        open={confirm === 'unpublish'}
        onClose={() => setConfirm(null)}
        onConfirm={unpublish}
        isLoading={busy === 'unpublish'}
        title={t('newsEditor.unpublishThisNews')}
        description={t('newsEditor.itWillBeRemovedFromThe')}
        confirmText={t('newsEditor.unpublish')}
        variant="warning"
      />
      <ConfirmModal
        open={Boolean(imageToDelete)}
        onClose={() => setImageToDelete(null)}
        onConfirm={removeImage}
        isLoading={busy === 'image-delete'}
        title={t('newsEditor.deleteThisPhoto')}
        description={t('newsComments.thisCannotBeUndone')}
        confirmText={t('newsComments.delete')}
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
