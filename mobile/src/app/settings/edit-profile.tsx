import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Input, Screen } from '@/components/ui';
import { FormMessage, useFormError, useSessionStore } from '@/features/auth';
import { useUpdateProfile, type UpdateProfileBody } from '@/features/profile';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const update = useUpdateProfile();
  const formError = useFormError(update.error);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [tin, setTin] = useState(user?.tin ?? '');
  const [touched, setTouched] = useState(false);

  const firstError = touched && !firstName.trim() ? t('common.required') : null;
  const lastError = touched && !lastName.trim() ? t('common.required') : null;

  const save = () => {
    setTouched(true);
    if (!firstName.trim() || !lastName.trim()) return;
    // Send only changed fields; the backend rejects unknown ones (spec §1.6).
    const body: UpdateProfileBody = {};
    if (firstName.trim() !== user?.firstName) body.firstName = firstName.trim();
    if (lastName.trim() !== user?.lastName) body.lastName = lastName.trim();
    if (phone.trim() !== (user?.phone ?? '')) body.phone = phone.trim();
    if (tin.trim() !== (user?.tin ?? '')) body.tin = tin.trim();
    if (Object.keys(body).length === 0) {
      router.back();
      return;
    }
    update.mutate(body, { onSuccess: () => router.back() });
  };

  return (
    <Screen contentClassName="gap-4 p-6">
      <View className="flex-row gap-3">
        <Input
          containerClassName="flex-1"
          label={t('auth.firstName')}
          value={firstName}
          onChangeText={setFirstName}
          error={firstError}
          autoComplete="given-name"
        />
        <Input
          containerClassName="flex-1"
          label={t('auth.lastName')}
          value={lastName}
          onChangeText={setLastName}
          error={lastError}
          autoComplete="family-name"
        />
      </View>
      <Input label={t('auth.email')} value={user?.email ?? ''} editable={false} />
      <Input
        label={t('auth.phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <Input
        label={`${t('auth.tin')} (${t('common.optional')})`}
        value={tin}
        onChangeText={setTin}
        keyboardType="number-pad"
      />
      <FormMessage message={formError} />
      <Button title={t('common.save')} onPress={save} loading={update.isPending} fullWidth />
    </Screen>
  );
}
