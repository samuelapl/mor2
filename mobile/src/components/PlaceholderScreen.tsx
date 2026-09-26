import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { ChevronRight, Construction } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';

export interface PlaceholderLink {
  label: string;
  href: Href;
}

export interface PlaceholderScreenProps {
  title: string;
  /** Implementation phase from LEARNER_MOBILE_IMPLEMENTATION_PHASES.md. */
  phase: 2 | 3 | 4;
  /** API spec sections this screen will use. */
  spec?: string;
  links?: PlaceholderLink[];
  children?: ReactNode;
}

/**
 * Phase 1 stand-in for every route. Shows the route params and links to child routes
 * so the whole navigation tree can be exercised before features exist.
 */
export function PlaceholderScreen({
  title,
  phase,
  spec,
  links = [],
  children,
}: PlaceholderScreenProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const paramEntries = Object.entries(params);

  return (
    <Screen>
      <Card className="items-center gap-2 py-8">
        <Construction size={36} color={colors.primary} />
        <AppText variant="title" className="text-center">
          {title}
        </AppText>
        <AppText variant="muted">{t('common.comingSoon', { phase })}</AppText>
        {spec ? <AppText variant="caption">API spec {spec}</AppText> : null}
      </Card>

      {paramEntries.length > 0 ? (
        <Card className="gap-1">
          <AppText variant="label">Route params</AppText>
          {paramEntries.map(([key, value]) => (
            <AppText key={key} variant="caption" selectable>
              {key}: {String(value)}
            </AppText>
          ))}
        </Card>
      ) : null}

      {links.length > 0 ? (
        <Card className="gap-1 p-2">
          {links.map((link) => (
            <Link key={link.label} href={link.href} asChild>
              <Pressable
                accessibilityRole="link"
                className="flex-row items-center justify-between rounded-xl px-3 py-3 active:bg-slate-100 dark:active:bg-slate-700"
              >
                <AppText>{link.label}</AppText>
                <ChevronRight size={18} color={colors.textMuted} />
              </Pressable>
            </Link>
          ))}
        </Card>
      ) : null}

      {children}
    </Screen>
  );
}
