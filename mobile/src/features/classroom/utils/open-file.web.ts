import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { lastPathSegment } from '@/core/utils/url';

/** Web build of open-file.ts: the browser opens/downloads the file in a new tab. */
export async function downloadAndOpen(options: {
  url: string;
  fileName: string;
  mimeType?: string;
  presigned?: boolean;
}): Promise<void> {
  const source = options.presigned ? options.url : resolveMediaUrl(options.url);
  if (!source) throw new Error('NO_URL');
  window.open(source, '_blank', 'noopener');
}

export function guessMime(): string {
  return '*/*';
}

export function fileNameFromUrl(url: string, fallback: string): string {
  return lastPathSegment(url) ?? fallback;
}
