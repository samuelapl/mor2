import { GraduationCap } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { palette } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

export interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  center?: boolean;
  className?: string;
}

export function AuthHeader({
  title,
  subtitle,
  showLogo = false,
  center = false,
  className,
}: AuthHeaderProps) {
  return (
    <View className={cn('gap-2', center && 'items-center', className)}>
      {showLogo ? (
        <View
          className={cn(
            'h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 shadow-md shadow-brand-500/25',
            center ? 'mb-2 self-center' : 'mb-4',
          )}
        >
          <GraduationCap size={36} color={palette.white} />
        </View>
      ) : null}
      <AppText
        variant="title"
        className={cn('font-bold tracking-tight', center && 'text-center')}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText
          variant="muted"
          className={cn('text-base', center && 'text-center max-w-[320px]')}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
