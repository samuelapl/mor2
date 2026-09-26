import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/core/utils/alert';
import { Button, Input, Screen } from '@/components/ui';
import { FormMessage, passwordIssueKey, useFormError } from '@/features/auth';
import { useChangePassword } from '@/features/profile';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const change = useChangePassword();
  const formError = useFormError(change.error);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  const nextKey = passwordIssueKey(next);
  const mismatch = confirm !== next;

  const submit = () => {
    setTouched(true);
    if (!current || nextKey || mismatch) return;
    change.mutate(
      { currentPassword: current, newPassword: next },
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
        error={touched && !current ? t('common.required') : null}
        password
        autoComplete="current-password"
      />
      <Input
        label={t('auth.newPassword')}
        value={next}
        onChangeText={setNext}
        error={touched && nextKey ? t(nextKey) : null}
        hint={t('auth.passwordHint')}
        password
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Input
        label={t('auth.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        error={touched && mismatch ? t('auth.errors.passwordMismatch') : null}
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
