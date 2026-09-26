import { useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { LanguageToggle } from '@/components/LanguageToggle';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import {
  authApi,
  AuthHeader,
  FormMessage,
  isValidEmail,
  passwordIssueKey,
  useFormError,
  type RegisterBody,
} from '@/features/auth';

type Field = 'firstName' | 'lastName' | 'email' | 'phone' | 'tin' | 'password' | 'confirm';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const [values, setValues] = useState<Record<Field, string>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    tin: '',
    password: '',
    confirm: '',
  });
  const [touched, setTouched] = useState(false);

  const register = useMutation({
    mutationFn: (body: RegisterBody) => authApi.register(body),
    onSuccess: () => router.replace('/pending-approval'),
  });
  const formError = useFormError(register.error);

  const set = (field: Field) => (text: string) => setValues((v) => ({ ...v, [field]: text }));

  const passwordKey = passwordIssueKey(values.password);
  const errors: Partial<Record<Field, string>> = {
    firstName: values.firstName.trim() ? undefined : t('common.required'),
    lastName: values.lastName.trim() ? undefined : t('common.required'),
    email: isValidEmail(values.email) ? undefined : t('auth.errors.invalidEmail'),
    phone: values.phone.trim() ? undefined : t('common.required'),
    password: passwordKey ? t(passwordKey) : undefined,
    confirm: values.confirm === values.password ? undefined : t('auth.errors.passwordMismatch'),
  };
  const shown = (field: Field) => (touched ? (errors[field] ?? null) : null);

  const submit = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    const tin = values.tin.trim();
    register.mutate({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      password: values.password,
      locale,
      ...(tin ? { tin } : {}),
    });
  };

  return (
    <Screen contentClassName="gap-5 p-6">
      <AuthHeader title={t('auth.createAccount')} subtitle={t('auth.registerSubtitle')} />

      <View className="gap-4">
        <View className="flex-row gap-3">
          <Input
            containerClassName="flex-1"
            label={t('auth.firstName')}
            value={values.firstName}
            onChangeText={set('firstName')}
            error={shown('firstName')}
            autoComplete="given-name"
          />
          <Input
            containerClassName="flex-1"
            label={t('auth.lastName')}
            value={values.lastName}
            onChangeText={set('lastName')}
            error={shown('lastName')}
            autoComplete="family-name"
          />
        </View>
        <Input
          label={t('auth.email')}
          value={values.email}
          onChangeText={set('email')}
          error={shown('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Input
          label={t('auth.phone')}
          value={values.phone}
          onChangeText={set('phone')}
          error={shown('phone')}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="+251 9…"
        />
        <Input
          label={`${t('auth.tin')} (${t('common.optional')})`}
          value={values.tin}
          onChangeText={set('tin')}
          keyboardType="number-pad"
        />
        <Input
          label={t('auth.password')}
          value={values.password}
          onChangeText={set('password')}
          error={shown('password')}
          hint={t('auth.passwordHint')}
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Input
          label={t('auth.confirmPassword')}
          value={values.confirm}
          onChangeText={set('confirm')}
          error={shown('confirm')}
          password
          autoComplete="new-password"
        />
        <View className="gap-2">
          <AppText variant="label">{t('auth.preferredLanguage')}</AppText>
          <LanguageToggle />
        </View>
      </View>

      <FormMessage message={formError} />

      <Button
        title={t('auth.createAccount')}
        onPress={submit}
        loading={register.isPending}
        fullWidth
      />

      <View className="flex-row justify-center gap-1">
        <AppText variant="muted">{t('auth.haveAccount')}</AppText>
        <Link href="/login" dismissTo asChild>
          <AppText
            accessibilityRole="link"
            className="text-sm font-semibold text-brand-600 dark:text-brand-300"
          >
            {t('auth.signIn')}
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}
