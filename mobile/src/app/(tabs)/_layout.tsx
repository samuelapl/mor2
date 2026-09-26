import { router, Tabs } from 'expo-router';
import { Bell, BookOpen, Compass, Home, User, Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { useUnreadCount } from '@/features/notifications';

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
      className="mr-4"
    >
      <Bell size={22} color={colors.text} />
      {unread > 0 ? (
        <View className="absolute -right-2 -top-1.5 min-w-[18px] items-center rounded-full bg-red-600 px-1">
          <AppText className="text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </AppText>
        </View>
      ) : null}
    </Pressable>
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
        headerRight: () => <NotificationBell />,
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
