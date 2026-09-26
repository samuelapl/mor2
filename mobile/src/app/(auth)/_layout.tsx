import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AuthLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: t('screens.register') }} />
      <Stack.Screen
        name="pending-approval"
        options={{ title: t('screens.pendingApproval'), headerBackVisible: false }}
      />
      <Stack.Screen name="forgot-password" options={{ title: t('screens.forgotPassword') }} />
      <Stack.Screen name="verify-reset-code" options={{ title: t('screens.verifyResetCode') }} />
      <Stack.Screen name="reset-password" options={{ title: t('screens.resetPassword') }} />
      <Stack.Screen name="first-login" options={{ title: t('screens.firstLogin') }} />
    </Stack>
  );
}
