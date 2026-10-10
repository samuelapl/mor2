import { useMutation } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
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
  useVerifyEmail,
} from '@/features/auth';

/** After registering (or signing in unverified): enter the emailed code to activate. */
export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const email = useAuthFlowStore((s) => s.verifyEmail);
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);

  // On success acceptSession signs the user in and the root layout leaves the auth stack.
  const verify = useVerifyEmail();
  const resend = useMutation({ mutationFn: () => authApi.resendVerification(email) });
  const formError = useFormError(verify.error ?? resend.error);

  if (!email) return <Redirect href="/login" />;

  const submit = () => {
    setTouched(true);
    if (isSixDigitCode(code)) verify.mutate({ email, code });
  };

  return (
    <Screen contentClassName="gap-5 p-6">
      <AuthHeader
        title={t('screens.verifyEmail')}
        subtitle={`${t('auth.codeSentTo', { email })} ${t('auth.verifyEmailHint')}`}
      />
      <OtpInput
        value={code}
        onChange={setCode}
        error={touched && !isSixDigitCode(code) ? t('auth.errors.codeInvalid') : null}
      />
      <FormMessage message={formError} />
      <FormMessage message={resend.isSuccess ? t('auth.codeResent') : null} tone="success" />
      <Button
        title={t('auth.verifyAndSignIn')}
        onPress={submit}
        loading={verify.isPending}
        fullWidth
      />
      <Button
        title={t('auth.resendCode')}
        variant="ghost"
        onPress={() => resend.mutate()}
        loading={resend.isPending}
      />
    </Screen>
  );
}
