import { Image } from 'expo-image';
import { GraduationCap } from 'lucide-react-native';
import { View } from 'react-native';

import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { palette } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

export function CourseThumbnail({ uri, className }: { uri: string | null; className?: string }) {
  const source = resolveMediaUrl(uri);
  return (
    <View className={cn('overflow-hidden bg-brand-600', className)}>
      {source ? (
        <Image
          source={{ uri: source }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-brand-600">
          <GraduationCap size={36} color={palette.brand100} />
        </View>
      )}
    </View>
  );
}
