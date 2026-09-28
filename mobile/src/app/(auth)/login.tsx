import { Link } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { DevPanel } from '@/components/dev/DevPanel';
import { LanguageToggle } from '@/components/LanguageToggle';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { AuthHeader, FormMessage, isValidEmail, useFormError, useLogin } from '@/features/auth';

export default function LoginScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const login = useLogin();
  const formError = useFormError(login.error);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const emailError = touched && !isValidEmail(email) ? t('auth.errors.invalidEmail') : null;
  const passwordError = touched && password.length === 0 ? t('common.required') : null;

  const submit = () => {
    setTouched(true);
    if (!isValidEmail(email) || password.length === 0) return;
    login.mutate({ email, password });
  };

  return (
    <Screen edges={['top', 'bottom']} contentClassName="flex-grow justify-between p-6">
      <View className="w-full flex-row justify-end pt-1">
        <LanguageToggle />
      </View>

      <View className="w-full max-w-sm self-center my-auto gap-6">
        <AuthHeader center title={t('auth.welcome')} subtitle={t('auth.signInSubtitle')} showLogo />

        <View className="gap-4">
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            leftIcon={<Mail size={18} color={colors.textMuted} />}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Input
            ref={passwordRef}
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            password
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            leftIcon={<Lock size={18} color={colors.textMuted} />}
            onSubmitEditing={submit}
          />
          <View className="flex-row justify-end">
            <Link href="/forgot-password" asChild>
              <AppText
                accessibilityRole="link"
                className="py-1 text-sm font-semibold text-brand-600 dark:text-brand-400"
              >
                {t('auth.forgotPassword')}
              </AppText>
            </Link>
          </View>
        </View>

        <FormMessage message={formError} />

        <Button
          title={t('auth.signIn')}
          onPress={submit}
          loading={login.isPending}
          size="lg"
          fullWidth
        />

        <View className="flex-row items-center justify-center gap-1.5 pt-1">
          <AppText variant="muted">{t('auth.noAccount')}</AppText>
          <Link href="/register" asChild>
            <AppText
              accessibilityRole="link"
              className="text-sm font-bold text-brand-600 dark:text-brand-400"
            >
              {t('auth.createAccount')}
            </AppText>
          </Link>
        </View>
      </View>

      {__DEV__ ? (
        <View className="w-full max-w-sm self-center pt-2">
          <DevPanel />
        </View>
      ) : null}
    </Screen>
  );
}
