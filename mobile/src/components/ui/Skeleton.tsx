import { useEffect, useState } from 'react';
import { Animated, type DimensionValue } from 'react-native';

import { cn } from '@/core/utils/cn';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  className?: string;
}

/** Pulsing placeholder shown while data loads. */
export function Skeleton({ width = '100%', height = 16, className }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, opacity }}
      className={cn('rounded-lg bg-slate-200 dark:bg-slate-700', className)}
    />
  );
}
