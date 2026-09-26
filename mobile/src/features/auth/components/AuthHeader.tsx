import { GraduationCap } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { palette } from '@/core/theme/colors';

export interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

export function AuthHeader({ title, subtitle, showLogo = false }: AuthHeaderProps) {
  return (
    <View className="gap-2">
      {showLogo ? (
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-brand-600">
          <GraduationCap size={34} color={palette.white} />
        </View>
      ) : null}
      <AppText variant="title">{title}</AppText>
      {subtitle ? <AppText variant="muted">{subtitle}</AppText> : null}
    </View>
  );
}
