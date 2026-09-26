/**
 * Text variants used by <AppText>. System fonts render Ethiopic script natively on
 * Android and iOS; custom fonts (Poppins / Noto Sans Ethiopic) can be added in Phase 4.
 */
export const textVariants = {
  display: 'text-3xl font-bold text-slate-900 dark:text-slate-50',
  title: 'text-2xl font-bold text-slate-900 dark:text-slate-50',
  heading: 'text-lg font-semibold text-slate-900 dark:text-slate-50',
  body: 'text-base text-slate-700 dark:text-slate-200',
  label: 'text-sm font-medium text-slate-700 dark:text-slate-200',
  caption: 'text-xs text-slate-500 dark:text-slate-400',
  muted: 'text-sm text-slate-500 dark:text-slate-400',
} as const;

export type TextVariant = keyof typeof textVariants;
