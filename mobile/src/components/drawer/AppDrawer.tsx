import React, { useEffect, useState } from 'react';
import { router, usePathname } from 'expo-router';
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Compass,
  DownloadCloud,
  Home,
  KeyRound,
  LogOut,
  Pencil,
  Scale,
  Server,
  User,
  Video,
  X,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

import { AppText, Avatar, Badge } from '@/components/ui';
import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { useThemeColors } from '@/core/theme/colors';
import { useAppTheme } from '@/core/theme/theme-store';
import { Alert } from '@/core/utils/alert';
import { cn } from '@/core/utils/cn';
import { useLogout, useSessionStore } from '@/features/auth';
import { useDrawerStore } from './drawer-store';

export function AppDrawer() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { isDark } = useAppTheme();
  const pathname = usePathname();

  const isOpen = useDrawerStore((s) => s.isOpen);
  const closeDrawer = useDrawerStore((s) => s.close);

  const user = useSessionStore((s) => s.user);
  const logout = useLogout();

  const health = useMutation({
    mutationFn: () => api.get<unknown>(endpoints.health, { skipAuth: true }),
  });

  const [isProfileExpanded, setIsProfileExpanded] = useState(true);

  const DRAWER_WIDTH = Math.min(Math.round(width * 0.84), 350);
  const [slideAnim] = useState(() => new Animated.Value(-DRAWER_WIDTH));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (isOpen) {
      slideAnim.setValue(-DRAWER_WIDTH);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, DRAWER_WIDTH, slideAnim, fadeAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeDrawer();
    });
  };

  const navigateTo = (path: string, isPush = false) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeDrawer();
      if (isPush) {
        router.push(path as any);
      } else {
        router.navigate(path as any);
      }
    });
  };

  const confirmLogout = () => {
    Alert.alert(
      t('profile.logoutConfirmTitle', { defaultValue: 'Sign Out' }),
      t('profile.logoutConfirmBody', {
        defaultValue: 'Are you sure you want to sign out from your account?',
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('common.signOut', { defaultValue: 'Sign Out' }),
          style: 'destructive',
          onPress: () => {
            handleClose();
            logout.mutate();
          },
        },
      ],
    );
  };

  if (!isOpen) return null;

  const navItems = [
    {
      key: 'home',
      label: t('tabs.home', { defaultValue: 'Home' }),
      icon: Home,
      route: '/(tabs)',
      isPush: false,
      isActive:
        pathname === '/' ||
        pathname === '/(tabs)' ||
        pathname === '/(tabs)/index' ||
        pathname === '',
    },
    {
      key: 'myCourses',
      label: t('tabs.myCourses', { defaultValue: 'My Courses' }),
      icon: BookOpen,
      route: '/(tabs)/my-courses',
      isPush: false,
      isActive: pathname.includes('my-courses'),
    },
    {
      key: 'catalog',
      label: t('tabs.catalog', { defaultValue: 'Catalogue' }),
      icon: Compass,
      route: '/(tabs)/catalog',
      isPush: false,
      isActive: pathname.includes('catalog'),
    },
    {
      key: 'downloads',
      label: t('screens.downloads', { defaultValue: 'Downloads' }),
      icon: DownloadCloud,
      route: '/downloads',
      isPush: true,
      isActive: pathname.includes('downloads'),
    },
    {
      key: 'sessions',
      label: t('tabs.liveSessions', { defaultValue: 'Sessions' }),
      icon: Video,
      route: '/(tabs)/live-sessions',
      isPush: false,
      isActive: pathname.includes('live-sessions') || pathname.includes('session/'),
    },
    {
      key: 'certificates',
      label: t('screens.certificates', { defaultValue: 'Certificates' }),
      icon: Award,
      route: '/certificates',
      isPush: true,
      isActive: pathname.includes('certificates'),
    },
    {
      key: 'laws',
      label: t('screens.laws', { defaultValue: 'Tax & Customs Laws' }),
      icon: Scale,
      route: '/laws',
      isPush: true,
      isActive: pathname.includes('laws'),
    },
  ];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View className={cn('flex-1 flex-row', isDark && 'dark')}>
        {/* Semi-transparent Dimmed Backdrop */}
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="absolute inset-0 bg-black/60"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
            onPress={handleClose}
            className="flex-1"
          />
        </Animated.View>

        {/* Sliding Drawer Content */}
        <Animated.View
          style={{
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: colors.surface,
          }}
          className="h-full border-r border-slate-200 shadow-2xl dark:border-slate-800"
        >
          {/* Top Brand & Close Bar */}
          <View className="flex-row items-center justify-between border-b border-slate-200/80 px-4 pb-3 dark:border-slate-800">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
              <AppText className="text-xs font-black text-white">MOR</AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
              hitSlop={8}
              onPress={handleClose}
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700"
            >
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="p-4 gap-4"
            className="flex-1"
          >
            {/* User Profile Card */}
            <View className="flex-row items-center gap-3.5 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70 dark:bg-slate-800/50 dark:border-slate-800">
              <Avatar
                uri={user?.avatarUrl}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size={52}
              />
              <View className="flex-1">
                <AppText
                  className="text-base font-bold text-slate-900 dark:text-white"
                  numberOfLines={1}
                >
                  {user ? `${user.firstName} ${user.lastName}` : 'Learner'}
                </AppText>
                <AppText
                  variant="muted"
                  className="text-xs"
                  numberOfLines={1}
                >
                  {user?.email ?? ''}
                </AppText>
                <View className="mt-1 self-start">
                  <Badge
                    label={t('profile.learner', { defaultValue: 'Learner' })}
                    tone="brand"
                  />
                </View>
              </View>
            </View>

            {/* Profile Accordion (Edit Profile & Change Password) */}
            <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
              {/* Accordion Header */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profile settings accordion"
                onPress={() => setIsProfileExpanded((prev) => !prev)}
                className="flex-row items-center justify-between p-3.5 active:bg-slate-50 dark:active:bg-slate-800/80"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/60">
                    <User size={22} color={colors.primary} />
                  </View>
                  <View>
                    <AppText className="text-[17px] font-bold text-slate-900 dark:text-white">
                      {t('tabs.profile', { defaultValue: 'Profile' })}
                    </AppText>
                    <AppText variant="caption" className="text-xs">
                      {t('profile.account', { defaultValue: 'Account & Security' })}
                    </AppText>
                  </View>
                </View>
                <View
                  style={{
                    transform: [{ rotate: isProfileExpanded ? '180deg' : '0deg' }],
                  }}
                >
                  <ChevronDown size={20} color={colors.textMuted} />
                </View>
              </Pressable>

              {/* Accordion Tabs */}
              {isProfileExpanded && (
                <View className="border-t border-slate-100 bg-slate-50/60 p-2 dark:border-slate-800/80 dark:bg-slate-800/40 gap-1">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigateTo('/settings/edit-profile', true)}
                    className="flex-row items-center gap-3.5 rounded-xl px-3.5 py-3 active:bg-white dark:active:bg-slate-800"
                  >
                    <Pencil size={20} color={colors.primary} />
                    <AppText className="flex-1 text-[15px] font-semibold text-slate-800 dark:text-slate-200">
                      {t('screens.editProfile', { defaultValue: 'Edit Profile' })}
                    </AppText>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigateTo('/settings/change-password', true)}
                    className="flex-row items-center gap-3.5 rounded-xl px-3.5 py-3 active:bg-white dark:active:bg-slate-800"
                  >
                    <KeyRound size={20} color={colors.primary} />
                    <AppText className="flex-1 text-[15px] font-semibold text-slate-800 dark:text-slate-200">
                      {t('screens.changePassword', { defaultValue: 'Change Password' })}
                    </AppText>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Navigation Contents List */}
            <View className="gap-1.5 pt-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: item.isActive }}
                    onPress={() => navigateTo(item.route, item.isPush)}
                    className={cn(
                      'flex-row items-center gap-4 rounded-2xl px-4 py-3.5 active:bg-slate-100 dark:active:bg-slate-800',
                      item.isActive && 'bg-brand-50 dark:bg-brand-950/50',
                    )}
                  >
                    <IconComponent
                      size={24}
                      color={item.isActive ? colors.primary : colors.textMuted}
                    />
                    <AppText
                      className={cn(
                        'flex-1 text-[17px]',
                        item.isActive
                          ? 'font-bold text-brand-700 dark:text-brand-300'
                          : 'font-semibold text-slate-800 dark:text-slate-200',
                      )}
                    >
                      {item.label}
                    </AppText>
                    {item.isActive ? (
                      <View className="h-2.5 w-2.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Drawer Footer: Developer Connection Check & Sign Out */}
          <View className="border-t border-slate-200 px-4 pt-3 pb-1 dark:border-slate-800 gap-2">
            {/* Developer Check Backend Connection */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dev.healthCheck', { defaultValue: 'Check Backend Connection' })}
              onPress={() => health.mutate()}
              disabled={health.isPending}
              className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 active:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:active:bg-slate-700/60"
            >
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <Server size={18} color={colors.primary} />
                <AppText className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {health.isPending
                    ? t('common.loading', { defaultValue: 'Checking…' })
                    : t('dev.healthCheck', { defaultValue: 'Check Backend Connection' })}
                </AppText>
              </View>
              {health.isSuccess ? (
                <Badge label={t('dev.healthOk', { defaultValue: 'Connected' })} tone="success" />
              ) : health.isError ? (
                <Badge label={t('dev.healthFail', { defaultValue: 'Failed' })} tone="danger" />
              ) : (
                <ChevronRight size={14} color={colors.textMuted} />
              )}
            </Pressable>

            {/* Sign Out */}
            <Pressable
              accessibilityRole="button"
              onPress={confirmLogout}
              className="flex-row items-center gap-4 rounded-xl px-4 py-3.5 active:bg-red-50 dark:active:bg-red-950/40"
            >
              <LogOut size={24} color={colors.danger} />
              <AppText className="flex-1 text-base font-bold text-red-600 dark:text-red-400">
                {t('common.signOut', { defaultValue: 'Sign Out' })}
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
