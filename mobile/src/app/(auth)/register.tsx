import { useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { FileText, Lock, Mail, Phone, User } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { LanguageToggle } from '@/components/LanguageToggle';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
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
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const tinRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

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
    <Screen contentClassName="flex-grow p-6">
      <View className="w-full max-w-md gap-6 self-center">
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
              returnKeyType="next"
              leftIcon={<User size={18} color={colors.textMuted} />}
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
            <Input
              ref={lastNameRef}
              containerClassName="flex-1"
              label={t('auth.lastName')}
              value={values.lastName}
              onChangeText={set('lastName')}
              error={shown('lastName')}
              autoComplete="family-name"
              returnKeyType="next"
              leftIcon={<User size={18} color={colors.textMuted} />}
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>
          <Input
            ref={emailRef}
            label={t('auth.email')}
            value={values.email}
            onChangeText={set('email')}
            error={shown('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            leftIcon={<Mail size={18} color={colors.textMuted} />}
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <Input
            ref={phoneRef}
            label={t('auth.phone')}
            value={values.phone}
            onChangeText={set('phone')}
            error={shown('phone')}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="+251 9…"
            returnKeyType="next"
            leftIcon={<Phone size={18} color={colors.textMuted} />}
            onSubmitEditing={() => tinRef.current?.focus()}
          />
          <Input
            ref={tinRef}
            label={`${t('auth.tin')} (${t('common.optional')})`}
            value={values.tin}
            onChangeText={set('tin')}
            keyboardType="number-pad"
            returnKeyType="next"
            leftIcon={<FileText size={18} color={colors.textMuted} />}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Input
            ref={passwordRef}
            label={t('auth.password')}
            value={values.password}
            onChangeText={set('password')}
            error={shown('password')}
            hint={t('auth.passwordHint')}
            password
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            leftIcon={<Lock size={18} color={colors.textMuted} />}
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <Input
            ref={confirmRef}
            label={t('auth.confirmPassword')}
            value={values.confirm}
            onChangeText={set('confirm')}
            error={shown('confirm')}
            password
            autoComplete="new-password"
            returnKeyType="go"
            leftIcon={<Lock size={18} color={colors.textMuted} />}
            onSubmitEditing={submit}
          />
          <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-700/80 dark:bg-slate-800">
            <View className="mr-3 flex-1">
              <AppText variant="label">{t('auth.preferredLanguage')}</AppText>
            </View>
            <LanguageToggle />
          </View>
        </View>

        <FormMessage message={formError} />

        <Button
          title={t('auth.createAccount')}
          onPress={submit}
          loading={register.isPending}
          size="lg"
          fullWidth
        />

        <View className="flex-row items-center justify-center gap-1.5 pb-6 pt-1">
          <AppText variant="muted">{t('auth.haveAccount')}</AppText>
          <Link href="/login" dismissTo asChild>
            <AppText
              accessibilityRole="link"
              className="text-sm font-bold text-brand-600 dark:text-brand-400"
            >
              {t('auth.signIn')}
            </AppText>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
