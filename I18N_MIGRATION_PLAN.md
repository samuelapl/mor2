# i18n Migration Plan: Locale Store + `locales/en` / `locales/am`

## 1. Goals

1. **Separate language store:** language moves out of `auth-store.ts` into its own `locale-store.ts`. Language works on any page, logged in or not, and the auth store only syncs it to the user's profile.
2. **No inline translations:** every UI string comes from `locales/en/*.json` and `locales/am/*.json` through `t()`. No `tBilingual('…', '…')`, `isAmharic ? … : …` or `{ en, am }` literals left in components.
3. **No visible change:** strings move word for word. Every page should look identical in both languages before and after.

## 2. Current State (2026-10-11)

| Inline pattern | Uses | Files |
| :--- | ---: | ---: |
| `tBilingual('English', 'አማርኛ')` | ~1,770 | 96 |
| `isAmharic ? 'አማርኛ' : 'English'` | ~286 | 26 |
| `lang === 'am' ? … : …` | ~53 | 24 |
| `{ en: '…', am: '…' }` literals | ~287 | 12 |
| Central dictionary (`t()`, `tr()`) | ~15 | 4 |

- **Central dictionary today:** `lib/i18n/translations.ts`, about 230 entries in `ROLE_*`, `NAV_*` and `COMMON_*`, plus `constants/labels.ts` (`tr`).
- **Where the language lives:** `useAuthStore` (`lang`, `setLang`, `updateLocale`). It is read directly in 10 files.

**Inline strings per area** (`tBilingual` + ternaries):

| Area | Uses | Files |
| :--- | ---: | ---: |
| `components/features/courses` | 502 | 25 |
| `app/(dashboard)/system-admin` | 286 | 8 |
| `components/features/classroom` | 150 | 9 |
| `components/features/news` | 147 | 11 |
| `app/(auth)` | 118 | 7 |
| `components/features/laws` | 117 | 5 |
| `components/shared` | 92 | 12 |
| `app/(dashboard)/training-admin` | 83 | 4 |
| `app/(dashboard)/trainer` | 83 | 2 |
| `app/page.tsx` (landing) | 74 | 1 |
| `app/(dashboard)/course-owner` | 71 | 3 |
| `app/(dashboard)/manage-certificates` | 71 | 1 |
| `app/(dashboard)/learner` | 69 | 6 |
| `components/layout` | 42 | 5 |
| `app/(dashboard)/news-management` | 39 | 2 |
| `components/features/sessions` | 35 | 3 |
| everything else | ~110 | ~14 |

**Out of scope:** database content that is stored in both languages, such as `titleEn`/`titleAm` on courses, sessions, laws and news. That is data, not UI text, and it stays as it is.

## 3. Target Architecture

```
frontend/src/lib/
├── stores/
│   ├── locale-store.ts        # lang + setLang + hydrate (localStorage, <html lang>)
│   └── auth-store.ts          # no lang; adds syncLocale(lang) → profile PATCH
└── i18n/
    ├── locales/
    │   ├── en/  common.json nav.json roles.json auth.json dashboard.json
    │   │        courses.json sessions.json classroom.json certificates.json
    │   │        users.json news.json laws.json quiz.json landing.json admin.json
    │   └── am/  (same files, same keys)
    ├── index.ts               # merges namespaces, exports TranslationKey types + translate()
    └── useTranslation.ts      # t(), changeLanguage(), tRole/tNav (temporary: tBilingual)
```

### Using `t`

```tsx
const { t } = useTranslation('sessions');     // namespace once
t('schedule.title')
t('schedule.batchSuccess', { count: venueRows.length })   // "{count}" placeholder
t(`status.${session.status}`)

const { t } = useTranslation();               // no namespace → full keys
t('common.save')
```

### Outside components (stores, utilities, toasts fired from stores)

```ts
import { translate } from '@/lib/i18n';
toast.success(translate('sessions.schedule.success'));   // reads useLocaleStore.getState().lang
```

### Language toggle flow

```
click "አማርኛ" → changeLanguage('am')            (useTranslation)
  → useLocaleStore.setLang('am')                  instant: state, localStorage, <html lang>
  → useAuthStore.syncLocale('am')                 background: PATCH profile (only if signed in)
  → every useTranslation() consumer re-renders → t() returns Amharic
```

- **Startup:** `SessionSync` calls `useLocaleStore.getState().hydrate()`, then `initAuth()`.
- **Login:** keeps today's rule. The language saved on this device wins; if there is none, the profile's locale is applied.

### Key rules

- **Key format:** `<area>.<meaning>`, for example `schedule.title`, `empty.upcoming`, `status.LIVE`. Keys are camelCase; enum values keep their API spelling.
- **Same keys everywhere:** every key exists in both `en` and `am`. If an Amharic entry is missing at runtime, the app falls back to English.
- **When to use `common`:** only for words used by two or more namespaces. Everything else stays in the feature's own namespace.
- **Typed keys:** a typo in `t('...')` fails `tsc` (the type is generated from `en`).

### Folder → namespace

| Code | Namespace |
| :--- | :--- |
| `app/(auth)` (login, register, verify-email, verify-code, first-login, password reset) | `auth` |
| role dashboards (`learner/`, `trainer/`, `training-admin/page`, `course-owner/page`, `content-approver/page`) | `dashboard` |
| `features/courses`, `course-owner/*`, `courses/` | `courses` |
| `features/sessions`, `trainer/attendance`, `training-admin/calendar` | `sessions` |
| `features/classroom` | `classroom` |
| `features/cert`, `features/certificates`, `manage-certificates`, `certificate-templates`, `app/verify` (certificate check) | `certificates` |
| `features/users`, `system-admin/users`, `bulk-register`, `register-actor`, `roles` | `users` |
| `system-admin/settings`, `policies`, other admin pages | `admin` |
| `features/news`, `news-management`, `app/news`, `lib/news.ts` | `news` |
| `features/laws`, `laws`, `laws-management`, `types/laws.ts` | `laws` |
| `features/quiz`, `question-bank`, `prepared-quiz` | `quiz` |
| `app/page.tsx` | `landing` |
| `components/layout`, `components/shared`, `components/ui` | `common` / `nav` |

## 4. Phases

### Phase 1 — Separate locale store
1. Create `lib/stores/locale-store.ts` with `lang`, `setLang`, `hydrate`, and move `LOCALE_STORAGE_KEY`, `getStoredLocale` and `persistLocale` into it.
2. In the auth store:
   - remove `lang` and `setLang`
   - replace `updateLocale` with `syncLocale(lang)`, which handles only the profile update
   - make `enterSession` apply the locale through `useLocaleStore`
3. Have `SessionSync` call `hydrate()` before `initAuth()`.
4. Make `useTranslation()` read `lang` from the locale store and expose `changeLanguage`.
5. Switch the 10 files that read the language directly, such as `LanguageToggle`, `PreferencesTab`, `Pagination` and the learner pages, to `useTranslation()` (`lang`, `changeLanguage`).
6. Run `tsc`.

**Browser check:**
- Toggle the language while logged out and while logged in.
- Reload; the choice should stick.
- Log in and confirm the profile picks up the language.
- Change the language in Preferences.

### Phase 2 — i18n foundation (no strings moved yet)
1. Create `lib/i18n/locales/{en,am}/*.json`. Seed `common`, `nav` and `roles` from `translations.ts` and `constants/labels.ts`.
2. Add `lib/i18n/index.ts`:
   - load the JSON files
   - `translate(key, vars?)` with `{placeholder}` interpolation and English fallback
   - a `TranslationKey` type built from `en`
3. Update `useTranslation(namespace?)`:
   - `t()` uses the JSON catalog
   - `tRole`, `tRoleDesc` and `tNav` read `roles.json` and `nav.json`
   - `tBilingual` stays, marked deprecated
4. Re-point `tr()` and `translations.ts` at the catalog. Their callers keep working, and both are deleted in Phase 5.
5. Add `npm run i18n:check`, which fails on:
   - keys present in one language but not the other
   - empty values
   - placeholders that differ between `en` and `am`
6. Run `tsc` and `i18n:check`.

**Browser check:** the sidebar, role names and common labels look the same in both languages.

### Phase 3 — Extraction script (codemod)
Write `scripts/i18n-extract.ts`. Given a folder and a namespace, it:
1. Finds `tBilingual('en', 'am')`, `tBilingual({ en, am })`, `isAmharic ? 'am' : 'en'`, `lang === 'am' ? … : …` and `{ en: '…', am: '…' }` literals made of plain strings or template literals.
2. Turns `${expr}` in template literals into named placeholders (`{count}`, `{name}`) and passes `{ count: expr }` to `t()`.
3. Generates keys as `<file-or-component>.<camelCaseOfEnglish>`, shortened. Identical en+am pairs share a key. When the same English has different Amharic in different places, it reports the conflict instead of picking one.
4. Writes the new keys into `en/<ns>.json` and `am/<ns>.json` and rewrites the code to `t('…')`. It adds `const { t } = useTranslation('<ns>')` where needed and uses `translate()` outside components.
5. **Checks its own work:** it reports, for every rewritten call, that the JSON values equal the original strings exactly.
6. Has a `--dry-run` mode that prints a report (converted, conflicts, skipped) without writing anything.

Skipped cases, such as dynamic strings, JSX inside a translation, or strings built across several statements, are listed for manual conversion.

**Usage:**

```
cd frontend
node scripts/i18n-extract.mjs --ns sessions --dry-run src/components/features/sessions   # report only
node scripts/i18n-extract.mjs --ns sessions src/components/features/sessions             # apply
npm run i18n:check && npx tsc --noEmit
```

**What the script leaves for manual conversion, by design:**
- **`{ en, am }` objects stored in config and passed around as values** (e.g. `SessionsManager`'s `SCOPE_CONFIG`). Store the key instead, e.g. `titleKey: 'sessionsManager.allSessionsTitle'`, then call `t(config.titleKey)`.
- **Text whose language comes from a prop or parameter instead of the UI language** (e.g. `StartsInBadge`'s `isAmharic` prop, certificates rendered in a chosen language). Pass `t` down, or keep the language explicit if it is intentionally not the UI language.
- **Spots where a local variable named `t` exists**, e.g. `.map((t) => …)`. Rename the local variable, then rerun.
- **English and Amharic that interpolate different values**, e.g. `formatStartsIn(s, true)` vs `formatStartsIn(s)`.

### Phase 4 — Migrate folder by folder
Order: smallest first to prove the script, then the rest. Each step:
- `--dry-run`, review the report
- run it
- fix skipped cases by hand
- `tsc` and `i18n:check`
- **browser check of every page in that folder in both languages**
- one commit

| Step | Folder(s) | ~Uses |
| :---: | :--- | ---: |
| 4.1 | `features/sessions`, `trainer/attendance`, `training-admin/calendar` | 40 |
| 4.2 | `components/layout`, `components/ui` | 60 |
| 4.3 | `components/shared` | 92 |
| 4.4 | `app/(auth)` | 118 |
| 4.5 | role dashboards (`learner`, `trainer`, `training-admin`, `course-owner`, `content-approver`) | 330 |
| 4.6 | certificates (`features/cert`, `features/certificates`, `manage-certificates`, `certificate-templates`, `app/verify`) | 120 |
| 4.7 | news (`features/news`, `news-management`, `app/news`, `lib/news.ts`) | 190 |
| 4.8 | laws (`features/laws`, `laws`, `laws-management`, `types/laws.ts`) | 125 |
| 4.9 | `features/classroom` | 150 |
| 4.10 | `system-admin` (split into `users` / `admin`) | 286 |
| 4.11 | `features/courses` (split by `creator`, `review`, `detail`, `learn` if needed) | 502 |
| 4.12 | `app/page.tsx` (landing), `lib/app-time.ts`, `lib/duration.ts` | 80 |

**Browser check for every step:** open each page in the folder, switch the language on it, and check:
- headings, buttons, empty states and toasts
- placeholders filled in with real values
- no raw keys such as `sessions.schedule.title` showing on screen

### Phase 5 — Cleanup and guard
1. Remove `tBilingual` from `useTranslation`. Delete `lib/i18n/translations.ts` and `constants/labels.ts`.
2. Remove the remaining `isAmharic` uses that pick text. Keep the ones used for layout, fonts or dates.
3. Extend `i18n:check` to fail if any `.ts`/`.tsx` file outside `locales/` contains Ethiopic characters (except the files marked as database-content or test fixtures).
   Known intentional Amharic in code: labels/placeholders of Amharic-content inputs (e.g. "Session Title (አማርኛ)" in `ScheduleSessionModal`, `EditSessionModal`, `SessionDetailModal`, `LiveQuizTrainerControl`) — allow-list these.
   Also intentional: native language names in language pickers (`LanguageToggle`, `PreferencesTab`, `CertificateLanguageDropdown`), and `CertificateRenderer`, which renders a certificate in the certificate's own language (not the UI language) with template-field overrides. Also default Amharic titles for assessment data in `ClassroomShell` (`titleAm: … || 'የማጠቃለያ ፈተና'`, content defaults). Also the "ነጋሪት" (Negarit) emblem in `PdfViewerModal` (a proper name) and Amharic example placeholders of the laws forms. Also: news page metadata in `app/news` (SEO titles deliberately in both languages, e.g. "ዜና | News"), and `NewsEditor`'s default source value ("የገቢዎች ሚኒስቴር", content).
4. Add `i18n:check` to the pre-commit hook or CI.
5. Run `tsc`, `npm run build`, and a full browser check in both languages.

## 5. Risks

| Risk | Mitigation |
| :--- | :--- |
| A string changes while moving | The script checks the JSON against the original text; browser check per folder |
| The same English text has different Amharic in different places | The script reports conflicts; a person decides per case |
| Raw keys showing in the UI | English fallback + `i18n:check` key parity; look for `.` keys in the browser check |
| Bad key names from the script | Review the dry-run report; rename before committing a folder |
| Merge conflicts with ongoing feature work | One folder per commit; migrate a folder when no one is working in it |
| Translating database content by mistake | `titleEn`/`titleAm`-style fields are out of scope; the script ignores property access |

## 6. Checklist

| Phase | Work | TypeScript | i18n:check | Browser | Status |
| :--- | :--- | :---: | :---: | :---: | :--- |
| 1 | `locale-store.ts` | [x] | n/a | [x] | Done |
| 2 | Catalog + `t()` + `translate()` + check script | [x] | [x] | [x] | Done |
| 3 | Extraction script | [x] | n/a | n/a | Done (tested on sessions + courses/creator, reverted) |
| 4.1 | sessions (57 by script, 18 config texts + 1 badge by hand) | [x] | [x] | [ ] | Committed — browser check pending |
| 4.2 | layout + ui → common | [x] | [x] | [ ] | Committed — browser check pending |
| 4.3 | components/shared → common | [x] | [x] | [ ] | Committed — browser check pending |
| 4.4 | auth pages → auth | [x] | [x] | [ ] | Committed — browser check pending |
| 4.5 | role dashboards → dashboard | [x] | [x] | [ ] | Committed — browser check pending |
| 4.6 | certificates | [x] | [x] | [ ] | Committed — browser check pending |
| 4.7 | news | [x] | [x] | [ ] | Committed — browser check pending |
| 4.8 | laws | [x] | [x] | [ ] | Committed — browser check pending |
| 4.9 | classroom | [x] | [x] | [ ] | Committed — browser check pending |
| 4.10 | system-admin → users + admin | [x] | [x] | [ ] | Committed — browser check pending |
| 4.11 | courses + quiz | [x] | [x] | [ ] | Committed — browser check pending |
| 4.12 | landing + duration/time units | [x] | [x] | [ ] | Committed — browser check pending |
| 5 | Cleanup + guard | [x] | [x] | [ ] | Committed — browser check pending |

## 7. Wording Conflicts (same English, different Amharic)

**Unified on 2026-10-11** (one Amharic wording each; duplicate keys inside a namespace merged):

| English | Amharic now used everywhere |
| :--- | :--- |
| Cancel | ይቅር |
| Sign In / Sign in | ግባ |
| Mark all read | ሁሉንም እንደተነበበ ምልክት አድርግ |
| Roles | ሚናዎች |
| Live Sessions | የቀጥታ ክፍለ-ጊዜዎች |
| No live sessions scheduled | ምንም የታቀዱ የቀጥታ ክፍለ-ጊዜዎች የሉም |
| Save changes | ለውጦችን አስቀምጥ |
| Upload Document | ሰነድ ጫን |
| Save as Draft | እንደ ረቂቅ አስቀምጥ |
| Untitled Module | ርዕስ አልባ ሞጁል |
| Online Self-Paced | ኦንላይን (ራስ-አገዝ) |
| Online session | የኦንላይን ክፍለ-ጊዜ |
| Could not resend the code. Try again. | ኮዱን በድጋሚ መላክ አልተቻለም። እንደገና ይሞክሩ። |
| Resend code in {cooldown}s | ኮዱን በ{cooldown} ሰከንድ ውስጥ በድጋሚ ላክ |
| Review queue | የግምገማ ዝርዝር |

**Kept different on purpose (21):** the Amharic differs because the meaning does:
- **Singular vs plural:** Completed, Approved, Reviewed, Pending Review, Expired, Role, User, "Lesson" as a count word.
- **Status/event vs label:** Approved/Rejected/Published/Revoked as a history event (ጸድቋል) vs a badge or filter (የጸደቀ).
- **Short button vs long label:** Video/Audio Lecture.
- **The English is the inaccurate side:** "Final Assessment" (Amharic adds "and rules"), "Target:" (one means the item being revoked).
- **Instruction vs button:** Assign a trainer, Register user, Add Category.

A native speaker may still want to review these.

## 8. As Built (2026-10-11)

- **Text:** `frontend/src/lib/i18n/locales/{en,am}/*.json` — 15 namespaces, ~2,300 keys.
- **In components:** `const { t } = useTranslation('<ns>')` → `t('key', { vars })`; `tRich` when a placeholder is JSX; `tRole` / `tNav` for roles and menu labels.
- **Outside components:** `translate('ns.key')` (current UI language) or `translateIn(lang, 'ns.key')` (explicit language, e.g. `formatDuration`).
- **Language state:** `lib/stores/locale-store.ts`; switch with `changeLanguage()` from `useTranslation()`.
- **Removed:** `tBilingual`, `lib/i18n/translations.ts`, `constants/labels.ts` (`tr`), `BilingualText` props on PageShell/PageSection.
- **Guard:** `npm run i18n:check` (runs automatically before `npm run build`) fails on:
  - en/am key mismatches, empty values, or placeholder mismatches
  - Amharic text in `.ts`/`.tsx` that is not in `scripts/i18n-allowlist.json`
- **Adding text:** add the key to both `locales/en/<ns>.json` and `locales/am/<ns>.json`, then use `t('key')`. Intentional Amharic in code (native language names, Amharic-input placeholders, certificate-language text) goes in the allow-list with a reason.
- **Tooling:** `scripts/i18n-extract.mjs` (codemod used for the migration) stays for converting any remaining `isAmharic ? … : …` text.

