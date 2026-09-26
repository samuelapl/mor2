import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, MapPin } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, TextInput, View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import { AppText, Button, Card, Screen, SegmentedControl } from '@/components/ui';
import type { CheckInMethod } from '@/core/api/types';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { useThemeColors } from '@/core/theme/colors';
import { FormMessage, useFormError } from '@/features/auth';
import { isValidPin, sessionIdFromQr, useCheckIn } from '@/features/live-sessions';

type Mode = 'pin' | 'qr' | 'gps';

/**
 * In-person self check-in (spec §8.6): classroom PIN, trainer QR code, or GPS.
 * PIN/QR use the web app's code format; the backend records the method.
 */
export default function CheckInScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const online = useIsOnline();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const checkIn = useCheckIn();
  const formError = useFormError(checkIn.error);

  const [mode, setMode] = useState<Mode>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanned = useRef(false);
  const [locating, setLocating] = useState(false);

  const submit = (method: CheckInMethod, coords?: { latitude: number; longitude: number }) =>
    checkIn.mutate(
      { sessionId, method, ...coords },
      // Let the scanner try again after a failed attempt.
      { onError: () => (scanned.current = false) },
    );

  const submitPin = () => {
    if (!isValidPin(sessionId, pin)) {
      setPinError(t('sessions.pinInvalid'));
      return;
    }
    setPinError(null);
    // Same as the web app: a verified classroom PIN is recorded as a QR check-in.
    submit('QR');
  };

  const onScan = ({ data }: { data: string }) => {
    if (scanned.current || checkIn.isPending) return;
    scanned.current = true;
    const scannedSession = sessionIdFromQr(data);
    if (scannedSession !== sessionId) {
      Alert.alert(t('sessions.qrMismatchTitle'), t('sessions.qrMismatch'), [
        { text: t('common.ok'), onPress: () => (scanned.current = false) },
      ]);
      return;
    }
    submit('QR');
  };

  const checkInWithGps = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('sessions.locationTitle'), t('sessions.locationDenied'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('sessions.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      submit('GPS', { latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      Alert.alert(t('sessions.locationTitle'), t('sessions.locationFailed'));
    } finally {
      setLocating(false);
    }
  };

  if (checkIn.isSuccess) {
    return (
      <Screen contentClassName="flex-grow justify-center gap-6 p-6">
        <View className="items-center gap-3">
          <CircleCheck size={64} color={colors.success} />
          <AppText variant="title" className="text-center">
            {t('sessions.checkInDone')}
          </AppText>
          <AppText variant="muted" className="text-center">
            {t('sessions.checkInDoneHint')}
          </AppText>
        </View>
        <Button title={t('common.done')} onPress={() => router.back()} fullWidth />
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-4 p-5">
      <SegmentedControl
        value={mode}
        onChange={(next) => {
          scanned.current = false;
          setMode(next);
        }}
        options={[
          { value: 'pin', label: t('sessions.pin') },
          { value: 'qr', label: t('sessions.qr') },
          { value: 'gps', label: t('sessions.gps') },
        ]}
      />

      {mode === 'pin' ? (
        <Card className="gap-4">
          <AppText variant="muted">{t('sessions.pinHint')}</AppText>
          <TextInput
            value={pin}
            onChangeText={(text) =>
              setPin(
                text
                  .replace(/[^a-z0-9]/gi, '')
                  .toUpperCase()
                  .slice(0, 6),
              )
            }
            placeholder="A1B2C3"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            accessibilityLabel={t('sessions.pin')}
            className="h-14 rounded-xl border border-slate-300 bg-white text-center text-2xl font-bold tracking-[8px] text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
          />
          <FormMessage message={pinError} />
          <Button
            title={t('screens.checkIn')}
            onPress={submitPin}
            disabled={pin.length !== 6 || !online}
            loading={checkIn.isPending}
            fullWidth
          />
        </Card>
      ) : null}

      {mode === 'qr' ? (
        cameraPermission?.granted ? (
          <View className="gap-3">
            <View className="aspect-square w-full overflow-hidden rounded-2xl bg-black">
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={checkIn.isPending ? undefined : onScan}
              />
            </View>
            <AppText variant="muted" className="text-center">
              {t('sessions.qrHint')}
            </AppText>
          </View>
        ) : (
          <Card className="gap-3">
            <AppText variant="muted">{t('sessions.cameraNeeded')}</AppText>
            <Button
              title={t('sessions.allowCamera')}
              onPress={async () => {
                const result = await requestCameraPermission();
                if (!result.granted && !result.canAskAgain) void Linking.openSettings();
              }}
              fullWidth
            />
          </Card>
        )
      ) : null}

      {mode === 'gps' ? (
        <Card className="items-center gap-4 py-6">
          <MapPin size={40} color={colors.primary} />
          <AppText variant="muted" className="text-center">
            {t('sessions.gpsHint')}
          </AppText>
          <Button
            title={t('sessions.checkInWithLocation')}
            onPress={checkInWithGps}
            disabled={!online}
            loading={locating || checkIn.isPending}
            fullWidth
          />
        </Card>
      ) : null}

      <FormMessage message={formError ? formError : !online ? t('common.offlineAction') : null} />
    </Screen>
  );
}
