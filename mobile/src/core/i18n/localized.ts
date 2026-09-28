import { useCallback } from 'react';

import type { Locale } from '../api/types';
import { useLocaleStore } from './locale-store';

type LocalizedBase = 'title' | 'description' | 'content' | 'body' | 'objectives';

type LocalizedEntity<B extends LocalizedBase> = Partial<
  Record<`${B}En` | `${B}Am` | B, string | null | undefined>
>;

/**samuel@samuel-gb:~/mor2/mobile$ npm start

> mobile@1.0.0 start
> expo start --go

Node.js (v18.19.1) is outdated and unsupported. Please update to a newer Node.js LTS version (required: >=20.19.4)
Go to: https://nodejs.org/en/download

Starting project at /home/samuel/mor2/mobile
Using src/app as the root directory for Expo Router.
TypeError: configs.toReversed is not a function
TypeError: configs.toReversed is not a function
    at mergeConfig (/home/samuel/mor2/mobile/node_modules/@expo/metro/node_modules/metro-config/src/loadConfig.js:202:35)
    at getDefaultConfig (/home/samuel/mor2/mobile/node_modules/@expo/metro-config/build/ExpoMetroConfig.js:353:25)
    at loadUserConfig (/home/samuel/mor2/mobile/node_modules/@expo/metro-config/build/config/loadUserConfig.js:13:66)
    at loadMetroConfigAsync (/home/samuel/mor2/mobile/node_modules/expo/node_modules/@expo/cli/build/src/start/server/metro/instantiateMetro.js:223:58)
    at instantiateMetroAsync (/home/samuel/mor2/mobile/node_modules/expo/node_modules/@expo/cli/build/src/start/server/metro/instantiateMetro.js:324:71)
    at MetroBundlerDevServer.startImplementationAsync (/home/samuel/mor2/mobile/node_modules/expo/node_modules/@expo/cli/build/src/start/server/metro/MetroBundlerDevServer.js:930:132)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async MetroBundlerDevServer.startAsync (/home/samuel/mor2/mobile/node_modules/expo/node_modules/@expo/cli/build/src/start/server/BundlerDevServer.js:124:24)
    at async DevServerManager.startAsync (/home/samuel/mor2/mobile/node_modules/expo/node_modules/@expo/cli/build/src/start/server/DevServerManager.js:213:13)
    at async startAsync (/home/samuel/mor2/mobile/node_modules/expo/node_modules/@expo/cli/build/src/start/startAsync.js:163:5)
samuel@samuel-gb:~/mor2/mobile$ 
 * Picks `<base>Am` when the locale is Amharic and the value is distinct non-empty Amharic,
 * else canonical `<base>` or `<base>En`.
 * Course content (courses, modules, lessons) is canonical English only.
 */
export function pickLocalized<B extends LocalizedBase>(
  entity: LocalizedEntity<B> | null | undefined,
  base: B,
  locale: Locale,
): string {
  if (!entity) return '';
  const am = entity[`${base}Am` as `${B}Am`];
  const en = entity[`${base}En` as `${B}En`];
  const canonical = (entity as any)[base];
  if (locale === 'am' && am && am.trim() && am !== canonical) return am;
  return canonical ?? en ?? am ?? '';
}

/** Hook form of pickLocalized bound to the current UI locale. */
export function useLocalized() {
  const locale = useLocaleStore((s) => s.locale);
  return useCallback(
    <B extends LocalizedBase>(entity: LocalizedEntity<B> | null | undefined, base: B) =>
      pickLocalized(entity, base, locale),
    [locale],
  );
}
