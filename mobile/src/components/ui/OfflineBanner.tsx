import { WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { palette } from '@/core/theme/colors';

import { AppText } from './AppText';

/** Thin banner shown on every <Screen> while the device is offline. */
export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useIsOnline();
  if (online) return null;

  return (
    <View accessibilityRole="alert" className="flex-row items-center gap-2 bg-amber-500 px-4 py-2">
      <WifiOff size={16} color={palette.white} />
      <AppText className="flex-1 text-sm font-medium text-white">{t('common.offline')}</AppText>
    </View>
  );
}
