import { Text, type TextProps } from 'react-native';

import { textVariants, type TextVariant } from '@/core/theme/typography';
import { cn } from '@/core/utils/cn';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  className?: string;
}

export function AppText({ variant = 'body', className, ...props }: AppTextProps) {
  return <Text className={cn(textVariants[variant], className)} {...props} />;
}
