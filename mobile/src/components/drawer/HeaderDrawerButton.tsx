import { Menu } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { useThemeColors } from '@/core/theme/colors';
import { useDrawerStore } from './drawer-store';

export function HeaderDrawerButton() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const open = useDrawerStore((s) => s.open);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.menu', { defaultValue: 'Open navigation drawer' })}
      hitSlop={10}
      onPress={open}
      className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-slate-200/80 active:bg-slate-300 dark:bg-slate-800 dark:active:bg-slate-700"
    >
      <Menu size={20} color={colors.text} />
    </Pressable>
  );
}

