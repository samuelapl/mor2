import { Download, FileText } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import { AppText } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { formatFileSize } from '@/core/utils/formatters';

import { downloadAndOpen } from '../utils/open-file';

export interface FileRowProps {
  url: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
}

/** Downloads and opens a lesson file or attachment in the phone's viewer. */
export function FileRow({ url, fileName, mimeType, sizeBytes }: FileRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      await downloadAndOpen({ url, fileName, mimeType });
    } catch {
      Alert.alert(t('classroom.openFailedTitle'), t('classroom.openFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('classroom.openFile')} ${fileName}`}
      onPress={open}
      disabled={busy}
      className="flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700"
    >
      <View className="h-10 w-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900">
        <FileText size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <AppText
          className="text-sm font-medium text-slate-800 dark:text-slate-100"
          numberOfLines={2}
        >
          {fileName}
        </AppText>
        {sizeBytes ? <AppText variant="caption">{formatFileSize(sizeBytes)}</AppText> : null}
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Download size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );
}
