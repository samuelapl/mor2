import { router } from 'expo-router';
import { Hourglass } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';

/** Shown after self-registration and when login says approval is pending (spec §2.4). */
export default function PendingApprovalScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Screen contentClassName="flex-grow justify-center gap-6 p-6">
      <View className="items-center gap-4">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <Hourglass size={40} color={colors.warning} />
        </View>
        <AppText variant="title" className="text-center">
          {t('auth.pendingTitle')}
        </AppText>
        <AppText variant="body" className="text-center">
          {t('auth.pendingBody')}
        </AppText>
      </View>
      <Button title={t('auth.backToLogin')} onPress={() => router.dismissTo('/login')} fullWidth />
    </Screen>
  );
}
