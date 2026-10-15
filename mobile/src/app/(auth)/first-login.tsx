import { useMutation } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Input, OtpInput, Screen } from '@/components/ui';
import { ApiError } from '@/core/api/errors';
import {
  authApi,
  AuthHeader,
  FormMessage,
  isSixDigitCode,
  resetPasswordSchema,
  useAuthFlowStore,
  useCompleteFirstLogin,
  useFormError,
} from '@/features/auth';

/**
 * Mandatory password setup for admin-created accounts (spec §2.6).
 * On success the session is stored and the router gate switches to the tabs.
 */
export default function FirstLoginScreen() {
  const { t } = useTranslation();
  const { challengeToken, maskedEmail, setChallenge } = useAuthFlowStore();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  const complete = useCompleteFirstLogin();
  const resend = useMutation({
    mutationFn: () => authApi.firstLoginResendCode(challengeToken ?? ''),
    onSuccess: (res) => setChallenge(challengeToken ?? '', res.email),
  });
  const error = complete.error ?? resend.error;
  const formError = useFormError(error);

  if (!challengeToken) return <Redirect href="/login" />;

  // The challenge token is short-lived; a 401 means the user must sign in again.
  const expired = error instanceof ApiError && error.status === 401;

  const validation = resetPasswordSchema.safeParse({ password, confirm });
  const fieldErrors = !validation.success ? validation.error.flatten().fieldErrors : {};
  const passwordError = touched && fieldErrors.password?.[0] ? t(fieldErrors.password[0]) : null;
  const confirmError = touched && fieldErrors.confirm?.[0] ? t(fieldErrors.confirm[0]) : null;
  const codeOk = isSixDigitCode(code);

  const submit = () => {
    setTouched(true);
    const result = resetPasswordSchema.safeParse({ password, confirm });
    if (!codeOk || !result.success) return;
    complete.mutate({ challengeToken, code, newPassword: result.data.password, confirmPassword: result.data.confirm });
  };

  return (
    <Screen contentClassName="gap-5 p-6">
      <AuthHeader
        title={t('screens.firstLogin')}
        subtitle={t('auth.firstLoginSubtitle', { email: maskedEmail })}
      />

      <OtpInput
        value={code}
        onChange={setCode}
        error={touched && !codeOk ? t('auth.errors.codeInvalid') : null}
      />
      <Button
        title={t('auth.resendCode')}
        variant="ghost"
        size="sm"
        className="self-end"
        onPress={() => resend.mutate()}
        loading={resend.isPending}
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

      {expired ? (
        <AppText className="text-sm text-red-700 dark:text-red-300">
          {t('auth.errors.sessionMissing')}
        </AppText>
      ) : (
        <FormMessage message={formError} />
      )}
      <FormMessage message={resend.isSuccess ? t('auth.codeResent') : null} tone="success" />

      <Button
        title={t('auth.setPassword')}
        onPress={submit}
        loading={complete.isPending}
        fullWidth
      />
    </Screen>
  );
}
