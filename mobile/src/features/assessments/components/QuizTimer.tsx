import { Timer } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { palette } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';
import { formatClock } from '@/core/utils/formatters';

/**
 * Countdown computed from an absolute deadline, so it stays correct across backgrounding.
 * Calls `onExpire` exactly once.
 */
export function QuizTimer({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, (deadline - Date.now()) / 1000));
  const fired = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const tick = () => {
      const seconds = Math.max(0, (deadline - Date.now()) / 1000);
      setLeft(seconds);
      if (seconds <= 0 && !fired.current) {
        fired.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [deadline]);

  const urgent = left <= 60;
  return (
    <View
      accessibilityRole="timer"
      className={cn(
        'flex-row items-center gap-1.5 rounded-full px-3 py-1.5',
        urgent ? 'bg-red-600' : 'bg-brand-600',
      )}
    >
      <Timer size={16} color={palette.white} />
      <AppText className="text-sm font-bold text-white">{formatClock(left)}</AppText>
    </View>
  );
}
