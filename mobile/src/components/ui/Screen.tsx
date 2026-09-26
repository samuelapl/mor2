import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/core/utils/cn';

import { OfflineBanner } from './OfflineBanner';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Safe-area edges to pad. Screens under a native header usually only need the bottom. */
  edges?: Edge[];
  className?: string;
  contentClassName?: string;
}

/** Standard screen container: safe area, background, offline banner, optional pull-to-refresh. */
export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  edges = ['bottom'],
  className,
  contentClassName,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className={cn('flex-1 bg-slate-50 dark:bg-slate-900', className)}>
      <OfflineBanner />
      {scroll ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName={cn('gap-4 p-4', contentClassName)}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View className={cn('flex-1 p-4', contentClassName)}>{children}</View>
      )}
    </SafeAreaView>
  );
}
