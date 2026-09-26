import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Building, MapPin, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Badge, Card, ErrorState, Screen, Skeleton } from '@/components/ui';
import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { useThemeColors } from '@/core/theme/colors';
import type { ApiVenue } from '@/features/courses';

/** GET /venues/:id — text only; venues have no coordinates (spec §8.9). */
export default function VenueScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const venue = useQuery({
    queryKey: ['venues', venueId],
    queryFn: () => api.get<ApiVenue>(endpoints.venues.detail(venueId)),
  });

  if (venue.isPending) {
    return (
      <Screen>
        <Skeleton height={160} />
      </Screen>
    );
  }
  if (venue.isError || !venue.data) {
    return (
      <Screen>
        <ErrorState error={venue.error} onRetry={() => void venue.refetch()} />
      </Screen>
    );
  }
  const v = venue.data;

  return (
    <Screen>
      <Card className="gap-3">
        <AppText variant="title">{v.name}</AppText>
        {v.building ? (
          <Row icon={<Building size={18} color={colors.primary} />} text={v.building} />
        ) : null}
        <Row icon={<MapPin size={18} color={colors.primary} />} text={v.branch} />
        <Row
          icon={<Users size={18} color={colors.primary} />}
          text={t('sessions.capacity', { count: v.capacity })}
        />
      </Card>
      {v.facilities.length > 0 ? (
        <Card className="gap-3">
          <AppText variant="heading">{t('sessions.facilities')}</AppText>
          <View className="flex-row flex-wrap gap-2">
            {v.facilities.map((f) => (
              <Badge key={f} label={f} tone="brand" />
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <AppText>{text}</AppText>
    </View>
  );
}
