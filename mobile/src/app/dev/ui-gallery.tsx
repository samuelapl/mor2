import { BookOpen, Star } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LockBadge,
  ModalSheet,
  OtpInput,
  ProgressBar,
  ProgressRing,
  Screen,
  Skeleton,
} from '@/components/ui';
import { ApiError } from '@/core/api/errors';
import { palette, useThemeColors } from '@/core/theme/colors';

/**
 * Dev-only showcase of every design-system primitive (Phase 1 §1.3).
 * Switch the device between light and dark mode to check both themes.
 */
export default function UiGalleryScreen() {
  const colors = useThemeColors();
  const [otp, setOtp] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Screen>
      <Section title="Typography">
        <AppText variant="display">Display</AppText>
        <AppText variant="title">Title</AppText>
        <AppText variant="heading">Heading · የግብር ሕግ መሠረታዊ መርሆዎች</AppText>
        <AppText variant="body">Body text for lesson descriptions and paragraphs.</AppText>
        <AppText variant="label">Label</AppText>
        <AppText variant="muted">Muted helper text</AppText>
        <AppText variant="caption">Caption</AppText>
      </Section>

      <Section title="Buttons">
        <Button title="Primary" icon={<BookOpen size={18} color={palette.white} />} />
        <Button title="Secondary" variant="secondary" />
        <Button title="Outline" variant="outline" />
        <Button title="Ghost" variant="ghost" />
        <Button title="Danger" variant="danger" />
        <Button title="Loading" loading />
        <Button title="Disabled" disabled />
        <View className="flex-row gap-2">
          <Button title="Small" size="sm" />
          <Button title="Large" size="lg" className="flex-1" />
        </View>
      </Section>

      <Section title="Badges & locks">
        <View className="flex-row flex-wrap gap-2">
          <Badge label="NEUTRAL" />
          <Badge label="IN PROGRESS" tone="brand" />
          <Badge label="COMPLETED" tone="success" />
          <Badge label="PENDING" tone="warning" />
          <Badge label="DROPPED" tone="danger" />
          <Badge label="LIVE" tone="live" />
        </View>
        <LockBadge showLabel />
      </Section>

      <Section title="Avatar">
        <View className="flex-row items-center gap-3">
          <Avatar firstName="Meron" lastName="Kassa" />
          <Avatar firstName="Abebe" lastName="Kebede" size={64} />
          <Avatar size={32} />
        </View>
      </Section>

      <Section title="Progress">
        <ProgressBar percent={35} />
        <ProgressBar percent={100} tone="success" />
        <View className="flex-row gap-4">
          <ProgressRing percent={0} />
          <ProgressRing percent={67} />
          <ProgressRing percent={100} size={72} />
        </View>
      </Section>

      <Section title="Inputs">
        <Input label="Email" placeholder="learner@example.com" keyboardType="email-address" />
        <Input label="Password" placeholder="••••••••" password hint="At least 8 characters" />
        <Input label="With error" defaultValue="wrong" error="Invalid credentials" />
        <AppText variant="label">Verification code</AppText>
        <OtpInput value={otp} onChange={setOtp} autoFocus={false} />
      </Section>

      <Section title="Skeleton">
        <Skeleton height={20} width="60%" />
        <Skeleton height={80} />
      </Section>

      <Section title="Card (pressable)">
        <Card onPress={() => setSheetOpen(true)} className="flex-row items-center gap-3">
          <Star size={20} color={colors.primary} />
          <AppText className="flex-1">Tap to open the bottom sheet</AppText>
        </Card>
      </Section>

      <Section title="Empty & error states">
        <EmptyState
          title="No courses yet"
          description="Browse the catalog to enroll."
          actionLabel="Browse catalog"
          onAction={() => {}}
        />
        <ErrorState
          error={new ApiError({ message: 'Course not found', status: 404 })}
          onRetry={() => {}}
        />
        <ErrorState error={new ApiError({ message: 'offline', status: 0 })} onRetry={() => {}} />
      </Section>

      <ModalSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Bottom sheet">
        <AppText className="mb-4">Used for enrollment choices and confirmations.</AppText>
        <Button title="Close" onPress={() => setSheetOpen(false)} />
      </ModalSheet>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3">
      <AppText variant="heading">{title}</AppText>
      {children}
    </Card>
  );
}
