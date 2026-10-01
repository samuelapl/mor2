'use client';

import { ExternalLink, PlayCircle } from 'lucide-react';

interface VideoEmbedProps {
  url: string;
}

export function VideoEmbed({ url }: VideoEmbedProps) {
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  if (ytMatch) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-xs">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title="Video lecture"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-xs">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          title="Video lecture"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-xs">
        <video src={url} controls className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="flex items-center gap-3">
        <PlayCircle className="h-6 w-6 text-indigo-600" />
        <div>
          <p className="text-xs font-semibold text-slate-800">External Video Stream / Resource</p>
          <p className="text-[11px] text-slate-500 truncate max-w-md">{url}</p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
      >
        Open Video
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

