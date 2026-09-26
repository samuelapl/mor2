import { Image } from 'expo-image';
import { View } from 'react-native';

import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { cn } from '@/core/utils/cn';

import { AppText } from './AppText';

export interface AvatarProps {
  uri?: string | null;
  firstName?: string;
  lastName?: string;
  size?: number;
  className?: string;
}

export function Avatar({ uri, firstName = '', lastName = '', size = 48, className }: AvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  const source = resolveMediaUrl(uri);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      style={dimension}
      className={cn(
        'items-center justify-center overflow-hidden bg-brand-100 dark:bg-brand-900',
        className,
      )}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={dimension}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <AppText
          className="font-semibold text-brand-700 dark:text-brand-200"
          style={{ fontSize: size * 0.38 }}
        >
          {initials}
        </AppText>
      )}
    </View>
  );
}
