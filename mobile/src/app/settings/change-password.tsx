import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/core/utils/alert';
import { Button, Input, Screen } from '@/components/ui';
import { changePasswordSchema, FormMessage, useFormError } from '@/features/auth';
import { useChangePassword } from '@/features/profile';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const change = useChangePassword();
  const formError = useFormError(change.error);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  const validation = changePasswordSchema.safeParse({ current, next, confirm });
  const fieldErrors = !validation.success ? validation.error.flatten().fieldErrors : {};
  const currentError = touched && fieldErrors.current?.[0] ? t(fieldErrors.current[0]) : null;
  const nextError = touched && fieldErrors.next?.[0] ? t(fieldErrors.next[0]) : null;
  const confirmError = touched && fieldErrors.confirm?.[0] ? t(fieldErrors.confirm[0]) : null;

  const submit = () => {
    setTouched(true);
    const result = changePasswordSchema.safeParse({ current, next, confirm });
    if (!result.success) return;
    change.mutate(
      { currentPassword: result.data.current, newPassword: result.data.next },
      {
        onSuccess: () =>
          Alert.alert(t('screens.changePassword'), t('profile.passwordChanged'), [
            { text: t('common.ok'), onPress: () => router.back() },
          ]),
      },
    );
  };

  return (
    <Screen contentClassName="gap-4 p-6">
      <Input
        label={t('profile.currentPassword')}
        value={current}
        onChangeText={setCurrent}
        error={currentError}
        password
        autoComplete="current-password"
      />
      <Input
        label={t('auth.newPassword')}
        value={next}
        onChangeText={setNext}
        error={nextError}
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
        title={t('screens.changePassword')}
        onPress={submit}
        loading={change.isPending}
        fullWidth
      />
    </Screen>
  );
}
