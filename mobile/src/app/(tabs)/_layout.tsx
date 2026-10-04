import { router, Tabs } from 'expo-router';
import { Bell, BookOpen, Compass, DownloadCloud, Home, User, Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { HeaderThemeToggle } from '@/components/ThemeToggle';
import { AppText } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { useUnreadCount } from '@/features/notifications';

/** Header Downloads / Offline Learning button (YouTube-style quick access). */
function DownloadsButton() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('screens.downloads', { defaultValue: 'Offline Learning & Downloads' })}
      hitSlop={10}
      onPress={() => router.push('/downloads')}
      className="p-1"
    >
      <DownloadCloud size={21} color={colors.text} />
    </Pressable>
  );
}

/** Header bell with the unread badge (spec §10.2). */
function NotificationBell() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { data: unread = 0 } = useUnreadCount();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('screens.notifications')}
      hitSlop={10}
      onPress={() => router.push('/notifications')}
      className="p-1"
    >
      <Bell size={22} color={colors.text} />
      {unread > 0 ? (
        <View className="absolute -right-1 -top-0.5 min-w-[18px] items-center rounded-full bg-red-600 px-1">
          <AppText className="text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

function HeaderRight() {
  return (
    <View className="mr-4 flex-row items-center gap-3">
      <DownloadsButton />
      <HeaderThemeToggle />
      <NotificationBell />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="my-courses"
        options={{
          title: t('tabs.myCourses'),
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: t('tabs.catalog'),
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: t('screens.downloads', { defaultValue: 'Downloads' }),
          tabBarIcon: ({ color, size }) => (
            <DownloadCloud color={color} size={size} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="live-sessions"
        options={{
          title: t('tabs.liveSessions'),
          tabBarIcon: ({ color, size }) => <Video color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
