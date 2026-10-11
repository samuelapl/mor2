'use client';

import {
  Headphones,
  PlayCircle,
  BookOpenCheck,
  CheckCircle2,
  Lock,
  Presentation,
} from 'lucide-react';
import type { Lesson, UploadedResource } from '@/types';
import type { ApiProgressLesson, ApiProgressSubLesson, ApiAttachedAssessment } from '@/lib/api/types';
import { RichContent } from '@/components/ui/RichContent';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getItemAttachments } from '@/components/features/courses/wizard-components';
import { ClassroomAttachments } from '../ClassroomAttachments';
import { SlideDeckViewer } from '@/components/shared/SlideDeckViewer';

interface MediaStageProps {
  title: string;
  badgeLabel?: string;
  durationMin?: number;
  contentType: 'VIDEO' | 'AUDIO' | 'PRESENTATION';
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
  const effectiveResourceUrl = resourceUrl || (contentType === 'VIDEO' ? videoAttachment?.url : null);

  // Filter out the primary lecture media and video files from handouts list
  const documentAttachments = allAttachments.filter(
    (a) => !isVideoAttachment(a) && a.url !== effectiveResourceUrl,
  );

  const isPresentation = contentType === 'PRESENTATION';
  const isVideo = contentType === 'VIDEO' || Boolean(videoAttachment);
  const isAudio = contentType === 'AUDIO';

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
      <div className="border-b border-border pb-4 space-y-2">
        <div className="flex items-center gap-2">
          {badgeLabel ? (
            <Badge variant="indigo" className="text-xs">
              {badgeLabel}
            </Badge>
          ) : null}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {isPresentation ? (
              <Presentation className="h-3 w-3 text-indigo-500" />
            ) : isVideo ? (
              <PlayCircle className="h-3 w-3 text-rose-500" />
            ) : (
              <Headphones className="h-3 w-3 text-amber-500" />
            )}
            {isPresentation
              ? 'Slide Deck'
              : isVideo
                ? 'Video Lecture'
                : 'Audio Lecture'}
            {durationMin ? ` · ${durationMin} min` : ''}
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      </div>

      {/* Multi-Content Blocks or Single Media Player */}
      {lesson?.contentBlocks && lesson.contentBlocks.length > 0 ? (
        <div className="space-y-6">
          {lesson.contentBlocks.map((block, bIdx) => {
            const bUrl = block.url;
            const bTitle = block.title || title;
            const bFileName = block.fileName || bTitle;

            if (block.type === 'DOCUMENT') {
              const htmlContent = block.content;
              if (!htmlContent?.trim()) return null;
              return (
                <div key={block.id || `doc-${bIdx}`} className="rounded-2xl border border-border/90 bg-card p-6 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-soft text-primary text-[11px]">
                      {bIdx + 1}
                    </span>
                    <h4>{bTitle || 'Lecture Notes & Study Material'}</h4>
                  </div>
                  <div className="text-[15px] sm:text-base leading-relaxed text-foreground prose dark:prose-invert prose-base max-w-none">
                    <RichContent html={htmlContent} className="text-[15px] sm:text-base leading-relaxed text-foreground" />
                  </div>
                </div>
              );
            }

            if (block.type === 'PRESENTATION') {
              return bUrl ? (
                <SlideDeckViewer
                  key={block.id || `pres-${bIdx}`}
                  url={bUrl}
                  fileName={block.fileName}
                  title={bTitle}
                  className="rounded-2xl shadow-md"
                  badge={
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-950 text-[11px] font-bold text-indigo-400">
                      {bIdx + 1}
                    </span>
                  }
                />
              ) : (
                <div key={block.id || `pres-${bIdx}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-xs text-subtle-foreground">
                  No presentation URL provided.
                </div>
              );
            }

            if (block.type === 'VIDEO') {
              const isBlockYt = bUrl && (bUrl.includes('youtube.com') || bUrl.includes('youtu.be'));
              return (
                <div key={block.id || `vid-${bIdx}`} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-md">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-subtle-foreground">
                    <div className="flex items-center gap-2 truncate">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-950 text-rose-400 font-bold text-[11px]">
                        {bIdx + 1}
                      </span>
                      <PlayCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span className="font-semibold truncate">{bFileName}</span>
                    </div>
                  </div>
                  {bUrl ? (
                    isBlockYt ? (
                      <div className="aspect-video w-full">
                        <iframe
                          src={getYoutubeEmbed(bUrl)}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={bTitle}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full flex items-center justify-center bg-black">
                        <video src={bUrl} controls className="h-full w-full max-h-[500px]" />
                      </div>
                    )
                  ) : (
                    <div className="p-8 text-center text-xs text-subtle-foreground">No video URL provided.</div>
                  )}
                </div>
              );
            }

            if (block.type === 'AUDIO') {
              return (
                <div key={block.id || `aud-${bIdx}`} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-md p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-950 text-amber-400 font-bold text-xs">
                      {bIdx + 1}
                    </span>
                    <Headphones className="h-5 w-5 text-amber-400" />
                    <span className="text-sm font-semibold truncate">{bFileName}</span>
                  </div>
                  {bUrl ? (
                    <audio src={bUrl} controls className="w-full" />
                  ) : (
                    <div className="text-center text-xs text-subtle-foreground">No audio URL provided.</div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      ) : (
        <>
          {/* Legacy Media Player Box / Slide Viewer */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-md">
            {effectiveResourceUrl ? (
              isPresentation ? (
                <SlideDeckViewer
                  url={effectiveResourceUrl}
                  fileName={lesson?.fileName}
                  title={title}
                  className="rounded-none border-0"
                />
              ) : isVideo ? (
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
              <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-subtle-foreground">
                {isPresentation ? <Presentation className="h-10 w-10 text-secondary-foreground" /> : <PlayCircle className="h-10 w-10 text-secondary-foreground" />}
                <p className="text-xs">
                  {isPresentation
                    ? 'No slide deck or presentation configured for this lecture.'
                    : 'No media stream URL configured for this lecture.'}
                </p>
              </div>
            )}
          </div>

          {/* Lecture Notes below player */}
          {content && (
            <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                Lecture Notes & Detailed Study Material
              </h3>
              <div className="text-[15px] sm:text-base leading-relaxed text-foreground prose dark:prose-invert prose-base max-w-none">
                <RichContent html={content} className="text-[15px] sm:text-base leading-relaxed text-foreground" />
              </div>
            </div>
          )}
        </>
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
                ? 'border-success/30 bg-success-soft/60'
                : isQuizUnlocked
                  ? 'border-primary/30 bg-gradient-to-r from-primary-soft/80 via-card to-accent-soft/80 ring-1 ring-ring/20'
                  : 'border-border bg-muted/70'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    isQuizPassed
                      ? 'border-success/30 bg-success-soft text-success'
                      : isQuizUnlocked
                        ? 'border-primary/30 bg-primary-soft text-primary shadow-2xs'
                        : 'border-border bg-secondary text-subtle-foreground'
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
                    <h4 className="text-sm font-bold text-foreground">{assessment.titleEn}</h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isQuizPassed
                          ? 'bg-success-soft text-success border-success/30'
                          : isQuizUnlocked
                            ? 'bg-primary-soft text-primary border-primary/30'
                            : 'bg-border text-secondary-foreground border-input'
                      }`}
                    >
                      {isQuizPassed
                        ? 'Assessment Passed'
                        : isQuizUnlocked
                          ? 'Assessment Ready'
                          : 'Assessment Locked'}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
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
                      ? 'border-success/30 bg-card text-success hover:bg-success-soft'
                      : isQuizUnlocked
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        : 'bg-border text-subtle-foreground'
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
