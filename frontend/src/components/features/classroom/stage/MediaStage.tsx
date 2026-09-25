'use client';

import { Headphones, PlayCircle } from 'lucide-react';
import type { Lesson, UploadedResource } from '@/types';
import { RichContent } from '@/components/ui/RichContent';
import { Badge } from '@/components/ui/Badge';
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
}

export function MediaStage({
  title,
  badgeLabel,
  durationMin,
  contentType,
  resourceUrl,
  content,
  lesson,
}: MediaStageProps) {
  const attachments: UploadedResource[] = lesson ? getItemAttachments(lesson) : [];

  const isVideo = contentType === 'VIDEO';
  const isYoutube =
    resourceUrl && (resourceUrl.includes('youtube.com') || resourceUrl.includes('youtu.be'));

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
        {resourceUrl ? (
          isVideo ? (
            isYoutube ? (
              <div className="aspect-video w-full">
                <iframe
                  src={getYoutubeEmbed(resourceUrl)}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={title}
                />
              </div>
            ) : (
              <div className="aspect-video w-full flex items-center justify-center bg-black">
                <video src={resourceUrl} controls className="h-full w-full max-h-[500px]" />
              </div>
            )
          ) : (
            <div className="p-8 flex flex-col items-center justify-center gap-4 bg-slate-900 text-white">
              <Headphones className="h-12 w-12 text-indigo-400" />
              <p className="text-sm font-semibold">{title}</p>
              <audio src={resourceUrl} controls className="w-full max-w-md" />
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
            Lecture Notes & Transcripts
          </h3>
          <div className="text-[15px] sm:text-base leading-relaxed text-slate-800 prose prose-base max-w-none">
            <RichContent
              html={content}
              className="text-[15px] sm:text-base leading-relaxed text-slate-800"
            />
          </div>
        </div>
      )}

      {/* Attached Resources */}
      {attachments.length > 0 && (
        <div className="pt-2">
          <ClassroomAttachments files={attachments} />
        </div>
      )}
    </div>
  );
}
