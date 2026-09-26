import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Input, Screen } from '@/components/ui';
import {
  authApi,
  AuthHeader,
  FormMessage,
  isValidEmail,
  useAuthFlowStore,
  useFormError,
} from '@/features/auth';

/** Step 1 of 3 (spec §2.5). The backend always answers the same message (anti-enumeration). */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const setResetEmail = useAuthFlowStore((s) => s.setResetEmail);
  const [email, setEmail] = useState(useAuthFlowStore.getState().resetEmail);
  const [touched, setTouched] = useState(false);

  const request = useMutation({
    mutationFn: (value: string) => authApi.forgotPassword(value),
    onSuccess: (_data, value) => {
      setResetEmail(value);
      router.push('/verify-reset-code');
    },
  });
  const formError = useFormError(request.error);
  const emailError = touched && !isValidEmail(email) ? t('auth.errors.invalidEmail') : null;

  const submit = () => {
    setTouched(true);
    if (isValidEmail(email)) request.mutate(email.trim());
  };

  return (
    <Screen contentClassName="gap-5 p-6">
      <AuthHeader title={t('screens.forgotPassword')} subtitle={t('auth.forgotSubtitle')} />
      <Input
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <FormMessage message={formError} />
      <Button title={t('auth.sendCode')} onPress={submit} loading={request.isPending} fullWidth />
    </Screen>
  );
}
