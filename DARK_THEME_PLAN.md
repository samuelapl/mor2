# Dark Theme Plan: Semantic Color Tokens (shadcn-style) + Theme Store

> Written 2026-10-11 to be picked up in a new session. Self-contained: read this file first.
> Branch: create `dark-theme` from the latest branch (`i18n`, or `main` once `migration` and `i18n` are merged).

## 1. Problem

Dark mode is switched correctly (`darkMode: 'class'` in `tailwind.config.ts`; the toggle adds `dark` to `<html>`), but components hard-code colors and must repeat every one with a `dark:` variant:

```tsx
'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20'
```

Measured in `frontend/src`:
- **Missing dark variants:** 970 class strings use light colors (`bg-white`, `bg-slate-50`, `text-slate-900`, `border-slate-200`…); **663 have no dark variant** (113 files). These stay white in dark mode: dashboard chart cards, the course review page, the delivery-format modal…
- **Half-converted:** the text got a `dark:` color but the box did not → light text on a white box, nearly invisible. Examples: the course overview title / Department values, the "Online Self-Paced" card text, chart legends.
- **No shared palette:** about 1,550 `dark:` color classes in 90 files and about 4,000 raw accent classes (emerald/amber/rose/indigo…). Every component picks its own shade, so pages look uneven even where dark mode works.
- **Worst files (missing dark variants):**

  | File | Missing |
  | :--- | ---: |
  | `features/sessions/virtual/interactive/LiveQuizTrainerControl.tsx` | 91 |
  | `app/(dashboard)/training-admin/venues/page.tsx` | 26 |
  | `features/courses/creator/CreatorSidebar.tsx` | 20 |
  | `app/(dashboard)/training-admin/feedback/page.tsx` | 20 |
  | `features/courses/CatalogCourseModal.tsx` | 19 |
  | `features/sessions/in-person/VenueAllocationStep.tsx`, `VenueDetailModal.tsx` | 12 each |
  | `features/sessions/virtual/interactive/LiveQuizLearnerOverlay.tsx` | 12 |
  | `features/sessions/shared/SessionDetailModal.tsx` | 12 |
  | `features/courses/detail/CourseCurriculumSection.tsx` | 11 |
  | `app/(dashboard)/system-admin/policies/page.tsx`, `roles/page.tsx` | 11 each |

- **Toggle bug:** in `lib/theme.tsx` the OS-change listener reads the theme from page load (`stored`), so picking "System" later does not follow live OS changes until reload. Theme also does not sync across open tabs.

## 2. Goal

Like shadcn/ui: colors are declared **once** as CSS variables, with a light set under `:root` and a dark set under `.dark`, and exposed as Tailwind colors. Components use only semantic names; **no `dark:` color classes in components**.

```tsx
// before
<div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
  <h3 className="text-slate-900 dark:text-white">…</h3>
  <p className="text-slate-500 dark:text-slate-400">…</p>
</div>
// after
<div className="rounded-2xl border border-border bg-card">
  <h3 className="text-foreground">…</h3>
  <p className="text-muted-foreground">…</p>
</div>
```

**Rules after the migration**
1. Anything that differs between themes (backgrounds, borders, text, status colors) uses a token.
2. No `dark:` for colors in components. `globals.css` is the only place that knows dark values.
3. Raw colors are fine only for things meant to look identical in both themes: brand gradients, illustrations, white text on a solid primary button, the certificate renderer.
4. `dark:` stays allowed only for non-color, dark-specific tweaks (e.g. a shadow or image swap), rarely.

## 3. Token Set

shadcn names + `success` / `warning` / `info` (the app uses green/amber/sky statuses everywhere). Values are space-separated RGB so they map exactly to today's Tailwind colors and support opacity (`bg-primary/20`).

| Token (Tailwind class) | Used for | Light (`:root`) | Dark (`.dark`) |
| :--- | :--- | :--- | :--- |
| `background` (`bg-background`) | Page background | slate-50 `248 250 252` | slate-950 `2 6 23` |
| `foreground` (`text-foreground`) | Main text, headings | slate-900 `15 23 42` | slate-100 `241 245 249` |
| `card` / `card-foreground` | Cards, panels | white `255 255 255` / slate-900 | slate-900 `15 23 42` / slate-100 |
| `popover` / `popover-foreground` | Modals, dropdowns, menus | white / slate-900 | slate-900 / slate-100 |
| `muted` (`bg-muted`) | Inner boxes, table headers, hover rows | slate-50 `248 250 252` | slate-800 `30 41 59` |
| `muted-foreground` | Descriptions, labels, hints | slate-500 `100 116 139` | slate-400 `148 163 184` |
| `subtle-foreground` | Least important text (counts, meta) | slate-400 `148 163 184` | slate-500 `100 116 139` |
| `border` (`border-border`) | Borders, dividers | slate-200 `226 232 240` | slate-700 `51 65 85` |
| `input` (`border-input`) | Form field borders | slate-300 `203 213 225` | slate-600 `71 85 105` |
| `ring` | Focus ring | indigo-500 `99 102 241` | indigo-400 `129 140 248` |
| `primary` / `primary-foreground` | Brand actions, links | indigo-600 `79 70 229` / white | indigo-500 `99 102 241` / white |
| `primary-soft` | Tinted primary backgrounds | indigo-50 `238 242 255` | indigo-950 `30 27 75` |
| `accent-soft` | Violet tint (gradients) | violet-50 `245 243 255` | violet-950 `46 16 101` |
| `success` / `success-soft` | Published, approved, passed | emerald-700 `4 120 87` / emerald-50 `236 253 245` | emerald-400 `52 211 153` / emerald-950 `2 44 34` |
| `warning` / `warning-soft` | Pending, draft, due | amber-700 `180 83 9` / amber-50 `255 251 235` | amber-400 `251 191 36` / amber-950 `69 26 3` |
| `danger` / `danger-soft` (shadcn: `destructive`) | Rejected, delete, errors | rose-700 `190 18 60` / rose-50 `255 241 242` | rose-400 `251 113 133` / rose-950 `76 5 25` |
| `info` / `info-soft` | Informational | sky-700 `3 105 161` / sky-50 `240 249 255` | sky-400 `56 189 248` / sky-950 `8 47 73` |

Tune the dark values during Phase 2 by looking at real pages; the table is the starting point.

**`globals.css`** (replace the current `--foreground-rgb` / `--background-rgb`):
```css
:root {
  --background: 248 250 252; --foreground: 15 23 42;
  --card: 255 255 255; --card-foreground: 15 23 42;
  --muted: 248 250 252; --muted-foreground: 100 116 139; --subtle-foreground: 148 163 184;
  --border: 226 232 240; --input: 203 213 225; --ring: 99 102 241;
  --primary: 79 70 229; --primary-foreground: 255 255 255; --primary-soft: 238 242 255;
  --success: 4 120 87; --success-soft: 236 253 245;
  /* …rest of the table */
}
.dark {
  color-scheme: dark;
  --background: 2 6 23; --foreground: 241 245 249;
  --card: 15 23 42; --card-foreground: 241 245 249;
  /* …dark column */
}
```

**`tailwind.config.ts`** (`theme.extend.colors`):
```ts
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
colors: {
  background: token('background'),
  foreground: token('foreground'),
  card: { DEFAULT: token('card'), foreground: token('card-foreground') },
  popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
  muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
  subtle: { foreground: token('subtle-foreground') },
  border: token('border'), input: token('input'), ring: token('ring'),
  primary: { DEFAULT: token('primary'), foreground: token('primary-foreground'), soft: token('primary-soft') },
  accent: { soft: token('accent-soft') },
  success: { DEFAULT: token('success'), soft: token('success-soft') },
  warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
  danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
  info: { DEFAULT: token('info'), soft: token('info-soft') },
}
```
Also move the `boxShadow` colors (`rgb(15 23 42 / …)`) to a `--shadow` variable so shadows are softer in dark mode.

## 4. Theme Store (replaces `lib/theme.tsx` Context)

Same pattern as `lib/stores/locale-store.ts`.

```ts
// lib/stores/theme-store.ts
state:   theme: 'light' | 'dark' | 'system'; resolvedTheme: 'light' | 'dark'
actions: hydrate()          // once: read localStorage 'mor_theme', apply, listen to OS + 'storage' events
         setTheme(theme)    // save, toggle `dark` on <html>, update state
```
- **The OS listener reads the live store state** (fixes the System bug).
- **The `storage` event syncs open tabs.**
- **No flash on load:** keep `themeInitScript` in `<head>` (`app/layout.tsx:61`).
- **Hydration:** `SessionSync` (`components/providers/SessionSync.tsx`) calls `useThemeStore.getState().hydrate()` alongside the locale hydrate; `ThemeProvider` is removed from `AppProviders.tsx`.
- **Consumers:** `useTheme()` users are `ThemeToggle.tsx` and the 5 role dashboards (`*/page.tsx` for charts). Switch them to `useThemeStore((s) => s.resolvedTheme)`.

### Runtime flow
```
load:   <head> script adds .dark from localStorage → first paint already dark → hydrate() syncs state
toggle: setTheme('dark') → localStorage → <html>.classList → CSS variables swap → whole page repaints
                         (no component re-renders for colors; only the toggle updates its icon)
OS:     prefers-color-scheme change → if theme === 'system' → toggle class
tabs:   'storage' event → apply new theme
JS:     charts read resolvedTheme or getComputedStyle(--primary) for canvas/SVG colors
```

## 5. Phases

One commit per phase. After each one: `npx tsc --noEmit`, `npm run build`, and a browser check in **both** themes.

### Phase 1 — Foundation (no visual change intended)
1. Add the tokens to `globals.css` with **light values equal to today's light colors**, and add the Tailwind `colors`.
2. Add `theme-store.ts`; remove the `ThemeProvider` context; update `ThemeToggle` and the dashboards.
3. Fix the System listener; add tab sync.
4. Set `body` to `bg-background text-foreground`.

**Check:** toggle Light / Dark / System; reload keeps the choice; switching in one tab updates another; the OS change is followed while on System.

### Phase 2 — Shared UI components
Convert `components/ui/*` first, so many pages improve at once:
- `Card`, `StatCard`, `Modal`, `ConfirmModal`, `WorkspaceDetailOverlay`, `Table`, `Pagination`, `Badge` (status + level colors → `success` / `warning` / `danger` / `info`), `Button` (variants), `TextArea`, `RichTextArea`, `RichContent`, `FilterBar`, `EmptyState`, `Skeleton`, `ViewToggle`, `Toast`
- `charts/*`: `BarChart`, `DonutChart`, `VerticalBarChart`, `ProgressRing` — read token colors for axes, grid, labels and track
- `components/shared/PageShell`, `PageSection`, the account tabs
- `components/layout/*`: Header, Sidebar, PublicHeader, footer, LearnerBottomNav

Tune the dark token values here while looking at real pages.

**Check:** a dashboard, a table page and a modal in both themes.

### Phase 3 — Codemod for common patterns
Write `frontend/scripts/theme-tokens.mjs`, like `scripts/i18n-extract.mjs` (TypeScript AST, string and template literals inside `className` / `cn()` / `clsx()`):
- **Pairs:** a light class plus its `dark:` partner → one token. Examples:
  - `bg-white dark:bg-slate-900` → `bg-card`
  - `text-slate-900 dark:text-white` / `dark:text-slate-100` → `text-foreground`
  - `text-slate-500 dark:text-slate-400` → `text-muted-foreground`
  - `border-slate-200 dark:border-slate-700|800` → `border-border`
  - `bg-slate-50 dark:bg-slate-800` → `bg-muted`
  - `bg-emerald-50 dark:bg-emerald-950/*` → `bg-success-soft`
  - `text-emerald-700 dark:text-emerald-400` → `text-success` (same for amber → warning, rose/red → danger, sky → info, indigo → primary)
- **Light-only classes with no `dark:` partner** (the 663 that cause white boxes) → the token, using the same mapping.
- **Opacity is kept:** `bg-slate-50/60` → `bg-muted/60`, `border-slate-200/80` → `border-border/80`.
- **`--dry-run`** reports per file. Anything that does not match a mapping (gradients, odd shades, `text-white` on colored buttons) is listed for manual review instead of guessed.
- **Not touched:** `CertificateRenderer` and any print or export layout (intentionally fixed colors).

### Phase 4 — Page-by-page migration
Run the codemod folder by folder, fix the leftovers by hand, browser-check both themes, commit. Worst first:

| Step | Folder | Notes |
| :---: | :--- | :--- |
| 4.1 | `features/courses/review/*` + `detail/*` | Course review page is fully light today (screenshot 2) |
| 4.2 | Role dashboards (`app/(dashboard)/*/page.tsx`) | Chart cards render white (screenshot 1) |
| 4.3 | `features/courses/creator/*` incl. `DeliveryFormatModal` | Washed-out cards (screenshot 3) |
| 4.4 | `features/sessions/**` (`LiveQuizTrainerControl` 91, venues, `SessionDetailModal`) | |
| 4.5 | `training-admin/*` (venues, feedback, enrollments, calendar) | |
| 4.6 | `features/classroom/**` | Learner classroom (`DocumentStage` quiz cards etc.) |
| 4.7 | `features/news`, `features/laws`, `features/certificates` (not the renderer) | |
| 4.8 | `system-admin/*` (roles, policies, users, settings, audit logs) | |
| 4.9 | auth pages, landing page, `learner/*`, everything else | |

### Phase 5 — Guard
Add `npm run theme:check` (and run it in `prebuild` next to `i18n:check`). It fails on:
- **`dark:` color utilities** (`dark:(bg|text|border|from|via|to|ring|divide|placeholder)-…`) in `.tsx` outside an allow-list
- **raw neutral surface/text colors** (`bg-white`, `bg-slate-*`, `text-slate-*`, `border-slate-*`, `bg-gray-*`…) outside an allow-list
  - The allow-list (`scripts/theme-allowlist.json`, file + reason) covers e.g. `CertificateRenderer`, brand gradients, `text-white` on solid buttons.

## 6. Browser Check (each phase)

Critical pages in both themes, at desktop and mobile width:

| # | Page | What to look for |
| :---: | :--- | :--- |
| 1 | Header, sidebar, notifications dropdown, language and theme toggles | Shell surfaces and menus |
| 2 | Training-admin dashboard | Stat cards, chart cards, chart axes, legend |
| 3 | Course review (overview, curriculum, assessments, session plan, approval history) | The page that is all-white today |
| 4 | Course creator + delivery-format modal | Card text readable on selected / unselected cards |
| 5 | Learner classroom: document stage, quiz cards, certificate stage | Status tints (passed / unlocked / locked) |
| 6 | Sessions manager + schedule modal + live quiz controls | Tables, modals, the largest file |
| 7 | Any table with pagination + filters | Header row, hover row, borders |
| 8 | Login page | Public pages |

**Look for:**
- white or very light boxes in dark mode
- text you can barely read (light on light, dark on dark)
- harsh pure-white borders
- inconsistent card shades on the same page

## 7. Checklist

| Phase | Work | tsc / build | Browser | Status |
| :--- | :--- | :---: | :---: | :--- |
| 1 | Tokens + theme store + toggle fixes | [ ] | [ ] | Pending |
| 2 | Shared UI / layout / charts | [ ] | [ ] | Pending |
| 3 | Codemod (`scripts/theme-tokens.mjs`) | [ ] | n/a | Pending |
| 4.1–4.9 | Folder migrations | [ ] | [ ] | Pending |
| 5 | `theme:check` guard | [ ] | n/a | Pending |

## 8. Notes for the New Session

- **State:** language state is `lib/stores/locale-store.ts`; i18n uses `useTranslation('<ns>')` + `t()` (see `I18N_MIGRATION_PLAN.md`). Don't touch text while doing colors.
- **Prior art:** the codemod and guard follow the same approach as `frontend/scripts/i18n-extract.mjs` and `frontend/scripts/i18n-check.mjs`. Reuse their structure (TS AST, dry-run, self-check, allow-list with reasons).
- **Most-used neutral classes today:**

  | Class | Count |
  | :--- | ---: |
  | `text-slate-400` | 837 |
  | `bg-white` | 663 |
  | `text-slate-500` | 624 |
  | `text-white` | 465 |
  | `border-slate-200` | 454 |
  | `text-slate-900` | 430 |
  | `text-slate-600` | 369 |
  | `text-slate-700` | 335 |
  | `text-slate-800` | 245 |
  | `bg-slate-50` | 197 |
  | `bg-slate-100` | 194 |

  Map `text-slate-600/700/800` → `foreground` or `muted-foreground` by role; review these in the dry-run.
