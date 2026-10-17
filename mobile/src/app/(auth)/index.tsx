import { Redirect, router } from 'expo-router';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { LanguageToggle } from '@/components/LanguageToggle';
import { selectIsAuthenticated, useSessionStore } from '@/features/auth';

export default function LandingScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useSessionStore(selectIsAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-[#080d1a] justify-between p-6">
      <StatusBar style="light" />

      {/* Top bar with language switcher */}
      <View className="w-full flex-row justify-end pt-1">
        <LanguageToggle />
      </View>

      {/* Hero Section */}
      <View className="my-auto w-full max-w-md items-center self-center px-2">
        {/* Badge */}
        <View className="flex-row items-center gap-2 rounded-full border border-sky-500/30 bg-sky-950/60 px-4 py-1.5 self-center">
          <ShieldCheck size={16} color="#f59e0b" />
          <Text className="text-xs font-semibold text-sky-300">
            {t('landing.badge')}
          </Text>
        </View>

        {/* Headline */}
        <Text className="mt-8 text-center text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          {t('landing.titlePrefix')}
          <Text className="text-sky-400">{t('landing.titleHighlight')}</Text>
          {'\n'}
          {t('landing.titleSuffix').trim()}
        </Text>

        {/* Subtitle */}
        <Text className="mt-5 text-center text-sm sm:text-base leading-relaxed text-slate-300 max-w-sm">
          {t('landing.subtitle')}
        </Text>

        {/* Primary Action Button (Sign In to Platform ->) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('landing.signInToPlatform')}
          onPress={() => router.push('/(auth)/login')}
          className="mt-9 flex-row items-center justify-center gap-2.5 rounded-xl bg-sky-600 active:bg-sky-700 px-7 py-3.5 shadow-lg shadow-sky-600/40"
        >
          <Text className="text-base font-semibold text-white">
            {t('landing.signInToPlatform')}
          </Text>
          <ArrowRight size={18} color="#ffffff" />
        </Pressable>
      </View>

      {/* Footer spacer */}
      <View className="h-6" />
    </SafeAreaView>
  );
}

