import { Link, router } from 'expo-router';
import { ArrowLeft, Lock, Mail } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';

import { DevPanel } from '@/components/dev/DevPanel';
import { LanguageToggle } from '@/components/LanguageToggle';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { AuthHeader, FormMessage, loginSchema, useFormError, useLogin } from '@/features/auth';

export default function LoginScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const login = useLogin();
  const formError = useFormError(login.error);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const validation = loginSchema.safeParse({ email: email.trim(), password });
  const fieldErrors = !validation.success ? validation.error.flatten().fieldErrors : {};
  const emailError = touched && fieldErrors.email?.[0] ? t(fieldErrors.email[0]) : null;
  const passwordError = touched && fieldErrors.password?.[0] ? t(fieldErrors.password[0]) : null;

  const submit = () => {
    setTouched(true);
    const result = loginSchema.safeParse({ email: email.trim(), password });
    if (!result.success) return;
    login.mutate({ email: result.data.email, password: result.data.password });
  };

  return (
    <Screen edges={['top', 'bottom']} contentClassName="flex-grow justify-between p-6">
      <View className="w-full flex-row items-center justify-between pt-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          className="-ml-1 p-1 rounded-full active:opacity-60"
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <LanguageToggle />
      </View>

      <View className="my-auto w-full max-w-sm gap-6 self-center">
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
