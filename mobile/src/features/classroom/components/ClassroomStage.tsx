import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { palette } from '@/core/theme/colors';

import type { ApiLessonSubLesson } from '../types/lesson.types';
import { fileNameFromUrl } from '../utils/open-file';
import { toYoutubeEmbed } from '../utils/rich-content';
import { AudioStage } from './AudioStage';
import { FileRow } from './FileRow';
import { VideoStage, type MediaStageProps } from './VideoStage';
import { WebContentStage } from './WebContentStage';

export interface ClassroomStageProps extends Omit<MediaStageProps, 'url'> {
  lesson: ApiLessonSubLesson;
  /** Seconds spent in the external browser — counted as study time (architecture §6.5). */
  onExternalTime: (seconds: number) => void;
}

/** Content renderer per LessonContentType (architecture §6.5). */
export function ClassroomStage({ lesson, onExternalTime, ...media }: ClassroomStageProps) {
  const { t } = useTranslation();
  const url = resolveMediaUrl(lesson.resourceUrl);
  if (!url) return null;

  switch (lesson.contentType) {
    case 'VIDEO': {
      const youtube = toYoutubeEmbed(url);
      return youtube ? (
        <WebContentStage url={youtube} aspect="video" />
      ) : (
        <VideoStage url={url} {...media} />
      );
    }
    case 'AUDIO':
      return <AudioStage url={url} {...media} />;
    case 'INTERACTIVE':
    case 'SCORM':
      return <WebContentStage url={url} />;
    case 'EXTERNAL_LINK':
      return (
        <Card className="items-center gap-3 py-6">
          <ExternalLink size={32} color={palette.brand600} />
          <AppText variant="muted" className="text-center" numberOfLines={2}>
            {url}
          </AppText>
          <Button
            title={t('classroom.openLink')}
            onPress={async () => {
              const opened = Date.now();
              await WebBrowser.openBrowserAsync(url);
              // Resolves when the browser is dismissed; the app was backgrounded meanwhile.
              onExternalTime(Math.round((Date.now() - opened) / 1000));
            }}
          />
        </Card>
      );
    case 'DOCUMENT':
    case 'PRESENTATION':
    default:
      return (
        <View className="gap-2">
          <AppText variant="label">{t('classroom.lessonFile')}</AppText>
          <FileRow
            url={lesson.resourceUrl!}
            fileName={fileNameFromUrl(lesson.resourceUrl!, lesson.titleEn)}
          />
        </View>
      );
  }
}
