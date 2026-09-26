import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

/**
 * Drop-in for React Native's Alert. react-native-web's Alert.alert is a no-op, so in the
 * browser this falls back to window.alert / window.confirm (cancel-style button = "Cancel").
 */
function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    NativeAlert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const actions = (buttons ?? []).filter((b) => b !== cancel);

  if (!buttons || buttons.length <= 1 || actions.length === 0) {
    window.alert(text);
    (buttons?.[0] ?? undefined)?.onPress?.();
    return;
  }
  // Two-choice dialogs map to confirm(); the last non-cancel button is the confirm action.
  const confirmed = window.confirm(text);
  if (confirmed) actions[actions.length - 1]!.onPress?.();
  else cancel?.onPress?.();
}

export const Alert = { alert };
