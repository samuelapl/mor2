/**
 * Lesson content blocks, read the same way as the web (frontend/src/lib/course-draft-blocks.ts).
 * The course studio stores ordered blocks (notes, slide deck, video, audio) as a metadata
 * comment at the start of the lesson's content; older lessons fall back to their single file.
 */

export type LessonBlockType = 'DOCUMENT' | 'VIDEO' | 'PRESENTATION' | 'AUDIO';

export interface LessonContentBlock {
  id: string;
  type: LessonBlockType;
  title?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  /** HTML for a DOCUMENT block. */
  content?: string;
}

const BLOCK_TAG_START = '<!--eltms-blocks:';
const BLOCK_TAG_END = '-->';

/** The structured blocks stored in a lesson's content, or null for a legacy lesson. */
export function storedBlocks(content: string | null | undefined): LessonContentBlock[] | null {
  if (!content?.startsWith(BLOCK_TAG_START)) return null;
  const end = content.indexOf(BLOCK_TAG_END);
  if (end === -1) return null;
  try {
    const parsed = JSON.parse(content.slice(BLOCK_TAG_START.length, end)) as LessonContentBlock[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** Lesson content without the block metadata comment (the HTML legacy readers see). */
export function stripBlockMetadata(content: string | null | undefined): string {
  if (!content) return '';
  if (content.startsWith(BLOCK_TAG_START)) {
    const end = content.indexOf(BLOCK_TAG_END);
    if (end !== -1) return content.slice(end + BLOCK_TAG_END.length).trim();
  }
  return content;
}

/** Replaces the stored blocks, keeping the HTML after the comment unchanged. */
export function withStoredBlocks(content: string, blocks: LessonContentBlock[]): string {
  return `${BLOCK_TAG_START}${JSON.stringify(blocks)}${BLOCK_TAG_END}${content.slice(
    content.indexOf(BLOCK_TAG_END) + BLOCK_TAG_END.length,
  )}`;
}

/**
 * Ordered blocks to show for a lesson: its stored blocks, or for a legacy lesson its single
 * slide deck / video / audio file followed by its notes.
 */
export function lessonBlocks(lesson: {
  content?: string | null;
  contentType?: string | null;
  resourceUrl?: string | null;
}): LessonContentBlock[] {
  const stored = storedBlocks(lesson.content);
  if (stored) return stored;

  const blocks: LessonContentBlock[] = [];
  const type = (lesson.contentType || 'DOCUMENT').toUpperCase();
  if (lesson.resourceUrl && (type === 'PRESENTATION' || type === 'VIDEO' || type === 'AUDIO')) {
    blocks.push({ id: 'legacy-media', type: type as LessonBlockType, url: lesson.resourceUrl });
  } else if (lesson.resourceUrl && type === 'DOCUMENT' && deckKind(lesson.resourceUrl)) {
    // A document lesson whose file is a PDF / PPTX is read in the lesson, like a slide deck.
    blocks.push({ id: 'legacy-document', type: 'PRESENTATION', url: lesson.resourceUrl });
  }
  const html = stripBlockMetadata(lesson.content);
  if (html.trim()) blocks.push({ id: 'legacy-notes', type: 'DOCUMENT', content: html });
  return blocks;
}

/** Files shown inside the lesson (slide decks, block media): not repeated as attachments. */
export function blockFileUrls(blocks: LessonContentBlock[]): string[] {
  return blocks.filter((b) => b.type !== 'DOCUMENT' && b.url).map((b) => b.url!);
}

/** Slide decks the viewer can draw; anything else (e.g. Google Slides) opens externally. */
export function deckKind(url: string, fileName?: string): 'pdf' | 'pptx' | 'google' | null {
  if (url.includes('docs.google.com/presentation')) return 'google';
  const name = `${fileName ?? ''} ${url.split('?')[0]}`.toLowerCase();
  if (/\.pdf\b/.test(name)) return 'pdf';
  if (/\.(pptx|ppsx)\b/.test(name)) return 'pptx';
  return null;
}
