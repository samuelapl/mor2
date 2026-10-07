import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {
  ChevronDown,
  FolderOpen,
  Scale,
  Search,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Badge,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  Skeleton,
} from '@/components/ui';
import { useDebounce } from '@/core/hooks/useDebounce';
import { useLocaleStore } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { Alert } from '@/core/utils/alert';
import { cn } from '@/core/utils/cn';

import {
  LAW_DOMAINS,
  LAW_INSTRUMENT_TYPES,
  LawCategorySheet,
  LawDocumentCard,
  useLawCategories,
  useLegalDocuments,
  type LawCategory,
  type LawDomain,
  type LawInstrumentType,
  type LegalDocument,
} from '@/features/laws';
import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { downloadAndOpen } from '@/features/classroom/utils/open-file';

export default function LawsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);

  // Filter States
  const [selectedDomain, setSelectedDomain] = useState<LawDomain>('TAX_LAW');
  const [selectedInstrument, setSelectedInstrument] = useState<LawInstrumentType | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<LawCategory | null>(null);
  const [search, setSearch] = useState('');
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 300);

  // Queries
  const categoriesQuery = useLawCategories(
    selectedDomain,
    selectedInstrument === 'ALL' ? undefined : selectedInstrument,
  );

  const documentsQuery = useLegalDocuments({
    domain: selectedDomain,
    instrumentType: selectedInstrument === 'ALL' ? undefined : selectedInstrument,
    categoryId: selectedCategory?.id,
    search: debouncedSearch || undefined,
    limit: 50,
  });

  const categories = categoriesQuery.data ?? [];
  const documents = documentsQuery.data?.data ?? [];

  // Handle Domain Change (resets category)
  const handleDomainChange = (domain: LawDomain) => {
    setSelectedDomain(domain);
    setSelectedCategory(null);
  };

  // Handle Instrument Change (resets category)
  const handleInstrumentChange = (inst: LawInstrumentType | 'ALL') => {
    setSelectedInstrument(inst);
    setSelectedCategory(null);
  };

  // Directly download and open PDF in device's native PDF reader
  const handleOpenDoc = async (doc: LegalDocument) => {
    try {
      if (!doc.pdfUrl) {
        Alert.alert(
          t('common.somethingWrong', { defaultValue: 'Something went wrong' }),
          'Document PDF URL is missing.',
        );
        return;
      }
      setOpeningDocId(doc.id);
      const resolvedUrl = resolveMediaUrl(doc.pdfUrl) || doc.pdfUrl;
      await downloadAndOpen({
        url: resolvedUrl,
        fileName: doc.fileName || `Law_${doc.documentNumber}.pdf`,
        mimeType: 'application/pdf',
      });
    } catch (err: any) {
      try {
        const resolvedUrl = resolveMediaUrl(doc.pdfUrl) || doc.pdfUrl;
        await Linking.openURL(resolvedUrl);
      } catch {
        Alert.alert(
          t('common.somethingWrong', { defaultValue: 'Something went wrong' }),
          err?.message || 'Could not open document.',
        );
      }
    } finally {
      setOpeningDocId(null);
    }
  };

  // Download & Share PDF (IntentLauncher or System Viewer)
  const handleDownloadDoc = async (doc: LegalDocument) => {
    try {
      if (!doc.pdfUrl) return;
      setDownloadingDocId(doc.id);
      const resolvedUrl = resolveMediaUrl(doc.pdfUrl) || doc.pdfUrl;
      await downloadAndOpen({
        url: resolvedUrl,
        fileName: doc.fileName || `Law_${doc.documentNumber}.pdf`,
        mimeType: 'application/pdf',
      });
    } catch (err: any) {
      Alert.alert(
        t('laws.download', { defaultValue: 'Download' }),
        err?.message || 'Could not initiate download.',
      );
    } finally {
      setDownloadingDocId(null);
    }
  };

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategory) {
      return t('laws.allCategories', { defaultValue: 'All Categories' });
    }
    return locale === 'am'
      ? selectedCategory.nameAm || selectedCategory.nameEn
      : selectedCategory.nameEn || selectedCategory.nameAm;
  }, [selectedCategory, locale, t]);

  const listHeader = (
    <View className="gap-3 pb-2">
      {/* 1. Level 1: Domain Segmented Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {LAW_DOMAINS.map((dom) => {
          const active = selectedDomain === dom.key;
          const label = locale === 'am' ? dom.labelAm : dom.labelEn;
          return (
            <Pressable
              key={dom.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => handleDomainChange(dom.key)}
              className={cn(
                'rounded-xl px-3.5 py-2 transition-all',
                active
                  ? 'bg-brand-600 dark:bg-brand-500'
                  : 'bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700',
              )}
            >
              <AppText
                className={cn(
                  'text-xs font-bold',
                  active ? 'text-white' : 'text-slate-600 dark:text-slate-300',
                )}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 2. Search Box */}
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={t('laws.searchPlaceholder', {
          defaultValue: 'Search by title or document number…',
        })}
        leftIcon={<Search size={18} color={colors.textMuted} />}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {/* 3. Level 2: Instrument Type Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-1.5"
      >
        {LAW_INSTRUMENT_TYPES.map((inst) => {
          const active = selectedInstrument === inst.key;
          const label = locale === 'am' ? inst.labelAm : inst.labelEn;
          return (
            <Pressable
              key={inst.key}
              accessibilityRole="button"
              onPress={() => handleInstrumentChange(inst.key)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 border',
                active
                  ? 'bg-slate-900 border-slate-900 dark:bg-slate-100 dark:border-slate-100'
                  : 'bg-slate-100 border-slate-200 dark:bg-slate-800/80 dark:border-slate-700',
              )}
            >
              <AppText
                className={cn(
                  'text-xs font-semibold',
                  active
                    ? 'text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300',
                )}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 4. Level 3: Category Filter Pill */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('laws.selectCategory', { defaultValue: 'Select Category' })}
        onPress={() => setIsCategorySheetOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
      >
        <View className="flex-1 flex-row items-center gap-2 pr-2">
          <FolderOpen size={16} color={colors.primary} />
          <AppText
            className="flex-1 text-xs font-semibold text-slate-800 dark:text-slate-100"
            numberOfLines={1}
          >
            {selectedCategoryLabel}
          </AppText>
        </View>

        <View className="flex-row items-center gap-1.5">
          {Boolean(categories.length) && (
            <Badge label={`${categories.length}`} tone="neutral" />
          )}
          <ChevronDown size={16} color={colors.textMuted} />
        </View>
      </Pressable>
    </View>
  );

  return (
    <Screen
      scroll={false}
      contentClassName="p-0"
      refreshing={documentsQuery.isRefetching}
      onRefresh={() => {
        void categoriesQuery.refetch();
        void documentsQuery.refetch();
      }}
    >
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4"
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <LawDocumentCard
            document={item}
            isOpenLoading={openingDocId === item.id}
            isDownloadLoading={downloadingDocId === item.id}
            onOpen={handleOpenDoc}
            onDownload={handleDownloadDoc}
          />
        )}
        ListEmptyComponent={
          documentsQuery.isPending ? (
            <View className="gap-3 py-4">
              <Skeleton height={140} />
              <Skeleton height={140} />
            </View>
          ) : documentsQuery.isError ? (
            <ErrorState
              error={documentsQuery.error}
              onRetry={() => void documentsQuery.refetch()}
            />
          ) : (
            <EmptyState
              icon={<Scale size={44} color={colors.textMuted} />}
              title={t('laws.noDocuments', { defaultValue: 'No legal documents found' })}
              description={t('laws.noDocumentsHint', {
                defaultValue: 'Try switching the category or adjusting your search.',
              })}
            />
          )
        }
      />

      {/* Category Bottom Sheet Modal */}
      <LawCategorySheet
        visible={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
        categories={categories}
        selectedCategoryId={selectedCategory?.id}
        onSelectCategory={setSelectedCategory}
      />
    </Screen>
  );
}
