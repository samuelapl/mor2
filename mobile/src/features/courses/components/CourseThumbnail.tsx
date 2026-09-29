import { useState } from 'react';
import { Image, type ImageSource } from 'expo-image';
import { GraduationCap } from 'lucide-react-native';
import { View } from 'react-native';

import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { palette } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

const DEFAULT_COURSE_COVER = require('../../../../assets/images/sample.jpg');

export function CourseThumbnail({ uri, className }: { uri: string | null; className?: string }) {
  const [hasError, setHasError] = useState(false);

  // If uri points to /sample.jpg (seeded default), use the bundled local asset directly
  // so it renders instantly with 0ms latency and 100% reliability, without requiring
  // a network connection to the Next.js dev server on port 3000.
  const isSample = Boolean(
    uri && (uri === '/sample.jpg' || uri === 'sample.jpg' || uri.endsWith('/sample.jpg')),
  );

  let imageSource: ImageSource | number | null = null;
  if (isSample) {
    imageSource = DEFAULT_COURSE_COVER;
  } else if (uri && !hasError) {
    const resolved = resolveMediaUrl(uri);
    imageSource = resolved ? { uri: resolved } : DEFAULT_COURSE_COVER;
  } else {
    // If no URI or if the remote image failed to load, fall back to the bundled cover
    imageSource = DEFAULT_COURSE_COVER;
  }

  return (
    <View className={cn('overflow-hidden bg-brand-600', className)}>
      {imageSource ? (
        <Image
          source={imageSource}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
          onError={() => setHasError(true)}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-brand-600">
          <GraduationCap size={36} color={palette.brand100} />
        </View>
      )}
    </View>
  );
}
