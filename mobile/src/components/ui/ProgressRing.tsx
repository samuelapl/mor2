import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useThemeColors } from '@/core/theme/colors';

import { AppText } from './AppText';

export interface ProgressRingProps {
  /** 0–100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export function ProgressRing({
  percent,
  size = 56,
  strokeWidth = 6,
  showLabel = true,
}: ProgressRingProps) {
  const colors = useThemeColors();
  const value = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const complete = value >= 100;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={{ width: size, height: size }}
      className="items-center justify-center"
    >
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={complete ? colors.success : colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          fill="none"
        />
      </Svg>
      {showLabel ? (
        <AppText className="text-xs font-bold text-slate-800 dark:text-slate-100">
          {Math.round(value)}%
        </AppText>
      ) : null}
    </View>
  );
}
