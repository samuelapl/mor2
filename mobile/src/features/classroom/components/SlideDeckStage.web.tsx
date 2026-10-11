import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';

import { deckKind } from '../utils/lesson-blocks';
import { FileRow } from './FileRow';
import { WebContentStage } from './WebContentStage';

/** Web build of SlideDeckStage: the browser shows PDFs itself; other decks open as a file. */
export function SlideDeckStage({ url, fileName, title }: { url: string; fileName?: string; title?: string }) {
  const resolved = resolveMediaUrl(url) ?? url;
  const kind = deckKind(url, fileName);
  if (kind === 'google') return <WebContentStage url={resolved.replace(/\/(edit|pub)\b.*$/, '/embed')} />;
  if (kind === 'pdf') return <WebContentStage url={resolved} />;
  return <FileRow url={resolved} fileName={fileName || title || 'Slides'} />;
}
