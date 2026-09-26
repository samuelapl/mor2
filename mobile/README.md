# ELTMS Learner — Mobile App

React Native / Expo (SDK 57) app for learners. Design docs live at the repo root:

- [LEARNER_MOBILE_API_SPEC.md](../LEARNER_MOBILE_API_SPEC.md) — backend contract
- [LEARNER_MOBILE_ARCHITECTURE.md](../LEARNER_MOBILE_ARCHITECTURE.md) — structure & systems design
- [LEARNER_MOBILE_IMPLEMENTATION_PHASES.md](../LEARNER_MOBILE_IMPLEMENTATION_PHASES.md) — phases & test scripts

## 1. Configure

```bash
cp .env.example .env.local
# EXPO_PUBLIC_API_URL=http://<your LAN IP>:3001/api/v1
```

Start the backend (`cd ../backend && npm run start:dev`) and, for sample images/videos served from
`frontend/public`, the web app (`cd ../frontend && npm run dev`).

## 2. Run in Expo Go (default)

1. Install **Expo Go** (SDK 57) on the phone; phone and computer on the **same Wi-Fi**.
2. If the firewall is on: `sudo ufw allow 8081,3000,3001,9000/tcp`.
3. `npm start` → scan the QR code (Android: Expo Go app · iOS: Camera app).
4. Can't connect (e.g. guest/isolated Wi-Fi)? Metro can tunnel with `npx expo start --go --tunnel`,
   but the API URL must still be reachable from the phone.

Every native module the app uses is bundled in Expo Go (storage is expo-sqlite, tokens are in SecureStore).

## 2b. Run in the browser (quick testing)

```bash
npm run web          # or press "w" in the npm start terminal
```

- The backend must allow the Expo web origin: `FRONTEND_URL=http://localhost:3000,http://localhost:8081` in `../backend/.env` (comma-separated list).
- Web uses browser storage instead of expo-sqlite / SecureStore, iframes instead of WebViews, and opens files in a new tab (`*.web.ts(x)` files). Camera QR scanning and GPS depend on browser permissions; the phone remains the reference for Phase 4 tests.

## 3. Optional: development build

Only needed for native-only libraries (e.g. native LiveKit later). Either `npx expo run:android`
(Android Studio + JDK 17) or `npx eas-cli@latest build --profile development --platform android`,
then `npm run start:dev-client`. For USB, `npm run usb` sets up `adb reverse` so
`EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1` works.

## 4. Checks

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

## Project layout

```
src/app/            Expo Router routes (thin screens)
src/features/       Domain slices: auth, courses, classroom, progress, assessments,
                    live-sessions, certificates, notifications, profile
src/core/           api client, storage, sync queue, i18n, theme, hooks, utils
src/components/ui/  Design-system primitives (see /dev/ui-gallery in dev builds)
```
