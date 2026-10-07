import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Check, FolderOpen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Badge, ModalSheet } from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

import type { LawCategory } from '../types/laws.types';

export interface LawCategorySheetProps {
  visible: boolean;
  onClose: () => void;
  categories: LawCategory[];
  selectedCategoryId?: string;
  onSelectCategory: (category: LawCategory | null) => void;
}

export function LawCategorySheet({
  visible,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
}: LawCategorySheetProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={t('laws.selectCategory', { defaultValue: 'Select Category' })}
      icon={FolderOpen}
      iconColor={colors.primary}
      showCloseButton
    >
      <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
        <View className="gap-1 py-1">
          {/* All Categories Option */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onSelectCategory(null);
              onClose();
            }}
            className={cn(
              'flex-row items-center justify-between rounded-xl p-3',
              !selectedCategoryId
                ? 'bg-brand-50 dark:bg-brand-950/40'
                : 'active:bg-slate-100 dark:active:bg-slate-800',
            )}
          >
            <View className="flex-row items-center gap-2.5">
              <FolderOpen
                size={18}
                color={!selectedCategoryId ? colors.primary : colors.textMuted}
              />
              <AppText
                className={cn(
                  'font-medium',
                  !selectedCategoryId
                    ? 'font-bold text-brand-700 dark:text-brand-300'
                    : 'text-slate-800 dark:text-slate-100',
                )}
              >
                {t('laws.allCategories', { defaultValue: 'All Categories' })}
              </AppText>
            </View>
            {!selectedCategoryId && <Check size={18} color={colors.primary} />}
          </Pressable>

          {/* Individual Categories */}
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const categoryName =
              locale === 'am' ? cat.nameAm || cat.nameEn : cat.nameEn || cat.nameAm;
            const docCount = cat._count?.documents ?? 0;

            return (
              <Pressable
                key={cat.id}
                accessibilityRole="button"
                onPress={() => {
                  onSelectCategory(cat);
                  onClose();
                }}
                className={cn(
                  'flex-row items-center justify-between rounded-xl p-3',
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-950/40'
                    : 'active:bg-slate-100 dark:active:bg-slate-800',
                )}
              >
                <View className="flex-1 pr-3">
                  <AppText
                    className={cn(
                      'font-medium',
                      isSelected
                        ? 'font-bold text-brand-700 dark:text-brand-300'
                        : 'text-slate-800 dark:text-slate-100',
                    )}
                    numberOfLines={2}
                  >
                    {categoryName}
                  </AppText>
                </View>

                <View className="flex-row items-center gap-2">
                  <Badge label={`${docCount}`} tone="neutral" />
                  {isSelected && <Check size={18} color={colors.primary} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ModalSheet>
  );
}
