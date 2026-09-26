import '@/global.css';
import '@/core/theme/interop';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureApiClient } from '@/core/api/client';
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
  queryClient,
  queryPersister,
} from '@/core/api/query-client';
// Importing i18n initializes i18next before the first render.
import { getCurrentLocale } from '@/core/i18n';
import { useSyncOnReconnect } from '@/core/sync/useSyncOnReconnect';
import { darkColors, lightColors } from '@/core/theme/colors';
import { useWebColorSchemeSync } from '@/core/theme/useWebColorSchemeSync';
import {
  selectIsAuthenticated,
  signOut,
  useSessionStore,
  type SessionPayload,
} from '@/features/auth';
import { useMeetingHeartbeat } from '@/features/live-sessions';
import { registerProgressSync } from '@/features/progress';

void SplashScreen.preventAutoHideAsync();

// Offline handlers for lesson time and playhead must exist before the first queue flush.
registerProgressSync();

configureApiClient({
  getLocale: getCurrentLocale,
  // Refresh returns the full session (spec §2.2) — keep the cached user/permissions current.
  onSessionRefreshed: (payload) => {
    const session = payload as SessionPayload;
    if (session?.user) {
      useSessionStore.getState().setUser(session.user);
    }
  },
  // Refresh token rejected: wipe everything; the Stack.Protected gate returns to Login.
  onSessionExpired: () => {
    void signOut();
  },
});

function useNavigationTheme(): Theme {
  const scheme = useColorScheme();
  return useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const colors = scheme === 'dark' ? darkColors : lightColors;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme]);
}

export default function RootLayout() {
  const { t } = useTranslation();
  const theme = useNavigationTheme();
  const isAuthenticated = useSessionStore(selectIsAuthenticated);

  useWebColorSchemeSync();
  useSyncOnReconnect();
  // Virtual-session attendance keeps beating while the learner is in Zoom/Meet (spec §8.5).
  useMeetingHeartbeat();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: QUERY_CACHE_MAX_AGE,
            buster: QUERY_CACHE_BUSTER,
          }}
        >
          <ThemeProvider value={theme}>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
              <Stack.Protected guard={!isAuthenticated}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack.Protected>

              <Stack.Protected guard={isAuthenticated}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="course/[courseId]/index"
                  options={{ title: t('screens.course') }}
                />
                <Stack.Screen
                  name="course/[courseId]/enroll"
                  options={{ title: t('screens.enroll'), presentation: 'modal' }}
                />
                <Stack.Screen
                  name="course/[courseId]/learn/[lessonId]"
                  options={{ title: t('screens.lesson') }}
                />
                <Stack.Screen
                  name="quiz/[assessmentId]/index"
                  options={{ title: t('screens.quiz'), presentation: 'fullScreenModal' }}
                />
                <Stack.Screen
                  name="quiz/[assessmentId]/result"
                  options={{ title: t('screens.quizResult'), gestureEnabled: false }}
                />
                <Stack.Screen
                  name="session/[sessionId]/index"
                  options={{ title: t('screens.session') }}
                />
                <Stack.Screen
                  name="session/[sessionId]/check-in"
                  options={{ title: t('screens.checkIn'), presentation: 'modal' }}
                />
                <Stack.Screen
                  name="session/[sessionId]/room"
                  options={{ title: t('screens.session'), presentation: 'fullScreenModal' }}
                />
                <Stack.Screen name="venue/[venueId]" options={{ title: t('screens.venue') }} />
                <Stack.Screen
                  name="certificates/index"
                  options={{ title: t('screens.certificates') }}
                />
                <Stack.Screen
                  name="certificates/[certificateId]"
                  options={{ title: t('screens.certificate') }}
                />
                <Stack.Screen
                  name="notifications"
                  options={{ title: t('screens.notifications') }}
                />
                <Stack.Screen
                  name="settings/edit-profile"
                  options={{ title: t('screens.editProfile') }}
                />
                <Stack.Screen
                  name="settings/change-password"
                  options={{ title: t('screens.changePassword') }}
                />
              </Stack.Protected>

              <Stack.Screen name="dev/ui-gallery" options={{ title: t('screens.uiGallery') }} />
            </Stack>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
