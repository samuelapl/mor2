import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { DevPanel } from '@/components/dev/DevPanel';
import { LanguageToggle } from '@/components/LanguageToggle';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { AuthHeader, FormMessage, isValidEmail, useFormError, useLogin } from '@/features/auth';

export default function LoginScreen() {
  const { t } = useTranslation();
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
    <Screen edges={['top', 'bottom']} contentClassName="flex-grow justify-center gap-6 p-6">
      <LanguageToggle className="self-end" />

      <AuthHeader title={t('auth.welcome')} subtitle={t('auth.signInSubtitle')} showLogo />

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
          onSubmitEditing={submit}
        />
        <Link href="/forgot-password" asChild>
          <AppText
            accessibilityRole="link"
            className="self-end text-sm font-semibold text-brand-600 dark:text-brand-300"
          >
            {t('auth.forgotPassword')}
          </AppText>
        </Link>
      </View>

      <FormMessage message={formError} />

      <Button title={t('auth.signIn')} onPress={submit} loading={login.isPending} fullWidth />

      <View className="flex-row justify-center gap-1">
        <AppText variant="muted">{t('auth.noAccount')}</AppText>
        <Link href="/register" asChild>
          <AppText
            accessibilityRole="link"
            className="text-sm font-semibold text-brand-600 dark:text-brand-300"
          >
            {t('auth.createAccount')}
          </AppText>
        </Link>
      </View>

      {__DEV__ ? <DevPanel /> : null}
    </Screen>
  );
}
