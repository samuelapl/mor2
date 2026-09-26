import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * NativeWind only maps `className` for core React Native components.
 * Third-party components used with `className` must be registered here once.
 */
cssInterop(SafeAreaView, { className: 'style' });
