import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Bottom sheet built on the core Modal — no extra native dependency. */
export function ModalSheet({ visible, onClose, title, children }: ModalSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1 bg-black/40" />
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          className="max-h-[85%] rounded-t-3xl bg-white px-4 pt-3 dark:bg-slate-800"
        >
          <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-slate-300 dark:bg-slate-600" />
          {title ? (
            <AppText variant="heading" className="mb-3">
              {title}
            </AppText>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
