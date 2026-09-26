import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, OtpInput, Screen } from '@/components/ui';
import {
  authApi,
  AuthHeader,
  FormMessage,
  isSixDigitCode,
  useAuthFlowStore,
  useFormError,
} from '@/features/auth';

/** Step 2 of 3 (spec §2.5). */
export default function VerifyResetCodeScreen() {
  const { t } = useTranslation();
  const email = useAuthFlowStore((s) => s.resetEmail);
  const setResetCode = useAuthFlowStore((s) => s.setResetCode);
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);

  const verify = useMutation({
    mutationFn: (value: string) => authApi.verifyResetCode(email, value),
    onSuccess: (_data, value) => {
      setResetCode(value);
      router.push('/reset-password');
    },
  });
  const resend = useMutation({ mutationFn: () => authApi.forgotPassword(email) });
  const formError = useFormError(verify.error ?? resend.error);

  if (!email) return <Redirect href="/forgot-password" />;

  const submit = () => {
    setTouched(true);
    if (isSixDigitCode(code)) verify.mutate(code);
  };

  return (
    <Screen contentClassName="gap-5 p-6">
      <AuthHeader title={t('screens.verifyResetCode')} subtitle={t('auth.codeSentTo', { email })} />
      <OtpInput
        value={code}
        onChange={setCode}
        error={touched && !isSixDigitCode(code) ? t('auth.errors.codeInvalid') : null}
      />
      <FormMessage message={formError} />
      <FormMessage message={resend.isSuccess ? t('auth.codeResent') : null} tone="success" />
      <Button title={t('auth.verify')} onPress={submit} loading={verify.isPending} fullWidth />
      <Button
        title={t('auth.resendCode')}
        variant="ghost"
        onPress={() => resend.mutate()}
        loading={resend.isPending}
      />
    </Screen>
  );
}
