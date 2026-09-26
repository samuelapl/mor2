import { router } from 'expo-router';
import { Award, Bell, Camera, KeyRound, LogOut, Pencil } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import { DevPanel } from '@/components/dev/DevPanel';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ListRow } from '@/components/ListRow';
import { AppText, Avatar, Badge, Card, Screen } from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import { palette, useThemeColors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/formatters';
import { useLogout, useSessionStore } from '@/features/auth';
import { useChangeLanguage, useMe, useUploadAvatar } from '@/features/profile';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const user = useSessionStore((s) => s.user);
  const me = useMe();
  const language = useChangeLanguage();
  const avatar = useUploadAvatar();
  const logout = useLogout();

  const confirmLogout = () =>
    Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.signOut'), style: 'destructive', onPress: () => logout.mutate() },
    ]);

  const changePhoto = () =>
    avatar.mutate(undefined, {
      onError: (error) =>
        Alert.alert(
          t('profile.changePhoto'),
          error.message === 'PHOTO_PERMISSION'
            ? t('profile.photoPermission')
            : t('profile.uploadFailed'),
        ),
    });

  if (!user) return null;

  return (
    <Screen refreshing={me.isRefetching} onRefresh={() => void me.refetch()}>
      <Card className="items-center gap-3 py-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.changePhoto')}
          onPress={changePhoto}
          disabled={avatar.isPending}
        >
          <Avatar
            uri={user.avatarUrl}
            firstName={user.firstName}
            lastName={user.lastName}
            size={88}
          />
          <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 dark:border-slate-800">
            <Camera size={16} color={palette.white} />
          </View>
        </Pressable>
        <View className="items-center gap-1">
          <AppText variant="heading">
            {user.firstName} {user.lastName}
          </AppText>
          <AppText variant="muted">{user.email}</AppText>
          {user.phone ? <AppText variant="caption">{user.phone}</AppText> : null}
        </View>
        <Badge label={t('profile.learner')} tone="brand" />
        <AppText variant="caption">
          {t('profile.memberSince', { date: formatDate(user.createdAt, locale) })}
        </AppText>
      </Card>

      <Card className="gap-3">
        <AppText variant="label">{t('profile.language')}</AppText>
        <LanguageToggle onChange={language.change} disabled={language.isPending} />
      </Card>

      <View>
        <AppText variant="label" className="mb-2 px-1">
          {t('profile.account')}
        </AppText>
        <Card className="overflow-hidden p-0">
          <ListRow
            label={t('screens.editProfile')}
            icon={<Pencil size={20} color={colors.primary} />}
            onPress={() => router.push('/settings/edit-profile')}
          />
          <ListRow
            label={t('screens.changePassword')}
            icon={<KeyRound size={20} color={colors.primary} />}
            onPress={() => router.push('/settings/change-password')}
          />
        </Card>
      </View>

      <View>
        <AppText variant="label" className="mb-2 px-1">
          {t('profile.learning')}
        </AppText>
        <Card className="overflow-hidden p-0">
          <ListRow
            label={t('screens.certificates')}
            icon={<Award size={20} color={colors.primary} />}
            onPress={() => router.push('/certificates')}
          />
          <ListRow
            label={t('screens.notifications')}
            icon={<Bell size={20} color={colors.primary} />}
            onPress={() => router.push('/notifications')}
          />
        </Card>
      </View>

      <Card className="overflow-hidden p-0">
        <ListRow
          label={t('common.signOut')}
          icon={<LogOut size={20} color={colors.danger} />}
          onPress={confirmLogout}
          destructive
        />
      </Card>

      {__DEV__ ? <DevPanel /> : null}
    </Screen>
  );
}
