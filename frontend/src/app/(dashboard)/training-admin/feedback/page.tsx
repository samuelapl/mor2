'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  GraduationCap,
  HeartHandshake,
  Mail,
  MessageSquareHeart,
  MessageSquareQuote,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  X,
} from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLms } from '@/lib/lms-store';
import {
  fetchCourseFeedbacks,
  markFeedbackReviewed,
  deleteFeedback,
  type CourseFeedbackItem,
} from '@/lib/api/feedback';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export default function CourseFeedbackPage() {
  const { currentUser, courses } = useLms();
  const { tBilingual } = useTranslation();

  const [feedbacks, setFeedbacks] = useState<CourseFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'REVIEWED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await fetchCourseFeedbacks();
      setFeedbacks(items);
    } catch {
      toast.error(tBilingual('Failed to load feedback records.', 'የግብረ-መልስ መዝገቦችን መጫን አልተቻለም።'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleMarkReviewed = async (id: string) => {
    setReviewingId(id);
    try {
      const reviewerName =
        currentUser?.name ||
        `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() ||
        'Training Coordinator';
      await markFeedbackReviewed(id, reviewerName);
      toast.success(tBilingual('Feedback marked as reviewed.', 'ግብረ-መልሱ እንደተገመገመ ምልክት ተደርጓል።'));
      await loadData();
    } catch {
      toast.error(tBilingual('Action failed.', 'እርምጃው አልተሳካም።'));
    } finally {
      setReviewingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(tBilingual('Delete this feedback entry?', 'ይህን የግብረ-መልስ መዝገብ ይሰርዙ?'))) {
      return;
    }
    await deleteFeedback(id);
    toast.success(tBilingual('Feedback removed.', 'ግብረ-መልሱ ተሰርዟል።'));
    await loadData();
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = feedbacks.length;
    if (total === 0) return { total: 0, avgRating: 0, satisfactionRate: 0, pendingCount: 0 };

    const sumRating = feedbacks.reduce((acc, f) => acc + f.overallRating, 0);
    const avgRating = Math.round((sumRating / total) * 10) / 10;
    const satisfied = feedbacks.filter((f) => f.overallRating >= 4).length;
    const satisfactionRate = Math.round((satisfied / total) * 100);
    const pendingCount = feedbacks.filter((f) => f.status === 'PENDING_REVIEW').length;

    return { total, avgRating, satisfactionRate, pendingCount };
  }, [feedbacks]);

  // Filtering
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      if (selectedCourseId !== 'ALL' && item.courseId !== selectedCourseId) {
        return false;
      }
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.userName.toLowerCase().includes(q);
        const matchesEmail = item.userEmail.toLowerCase().includes(q);
        const matchesDept = item.department?.toLowerCase().includes(q) ?? false;
        const matchesComment = item.comments.toLowerCase().includes(q);
        const matchesCourse = item.courseTitle.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesDept || matchesComment || matchesCourse;
      }
      return true;
    });
  }, [feedbacks, selectedCourseId, statusFilter, searchQuery]);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    filteredFeedbacks,
    8,
  );

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <PageShell
      role={currentUser?.role ?? 'training_admin'}
      title={tBilingual('Course Feedback Management', 'የኮርስ ግብረ-መልስ አስተዳደር')}
      description={tBilingual(
        'Inspect learner course evaluations, track training quality indicators, and review curriculum feedback submitted prior to certificate issuance.',
        'የተማሪዎችን የኮርስ ግምገማዎች ይመልከቱ፣ የስልጠና ጥራት አመልካቾችን ይከታተሉ እንዲሁም ሰርተፊኬት ከመሰጠቱ በፊት የቀረቡ የግብረ-መልስ ሪፖርቶችን ያስተዳድሩ።',
      )}
    >
      <div className="space-y-6">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                {tBilingual('Total Evaluations', 'አጠቃላይ ግምገማዎች')}
              </span>
              <MessageSquareQuote className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 font-display">
              {metrics.total}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {tBilingual('All submitted learner forms', 'የቀረቡ የተማሪዎች ቅጾች')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                {tBilingual('Average Rating', 'አማካይ ደረጃ')}
              </span>
              <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 font-display flex items-baseline gap-1.5">
              {metrics.avgRating} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {tBilingual('Overall satisfaction score', 'አጠቃላይ የእርካታ ነጥብ')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                {tBilingual('High Satisfaction', 'ከፍተኛ እርካታ')}
              </span>
              <ThumbsUp className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 font-display">
              {metrics.satisfactionRate}%
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {tBilingual('Rated 4 stars or higher', '4 ወይም ከዚያ በላይ ኮከብ ያገኙ')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                {tBilingual('Pending Review', 'ምላሽ የሚጠብቁ')}
              </span>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 font-display">
              {metrics.pendingCount}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {tBilingual('Awaiting coordinator check', 'የአስተባባሪ እይታ የሚጠብቁ')}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={tBilingual(
                    'Search learner, department, or comment...',
                    'ተማሪን፣ ክፍልን ወይም አስተያየትን ይፈልጉ...',
                  )}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Course Selector */}
              <div className="relative min-w-[200px]">
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">{tBilingual('All Courses', 'ሁሉም ኮርሶች')}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-slate-50/70 p-1">
              {(['ALL', 'PENDING_REVIEW', 'REVIEWED'] as const).map((st) => {
                const label =
                  st === 'ALL'
                    ? tBilingual('All', 'ሁሉም')
                    : st === 'PENDING_REVIEW'
                      ? tBilingual('Pending Review', 'ምላሽ የሚጠብቁ')
                      : tBilingual('Reviewed', 'የተገመገሙ');

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setPage(1);
                    }}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-semibold transition',
                      statusFilter === st
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">
              {tBilingual('Loading feedback entries...', 'የግብረ-መልስ መዝገቦችን በመጫን ላይ...')}
            </p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-4 ring-indigo-50 mb-3">
              <MessageSquareHeart className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {tBilingual('No feedback submissions found', 'ምንም የቀረበ ግብረ-መልስ አልተገኘም')}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {tBilingual(
                'Learners will submit course evaluations right after passing the final assessment and prior to claiming their certificate.',
                'ተማሪዎች የማጠቃለያ ፈተናውን ካጠናቀቁ በኋላ ሰርተፊኬታቸውን ከመውሰዳቸው በፊት ግብረ-መልስ ያስገባሉ።',
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pageItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'relative rounded-2xl border p-5 shadow-xs transition bg-white',
                  item.status === 'PENDING_REVIEW'
                    ? 'border-amber-200/80 bg-gradient-to-r from-amber-50/20 via-white to-white'
                    : 'border-slate-200/80 hover:border-slate-300',
                )}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Student Info & Course */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-sm">
                      {item.userName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{item.userName}</h4>
                        <span className="text-xs text-slate-400">({item.userEmail})</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {item.department || 'MoR Staff'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold text-indigo-600">
                          <BookOpen className="h-3.5 w-3.5" />
                          {item.courseTitle}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(item.submittedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Badge & Action Button */}
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 border border-amber-200/80">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-amber-900">{item.overallRating}</span>
                      <span className="text-[10px] text-amber-600">/ 5</span>
                    </div>

                    <Badge variant={item.status === 'REVIEWED' ? 'green' : 'amber'} dot>
                      {item.status === 'REVIEWED'
                        ? tBilingual('Reviewed', 'የተገመገመ')
                        : tBilingual('Pending Review', 'ምላሽ የሚጠብቅ')}
                    </Badge>
                  </div>
                </div>

                {/* Score Breakdown Strip */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-xl bg-slate-50/70 p-3 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      {tBilingual('Curriculum', 'ስርዓተ-ትምህርት')}
                    </span>
                    <span className="font-semibold text-slate-800">
                      ⭐ {item.ratings.curriculumRelevance}/5
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      {tBilingual('Trainer', 'አሰልጣኝ')}
                    </span>
                    <span className="font-semibold text-slate-800">
                      ⭐ {item.ratings.trainerDelivery}/5
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      {tBilingual('Applicability', 'ተግባራዊነት')}
                    </span>
                    <span className="font-semibold text-slate-800">
                      ⭐ {item.ratings.practicalApplicability}/5
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      {tBilingual('Platform', 'መድረክ')}
                    </span>
                    <span className="font-semibold text-slate-800">
                      ⭐ {item.ratings.materialsAndPlatform}/5
                    </span>
                  </div>
                </div>

                {/* Qualitative Feedback Quote */}
                <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3.5">
                  <div className="flex items-start gap-2">
                    <MessageSquareQuote className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      "{item.comments}"
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-50 pt-2">
                    <div className="flex items-center gap-1.5">
                      {item.recommendToColleagues ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <ThumbsUp className="h-3 w-3" />{' '}
                          {tBilingual('Recommends Course', 'ኮርሱን ይመክራል')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <ThumbsDown className="h-3 w-3" />{' '}
                          {tBilingual('Suggests Updates', 'ማሻሻያዎችን ይመክራል')}
                        </span>
                      )}
                    </div>

                    {item.reviewedBy && (
                      <span className="text-slate-400">
                        {tBilingual('Reviewed by', 'የተገመገመው በ')}:{' '}
                        <strong className="text-slate-600">{item.reviewedBy}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {item.status === 'PENDING_REVIEW' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleMarkReviewed(item.id)}
                      disabled={reviewingId === item.id}
                      isLoading={reviewingId === item.id}
                      className="gap-1.5 text-xs py-1.5 px-3"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {tBilingual('Mark as Reviewed', 'እንደተገመገመ ምልክት አድርግ')}
                    </Button>
                  )}

                  <button
                    type="button"
                    title={tBilingual('Delete Feedback', 'ግብረ-መልስ ሰርዝ')}
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination Strip */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 8, 15, 25]}
              />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
