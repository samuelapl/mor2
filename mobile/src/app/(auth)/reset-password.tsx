import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/core/utils/alert';
import { Button, Input, Screen } from '@/components/ui';
import {
  authApi,
  AuthHeader,
  FormMessage,
  resetPasswordSchema,
  useAuthFlowStore,
  useFormError,
} from '@/features/auth';

/** Step 3 of 3 (spec §2.5). Does not sign in — returns to Login. */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { resetEmail: email, resetCode: code, reset } = useAuthFlowStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  const resetPassword = useMutation({
    mutationFn: () => authApi.resetPassword({ email, code, newPassword: password }),
    onSuccess: () => {
      reset();
      Alert.alert(t('screens.resetPassword'), t('auth.resetSuccess'), [
        { text: t('common.ok'), onPress: () => router.dismissTo('/login') },
      ]);
    },
  });
  const formError = useFormError(resetPassword.error);

  if (!email || !code) return <Redirect href="/forgot-password" />;

  const validation = resetPasswordSchema.safeParse({ password, confirm });
  const fieldErrors = !validation.success ? validation.error.flatten().fieldErrors : {};
  const passwordError = touched && fieldErrors.password?.[0] ? t(fieldErrors.password[0]) : null;
  const confirmError = touched && fieldErrors.confirm?.[0] ? t(fieldErrors.confirm[0]) : null;

  const submit = () => {
    setTouched(true);
    const result = resetPasswordSchema.safeParse({ password, confirm });
    if (result.success) resetPassword.mutate();
  };

  return (
    <Screen contentClassName="gap-5 p-6">
      <AuthHeader
        title={t('screens.resetPassword')}
        subtitle={t('auth.resetSubtitle', { email })}
      />
      <Input
        label={t('auth.newPassword')}
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        hint={t('auth.passwordHint')}
        password
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Input
        label={t('auth.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        error={confirmError}
        password
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <FormMessage message={formError} />
      <Button
        title={t('auth.resetPasswordButton')}
        onPress={submit}
        loading={resetPassword.isPending}
        fullWidth
      />
    </Screen>
  );
}
