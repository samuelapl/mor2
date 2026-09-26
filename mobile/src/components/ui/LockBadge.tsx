import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useThemeColors } from '@/core/theme/colors';

import { AppText } from './AppText';

/** Marks content the server reports as `unlocked: false` (spec §3.2, §6.1). */
export function LockBadge({ showLabel = false }: { showLabel?: boolean }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <View accessibilityLabel={t('common.locked')} className="flex-row items-center gap-1">
      <Lock size={16} color={colors.textMuted} />
      {showLabel ? <AppText variant="caption">{t('common.locked')}</AppText> : null}
    </View>
  );
}
