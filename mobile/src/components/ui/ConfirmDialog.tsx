import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { AlertTriangle } from 'lucide-react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { useAppTheme } from '@/core/theme/theme-store';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

export interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  icon?: LucideIcon;
  loading?: boolean;
  children?: ReactNode;
}

/**
 * Centered, theme-adaptive confirmation dialog with prominent icon badges,
 * message formatting, and danger/primary actions.
 */
export function ConfirmDialog({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon: Icon = AlertTriangle,
  loading = false,
  children,
}: ConfirmDialogProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const colors = useThemeColors();

  const iconBg =
    variant === 'danger'
      ? isDark
        ? 'rgba(239, 68, 68, 0.18)'
        : 'rgba(220, 38, 38, 0.1)'
      : variant === 'warning'
        ? isDark
          ? 'rgba(245, 158, 11, 0.18)'
          : 'rgba(217, 119, 6, 0.1)'
        : isDark
          ? 'rgba(99, 102, 241, 0.18)'
          : 'rgba(79, 70, 229, 0.1)';

  const iconColor =
    variant === 'danger'
      ? colors.danger
      : variant === 'warning'
        ? colors.warning
        : colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className={cn('flex-1', isDark && 'dark')}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center p-5"
        >
          <Pressable
            accessibilityLabel="Close"
            onPress={onClose}
            className="absolute inset-0 bg-black/65"
          />
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl z-10"
          >
            {Icon ? (
              <View
                style={{ backgroundColor: iconBg }}
                className="mb-4 h-14 w-14 items-center justify-center rounded-2xl self-center"
              >
                <Icon size={26} color={iconColor} />
              </View>
            ) : null}

            <AppText variant="heading" className="text-center text-lg font-bold mb-1.5">
              {title}
            </AppText>

            {message ? (
              <AppText variant="muted" className="text-center text-sm mb-4 leading-5">
                {message}
              </AppText>
            ) : null}

            {children ? <View className="mb-4">{children}</View> : null}

            <View className="gap-2.5 pt-1">
              {onConfirm ? (
                <Button
                  title={confirmText}
                  variant={variant === 'danger' ? 'danger' : 'primary'}
                  onPress={onConfirm}
                  loading={loading}
                  fullWidth
                />
              ) : null}
              <Button
                title={cancelText}
                variant="ghost"
                onPress={onClose}
                disabled={loading}
                fullWidth
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
