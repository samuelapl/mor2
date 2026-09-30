'use client';

import { Headphones, PlayCircle, BookOpenCheck, CheckCircle2, Lock } from 'lucide-react';
import type { Lesson, UploadedResource } from '@/types';
import type { ApiProgressLesson, ApiProgressSubLesson, ApiAttachedAssessment } from '@/lib/api/types';
import { RichContent } from '@/components/ui/RichContent';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getItemAttachments } from '@/components/features/courses/wizard-components';
import { ClassroomAttachments } from '../ClassroomAttachments';

interface MediaStageProps {
  title: string;
  badgeLabel?: string;
  durationMin?: number;
  contentType: 'VIDEO' | 'AUDIO';
  resourceUrl?: string | null;
  content?: string | null;
  lesson?: Lesson;
  lessonProgress?: ApiProgressLesson;
  subLessonProgress?: ApiProgressSubLesson;
  assessment?: ApiAttachedAssessment | null;
  onTakeQuiz?: (assessmentId: string) => void;
}

export function MediaStage({
  title,
  badgeLabel,
  durationMin,
  contentType,
  resourceUrl,
  content,
  lesson,
  lessonProgress,
  subLessonProgress,
  assessment,
  onTakeQuiz,
}: MediaStageProps) {
  const allAttachments: UploadedResource[] = lesson ? getItemAttachments(lesson) : [];

  const isVideoAttachment = (a: UploadedResource) =>
    a.type?.startsWith('video/') ||
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(a.url) ||
    /\.(mp4|webm|ogg|mov)$/i.test(a.name);

  // Video attachment fallback if resourceUrl is not explicitly set
  const videoAttachment = allAttachments.find(isVideoAttachment);
  const effectiveResourceUrl = resourceUrl || videoAttachment?.url || null;

  // Filter out video files from attachments so they are not listed in Lab Materials
  const documentAttachments = allAttachments.filter((a) => !isVideoAttachment(a));

  const isVideo = contentType === 'VIDEO' || Boolean(videoAttachment);
  const isYoutube =
    effectiveResourceUrl &&
    (effectiveResourceUrl.includes('youtube.com') || effectiveResourceUrl.includes('youtu.be'));

  const getYoutubeEmbed = (url: string) => {
    try {
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      const match = url.match(/[?&]v=([^&#]*)/);
      return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : url;
    } catch {
      return url;
    }
  };

  const hasSubLessons = Boolean(lesson?.subLessons && lesson.subLessons.length > 0);
  const subLessonsAllDone = hasSubLessons
    ? (lessonProgress?.subLessons?.every((s) => s.completed) ?? false)
    : true;
  const isTimeMet = lessonProgress?.timeSatisfied ?? true;
  const isQuizUnlocked = subLessonsAllDone && isTimeMet;
  const isQuizPassed = assessment?.passed ?? false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 space-y-2">
        <div className="flex items-center gap-2">
          {badgeLabel ? (
            <Badge variant="indigo" className="text-xs">
              {badgeLabel}
            </Badge>
          ) : null}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {isVideo ? (
              <PlayCircle className="h-3 w-3 text-rose-500" />
            ) : (
              <Headphones className="h-3 w-3 text-amber-500" />
            )}
            {isVideo ? 'Video Lecture' : 'Audio Lecture'}
            {durationMin ? ` · ${durationMin} min` : ''}
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      </div>

      {/* Media Player Box */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-md">
        {effectiveResourceUrl ? (
          isVideo ? (
            isYoutube ? (
              <div className="aspect-video w-full">
                <iframe
                  src={getYoutubeEmbed(effectiveResourceUrl)}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={title}
                />
              </div>
            ) : (
              <div className="aspect-video w-full flex items-center justify-center bg-black">
                <video src={effectiveResourceUrl} controls className="h-full w-full max-h-[500px]" />
              </div>
            )
          ) : (
            <div className="p-8 flex flex-col items-center justify-center gap-4 bg-slate-900 text-white">
              <Headphones className="h-12 w-12 text-indigo-400" />
              <p className="text-sm font-semibold">{title}</p>
              <audio src={effectiveResourceUrl} controls className="w-full max-w-md" />
            </div>
          )
        ) : (
          <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-slate-400">
            <PlayCircle className="h-10 w-10 text-slate-600" />
            <p className="text-xs">No media stream URL configured for this lecture.</p>
          </div>
        )}
      </div>

      {/* Lecture Notes below player */}
      {content && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Lecture Notes & Detailed Study Material
          </h3>
          <div className="text-[15px] sm:text-base leading-relaxed text-slate-800 prose prose-base max-w-none">
            <RichContent
              html={content}
              className="text-[15px] sm:text-base leading-relaxed text-slate-800"
            />
          </div>
        </div>
      )}

      {/* Attached Resources (Documents / PDFs only — videos are displayed in the player) */}
      {documentAttachments.length > 0 && (
        <div className="pt-2">
          <ClassroomAttachments files={documentAttachments} />
        </div>
      )}

      {/* Lesson Assessment Checkpoint Card (if assessment is attached) */}
      {assessment && onTakeQuiz && (
        <div className="pt-4">
          <div
            className={`rounded-2xl border p-5 sm:p-6 transition-all shadow-2xs ${
              isQuizPassed
                ? 'border-emerald-200 bg-emerald-50/60'
                : isQuizUnlocked
                  ? 'border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 bg-slate-50/70'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    isQuizPassed
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                      : isQuizUnlocked
                        ? 'border-indigo-300 bg-indigo-100 text-indigo-700 shadow-2xs'
                        : 'border-slate-200 bg-slate-100 text-slate-400'
                  }`}
                >
                  {isQuizPassed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isQuizUnlocked ? (
                    <BookOpenCheck className="h-5 w-5" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{assessment.titleEn}</h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isQuizPassed
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isQuizUnlocked
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                    >
                      {isQuizPassed
                        ? 'Assessment Passed'
                        : isQuizUnlocked
                          ? 'Assessment Ready'
                          : 'Assessment Locked'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {isQuizPassed
                      ? `You successfully passed this checkpoint assessment (Requirement: ${assessment.passingScore}%). Great job!`
                      : isQuizUnlocked
                        ? `Passing score: ${assessment.passingScore}%. Test your understanding to unlock the next lesson.`
                        : `Complete all preceding topics and required reading time to unlock this assessment.`}
                  </p>
                </div>
              </div>

              <div className="shrink-0 sm:self-center">
                <Button
                  type="button"
                  size="sm"
                  disabled={!isQuizUnlocked}
                  onClick={() => onTakeQuiz(assessment.id)}
                  className={
                    isQuizPassed
                      ? 'border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50'
                      : isQuizUnlocked
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        : 'bg-slate-200 text-slate-400'
                  }
                >
                  {isQuizPassed ? (
                    'Review / Retake Assessment'
                  ) : isQuizUnlocked ? (
                    'Take Lesson Assessment →'
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 mr-1" /> Assessment Locked
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
