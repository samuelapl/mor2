import { Directory, File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { lastPathSegment } from '@/core/utils/url';

const FLAG_GRANT_READ_URI_PERMISSION = 1;

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(-120) || 'file';
}

/**
 * Downloads a lesson file to the cache (re-used if already there) and opens it in the
 * phone's viewer: Android → ACTION_VIEW intent, iOS → share sheet with Quick Look.
 */
export async function downloadAndOpen(options: {
  url: string;
  fileName: string;
  mimeType?: string;
  /** Presigned URLs must not be host-rewritten (spec §1.8). */
  presigned?: boolean;
}): Promise<void> {
  const source = options.presigned ? options.url : resolveMediaUrl(options.url);
  if (!source) throw new Error('NO_URL');

  const dir = new Directory(Paths.cache, 'lesson-files');
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, safeName(options.fileName));
  const file = target.exists
    ? target
    : await File.downloadFileAsync(source, target, { idempotent: true });
  const mimeType = options.mimeType ?? guessMime(options.fileName);

  if (Platform.OS === 'android') {
    const contentUri = await getContentUriAsync(file.uri);
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION,
        type: mimeType,
      });
      return;
    } catch {
      // No app can open this type — fall back to the share sheet.
    }
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: options.fileName });
  }
}

export function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'mp4':
      return 'video/mp4';
    case 'mp3':
      return 'audio/mpeg';
    default:
      return '*/*';
  }
}

export function fileNameFromUrl(url: string, fallback: string): string {
  return lastPathSegment(url) ?? fallback;
}
