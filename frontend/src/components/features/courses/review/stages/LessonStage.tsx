'use client';

import { ChevronRight, Clock, ExternalLink, FileQuestion, FileText, Paperclip, Presentation } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { ApiAssessment } from '@/lib/api/types';
import type { Lesson, UploadedResource } from '@/types';
import { AttachmentCard } from '../../detail/AttachmentCard';
import { getContentTypeBadge } from '../../detail/CourseCurriculumSection';
import { getItemAttachments } from '../../wizard-components';
import type { ReviewNode } from '../types';
import { RichSection, StageCard, StageTitle } from './StageParts';

interface LessonStageProps {
  lesson: Lesson;
  /** e.g. "1.2" for a lesson, "1.2.1" for a sub-lesson. */
  number: string;
  moduleTitle: string;
  moduleId: string;
  /** Set when showing a sub-lesson. */
  parentLesson?: Lesson;
  assessment?: ApiAssessment;
  onSelectNode: (node: ReviewNode) => void;
}

const VIDEO_FILE = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;
const AUDIO_FILE = /\.(mp3|wav|m4a|aac|oga)(\?.*)?$/i;

function youtubeEmbed(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

/** Read-only preview of a lesson's main media, so reviewers see what learners will see. */
function MediaPreview({ url, contentType, files }: { url?: string; contentType?: string; files: UploadedResource[] }) {
  const { tBilingual } = useTranslation();
  const type = (contentType ?? '').toUpperCase();
  const mediaFile =
    type === 'VIDEO'
      ? files.find((f) => f.type?.startsWith('video/') || VIDEO_FILE.test(f.url))
      : type === 'AUDIO'
        ? files.find((f) => f.type?.startsWith('audio/') || AUDIO_FILE.test(f.url))
        : undefined;
  const src = url || mediaFile?.url;
  if (!src) return null;

  const embed = youtubeEmbed(src);
  if (embed) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border border-slate-200 bg-black">
        <iframe src={embed} title="Lesson video" className="h-full w-full" allowFullScreen />
      </div>
    );
  }
  if (type === 'VIDEO' || VIDEO_FILE.test(src)) {
    return <video src={src} controls className="w-full rounded-xl border border-slate-200 bg-black" />;
  }
  if (type === 'AUDIO' || AUDIO_FILE.test(src)) {
    return <audio src={src} controls className="w-full" />;
  }
  if (type === 'PRESENTATION') {
    const isPdf = /\.pdf(\?.*)?$/i.test(src);
    const isGoogle = src.includes('docs.google.com/presentation');
    const isOffice = /\.(ppt|pptx|pps|ppsx|odp)(\?.*)?$/i.test(src);
    const googleEmbed = isGoogle
      ? `${src.split('/edit')[0].split('/pub')[0].split('/preview')[0].replace(/\/+$/, '')}/embed?start=false&loop=false&delayms=3000`
      : null;

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 font-medium">
            <Presentation className="h-4 w-4 text-indigo-400" />
            {tBilingual('Slide Deck Presentation', 'የስላይድ ማቅረቢያ')}
          </span>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-slate-200 hover:text-white"
          >
            <ExternalLink className="h-3 w-3" />
            {tBilingual('Open', 'ክፈት')}
          </a>
        </div>
        {isPdf ? (
          <iframe src={`${src}#toolbar=1`} className="h-96 w-full bg-white" title="Presentation PDF" />
        ) : googleEmbed ? (
          <div className="aspect-video w-full">
            <iframe src={googleEmbed} className="h-full w-full" allowFullScreen title="Google Slides" />
          </div>
        ) : isOffice ? (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`}
            className="h-96 w-full bg-white"
            title="Office Presentation"
          />
        ) : (
          <div className="aspect-video w-full">
            <iframe src={src} className="h-full w-full" allowFullScreen title="Slide Deck" />
          </div>
        )}
      </div>
    );
  }
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
    >
      <ExternalLink className="h-4 w-4 shrink-0" />
      <span className="truncate">{src}</span>
      <span className="ml-auto shrink-0 text-xs">{tBilingual('Open', 'ክፈት')}</span>
    </a>
  );
}

export function LessonStage({ lesson, number, moduleTitle, moduleId, parentLesson, assessment, onSelectNode }: LessonStageProps) {
  const { tBilingual, isAmharic } = useTranslation();
  const files = getItemAttachments(lesson);
  const badge = getContentTypeBadge(lesson.contentType, isAmharic);
  const BadgeIcon = badge.icon;
  const isSub = Boolean(parentLesson);
  const subLessons = lesson.subLessons ?? [];

  return (
    <div className="space-y-6">
      <StageTitle
        icon={<FileText className="h-4 w-4" />}
        eyebrow={`${isSub ? tBilingual('Sub-lesson', 'ንዑስ ትምህርት') : tBilingual('Lesson', 'ትምህርት')} ${number} · ${isSub ? parentLesson!.title : moduleTitle}`}
        title={lesson.title || tBilingual('Untitled lesson', 'ርዕስ የሌለው ትምህርት')}
        meta={
          <>
            <span className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${badge.color}`}>
              <BadgeIcon className="h-3 w-3" />
              {badge.label}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {lesson.durationMin} {tBilingual('min', 'ደቂቃ')}
            </span>
          </>
        }
      />

      <MediaPreview url={lesson.resourceUrl} contentType={lesson.contentType} files={files} />

      <StageCard>
        <RichSection
          label={tBilingual('Lesson content', 'የትምህርት ይዘት')}
          html={lesson.content}
          missing={tBilingual('No written content for this lesson.', 'ለዚህ ትምህርት የተጻፈ ይዘት የለም።')}
        />
      </StageCard>

      {files.length > 0 && (
        <StageCard title={tBilingual(`Lesson files (${files.length})`, `የትምህርት ፋይሎች (${files.length})`)} icon={<Paperclip className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {files.map((file, i) => (
              <AttachmentCard key={file.id || file.url || i} file={file} isAmharic={isAmharic} />
            ))}
          </div>
        </StageCard>
      )}

      {!isSub && subLessons.length > 0 && (
        <StageCard title={tBilingual(`Sub-lessons (${subLessons.length})`, `ንዑስ ትምህርቶች (${subLessons.length})`)}>
          <ul className="divide-y divide-slate-100">
            {subLessons.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelectNode({ type: 'SUB_LESSON', moduleId, lessonId: lesson.id, subLessonId: s.id })}
                  className="flex w-full items-center gap-3 py-2.5 text-left text-sm transition hover:text-indigo-700"
                >
                  <span className="w-10 shrink-0 text-xs font-bold text-slate-400">
                    {number}.{i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{s.durationMin}m</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        </StageCard>
      )}

      {!isSub && assessment && (
        <button
          type="button"
          onClick={() => onSelectNode({ type: 'LESSON_ASSESSMENT', moduleId, lessonId: lesson.id })}
          className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-left transition hover:bg-amber-50"
        >
          <FileQuestion className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{assessment.titleEn}</p>
            <p className="text-xs text-slate-600">
              {assessment.questions.length} {tBilingual('questions', 'ጥያቄዎች')} · {assessment.weight ?? 0}% {tBilingual('weight', 'ክብደት')}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-amber-500" />
        </button>
      )}
    </div>
  );
}
