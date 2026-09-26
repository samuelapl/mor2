import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center gap-3 px-6 py-12">
      {icon}
      <AppText variant="heading" className="text-center">
        {title}
      </AppText>
      {description ? (
        <AppText variant="muted" className="text-center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" className="mt-2" />
      ) : null}
    </View>
  );
}
