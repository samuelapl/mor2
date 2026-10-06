import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { LessonBody } from '@/features/classroom/components/LessonBody';
import { toSafeHtml } from '@/features/classroom/utils/rich-content';

import type { ApiCourseLesson, ApiCourseModule } from '../types/course.types';

/** Shared pieces of the Course and Module overview screens (mirrors the web classroom stages). */

export function hasRichText(value: string | null | undefined): boolean {
  return (
    toSafeHtml(value)
      .replace(/<[^>]*>/g, '')
      .trim().length > 0
  );
}

/** Strips a leading "Module 3:" so headings don't repeat the number. */
export function cleanModuleTitle(title: string): string {
  return title.replace(/^Module\s+\d+[\s:.-]*/i, '').trim();
}

const lessonMinutes = (lesson: ApiCourseLesson): number =>
  (lesson.durationMinutes ?? 0) +
  (lesson.subLessons ?? []).reduce((sum, sub) => sum + (sub.durationMinutes ?? 0), 0);

export function moduleMinutes(module: ApiCourseModule): number {
  return module.durationMinutes ?? module.lessons.reduce((sum, l) => sum + lessonMinutes(l), 0);
}

export function moduleTopicCount(module: ApiCourseModule): number {
  return module.lessons.reduce((sum, l) => sum + (l.subLessons?.length ?? 0), 0);
}

export function OverviewHero({
  eyebrow,
  badges,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  badges?: ReactNode;
  title: string;
  subtitle?: string | null;
  children?: ReactNode;
}) {
  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap items-center gap-2">
        <View className="rounded-full bg-brand-600 px-3 py-1">
          <AppText className="text-[11px] font-bold uppercase tracking-wider text-white">
            {eyebrow}
          </AppText>
        </View>
        {badges}
      </View>
      <View className="gap-1.5">
        <AppText className="text-[26px] font-extrabold leading-8 text-slate-900 dark:text-white">
          {title}
        </AppText>
        {subtitle ? (
          <AppText className="text-sm leading-5 text-slate-500 dark:text-slate-400">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-2.5">{children}</View>;
}

export function StatTile({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View className="min-w-[46%] flex-1 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60">
      <View
        style={{ backgroundColor: `${color}1a` }}
        className="h-9 w-9 items-center justify-center rounded-xl"
      >
        <Icon size={18} color={color} />
      </View>
      <View className="flex-1">
        <AppText className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </AppText>
        <AppText className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
          {value}
        </AppText>
      </View>
    </View>
  );
}

export function OverviewSection({
  icon: Icon,
  title,
  intro,
  html,
  accent = false,
}: {
  icon: LucideIcon;
  title: string;
  intro?: string;
  html: string;
  accent?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-2">
        <Icon size={16} color={colors.primary} />
        <AppText className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          {title}
        </AppText>
      </View>
      {intro ? (
        <AppText className="text-[13px] leading-5 text-slate-500 dark:text-slate-400">
          {intro}
        </AppText>
      ) : null}
      <View className={accent ? 'border-l-2 border-brand-500 pl-3.5' : undefined}>
        <LessonBody content={html} />
      </View>
    </View>
  );
}
