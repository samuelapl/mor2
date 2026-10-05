import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { X } from 'lucide-react-native';

import { AppText } from './AppText';
import { useAppTheme } from '@/core/theme/theme-store';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  showCloseButton?: boolean;
  children: ReactNode;
}

/**
 * Bottom sheet built on core Modal with full theme compliance (light/dark mode)
 * and optional icon/header support.
 */
export function ModalSheet({
  visible,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  showCloseButton = false,
  children,
}: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className={cn('flex-1', isDark && 'dark')}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
        >
          <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1 bg-black/60" />
          <View
            style={{
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="max-h-[85%] rounded-t-3xl border-t px-5 pt-3 shadow-2xl"
          >
            <View
              style={{ backgroundColor: isDark ? '#475569' : '#cbd5e1' }}
              className="mb-3 h-1.5 w-12 self-center rounded-full"
            />
            {title || Icon ? (
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-3">
                  {Icon ? (
                    <View
                      style={{
                        backgroundColor: isDark
                          ? 'rgba(99, 102, 241, 0.18)'
                          : 'rgba(79, 70, 229, 0.1)',
                      }}
                      className="h-10 w-10 items-center justify-center rounded-xl"
                    >
                      <Icon size={20} color={iconColor || colors.primary} />
                    </View>
                  ) : null}
                  <View className="flex-1">
                    {title ? (
                      <AppText variant="heading" className="text-lg">
                        {title}
                      </AppText>
                    ) : null}
                    {subtitle ? (
                      <AppText variant="muted" className="text-xs mt-0.5">
                        {subtitle}
                      </AppText>
                    ) : null}
                  </View>
                </View>
                {showCloseButton ? (
                  <Pressable
                    onPress={onClose}
                    className="p-1 rounded-full active:bg-slate-100 dark:active:bg-slate-700"
                    accessibilityLabel="Close"
                  >
                    <X size={20} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
