export type LessonBlockType = 'DOCUMENT' | 'VIDEO' | 'PRESENTATION' | 'AUDIO';

export interface LessonContentBlock {
  id: string;
  type: LessonBlockType;
  title?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  content?: string; // HTML for DOCUMENT block
}

const BLOCK_TAG_START = '<!--eltms-blocks:';
const BLOCK_TAG_END = '-->';

/**
 * Strips out the internal block metadata comment from HTML content.
 */
export function stripBlockMetadata(content?: string | null): string {
  if (!content) return '';
  if (content.startsWith(BLOCK_TAG_START)) {
    const endIdx = content.indexOf(BLOCK_TAG_END);
    if (endIdx !== -1) {
      return content.slice(endIdx + BLOCK_TAG_END.length).trim();
    }
  }
  return content;
}

/**
 * Serializes an array of content blocks into raw string content suitable for backend storage.
 * If raw document HTML is inside any DOCUMENT block, it is preserved cleanly.
 */
export function serializeLessonBlocks(blocks: LessonContentBlock[]): string {
  if (!blocks || blocks.length === 0) return '';
  const metaComment = `${BLOCK_TAG_START}${JSON.stringify(blocks)}${BLOCK_TAG_END}`;
  // Also append the first document block's HTML so legacy parsers still see rich text
  const docBlock = blocks.find((b) => b.type === 'DOCUMENT' && b.content?.trim());
  const fallbackHtml = docBlock ? `\n${docBlock.content}` : '';
  return `${metaComment}${fallbackHtml}`;
}

/**
 * Parses raw lesson content and existing media fields into an ordered array of LessonContentBlock.
 * Seamlessly backwards compatible with legacy lessons that don't have block tags.
 */
export function parseLessonBlocks(lesson: {
  content?: string | null;
  contentType?: string | null;
  resourceUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  videoResourceUrl?: string | null;
  videoFileName?: string | null;
  videoFileSize?: number | null;
  slideResourceUrl?: string | null;
  slideFileName?: string | null;
  slideFileSize?: number | null;
  audioResourceUrl?: string | null;
  audioFileName?: string | null;
  audioFileSize?: number | null;
}): LessonContentBlock[] {
  const rawContent = lesson.content || '';

  // 1. Check if structured blocks comment exists
  if (rawContent.startsWith(BLOCK_TAG_START)) {
    const endIdx = rawContent.indexOf(BLOCK_TAG_END);
    if (endIdx !== -1) {
      try {
        const jsonStr = rawContent.slice(BLOCK_TAG_START.length, endIdx);
        const parsed = JSON.parse(jsonStr) as LessonContentBlock[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse lesson content blocks comment:', e);
      }
    }
  }

  // 2. Backward compatibility fallback: construct blocks from traditional fields
  const blocks: LessonContentBlock[] = [];
  const cType = (lesson.contentType || 'DOCUMENT').toUpperCase();

  // If slide resource is present
  const slideUrl = lesson.slideResourceUrl || (cType === 'PRESENTATION' ? lesson.resourceUrl : null);
  if (slideUrl) {
    const sSize = lesson.slideFileSize ?? (cType === 'PRESENTATION' ? lesson.fileSize : undefined) ?? undefined;
    blocks.push({
      id: `block-slide-${Date.now()}-1`,
      type: 'PRESENTATION',
      title: 'Slide Deck Presentation',
      url: slideUrl,
      fileName: lesson.slideFileName || (cType === 'PRESENTATION' ? lesson.fileName : undefined) || 'Presentation Slides',
      fileSize: sSize ?? undefined,
    });
  }

  // If video resource is present
  const videoUrl = lesson.videoResourceUrl || (cType === 'VIDEO' ? lesson.resourceUrl : null);
  if (videoUrl) {
    const vSize = lesson.videoFileSize ?? (cType === 'VIDEO' ? lesson.fileSize : undefined) ?? undefined;
    blocks.push({
      id: `block-video-${Date.now()}-2`,
      type: 'VIDEO',
      title: 'Video Lecture',
      url: videoUrl,
      fileName: lesson.videoFileName || (cType === 'VIDEO' ? lesson.fileName : undefined) || 'Video Lecture',
      fileSize: vSize ?? undefined,
    });
  }

  // If audio resource is present
  const audioUrl = lesson.audioResourceUrl || (cType === 'AUDIO' ? lesson.resourceUrl : null);
  if (audioUrl) {
    const aSize = lesson.audioFileSize ?? (cType === 'AUDIO' ? lesson.fileSize : undefined) ?? undefined;
    blocks.push({
      id: `block-audio-${Date.now()}-3`,
      type: 'AUDIO',
      title: 'Audio Lecture',
      url: audioUrl,
      fileName: lesson.audioFileName || (cType === 'AUDIO' ? lesson.fileName : undefined) || 'Audio Lecture',
      fileSize: aSize ?? undefined,
    });
  }

  // If document text or HTML exists (or if it's DOCUMENT type and empty)
  const cleanHtml = stripBlockMetadata(rawContent);
  if (cleanHtml.trim() || blocks.length === 0) {
    blocks.push({
      id: `block-doc-${Date.now()}-0`,
      type: 'DOCUMENT',
      title: 'Lecture Notes & Study Material',
      content: cleanHtml,
    });
  }

  return blocks;
}
