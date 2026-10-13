# Rankoya frontend: session handoff

**Last updated:** 2026-10-06
**Branch:** `feat/rankoya-mvp` (Phase 1 commit `48a8dfe`)
**Spec:** [implementation_v1.md](implementation_v1.md) + **[implementation_v2.md](implementation_v2.md) (brand refresh, current)** · **Mockups:** [orbit_mockups.txt](orbit_mockups.txt) · **Product record:** [../PRODUCT.md](../PRODUCT.md)

Phases 2–5 were built back to back and committed one by one. **Work stopped after Phase 5 at the owner's request:** the branch is pushed to `origin` and a PR to `main` is open. Phases 6 and 7 are next.

**Working rule (from the product owner, 2026-10-05):** this stage is about getting the UI up. Do not extend `openapi.yaml` or add API-client plumbing for new screens; the backend will not build from it. New interactions (auth, forms) are faked in the UI with a short delay, and only the mock endpoints that already exist are reused.

## v2 in progress (2026-10-06)

The product owner asked for a brand refresh before Phases 6–7 continue. Full spec and checklist: [implementation_v2.md](implementation_v2.md). In short:

- **Palette:** the reference image's blue and navy palette becomes the default, and light mode is the default for every user.
- **Sidebar:** the reference's navy layout. Our top bar stays.
- **Overview:** the reference layout, with six large platform cards and charts.
- **Mock-free code:** MSW and the openapi client are removed; only UI mock data remains, so the app runs with no environment variables (this fixes the endless skeletons on Vercel).
- **Login flow:** login always goes through onboarding before the dashboard.

Work happens on branch `feat/brand-v2`, based on `feat/rankoya-mvp` (PR #1). **Status: every v2 checklist item is done and verified** (typecheck, lint, build; screenshots at 1440/375 px, light/dark, en/ar, the zero-data brand, and the login → onboarding flow). The changes are not committed yet; they are waiting for the product owner's review.

Key changes for the next session:
- **Mock store:** `src/lib/mocks/store.ts` (in-memory UI mock store) replaces the MSW handlers and the API client; types are hand-written in `src/lib/api/types.ts`.
- **Login landing:** sign-in, Google and verify all land on `ONBOARDING_START` (`/onboarding/brand`) unless there is a `?next=` deep link.
- **Tokens:** see implementation_v2.md section 1. Signal is now violet with white text; the primary (`ink`) is blue.
- **Overview** data lives in `src/lib/mocks/ui-data-overview.ts`; the charts use `components/charts/area-spark.tsx`.
- **Gotcha:** don't start a second `next dev` while one is already running; Next 16 refuses and points to the existing server.

---

## 1. Current state at a glance

| Phase | Scope | Status |
|---|---|---|
| 0 | Before writing code (plan, init, prune) | Mostly done (see 2.0) |
| 1 | Foundations | **Done**, committed, waiting for review |
| 2 | Shell and shared patterns, screens 1–3 | **Done**, committed |
| 3 | Onboarding, screens 4–8 | **Done**, committed |
| 4 | Insights, screens 9–14 | **Done**, committed |
| 5 | Agent and content, screens 15–18 | **Done**, committed, pushed, PR open |
| 6 | Workspace and settings, screens 19–23, 404/500, help | Not started |
| 7 | Polish, locales, tests | Not started |

**Verified at the end of Phase 1:**
- `npm run build`, `npm run lint` (ESLint plus the i18n check) and `npm run typecheck` all pass.
- Playwright screenshots of `/dev/components` at 1440 px and 375 px, in light and dark, in English and Arabic: no console errors, no horizontal page scroll.

**How to run:**

```bash
npm install
npm run dev            # http://localhost:3000 redirects to /dev/components for now
npm run lint           # ESLint + scripts/check-i18n.mjs
npm run typecheck
npm run api:types      # regenerate src/lib/api/schema.d.ts after editing openapi.yaml
```

`.env.local` (gitignored) must contain these values; copy from `.env.example`:

```
NEXT_PUBLIC_API_MOCKING=enabled
NEXT_PUBLIC_API_URL=https://api.rankoya.uk/v1
NEXT_PUBLIC_SUPPORT_WIDGET=disabled
```

---

## 2. Checklist against the spec

Legend: `[x]` done · `[~]` partly done or done differently (see notes) · `[ ]` not started

### 2.0 Before writing code (spec section 0)

- [x] Read the prompt and the mockups
- [x] `/impeccable init`. Wrote `PRODUCT.md` from a short interview: owner-first users with agencies second, Free / Growth / Agency tiers, WCAG 2.2 AA, legal company name still a placeholder. The impeccable launcher could not download its engine binary (no network for it), so no `DESIGN.md` or impeccable live config exists.
- [~] Skills during the build. The quality floor (`craft-floor`) was applied. `pick-ui-library`, `emil-design-eng`, `design-taste-frontend` and `minimalist-ui` were not invoked as separate passes.
- [ ] `find-animation-opportunities` / `review-animations` (Phase 7 motion pass)
- [ ] `break-ui` on every finished screen (no app screens exist yet)
- [x] Build plan replied, with mockup gaps and spec conflicts (section 4 below)
- [x] `npm prune`

### 2.1 Stack (spec section 1)

- [x] shadcn initialized (Radix base, RTL enabled) and the component list added
- [~] shadcn `form` is no longer in the registry; `field` was added instead and will be wired to react-hook-form
- [~] shadcn `sidebar` was **removed** because it uses physical left/right sides, a 16rem width and hard-coded English. `AppSidebar` gets built in Phase 2.
- [x] All runtime and dev packages installed. Extra: `@playwright/test` with Chromium.
- [x] Geist + Geist Mono via `next/font`. Noto Sans Arabic / SC / JP are attached only for their locales and never preloaded ([src/app/fonts.ts](../src/app/fonts.ts)).
- [ ] `proxy.ts` (auth redirect + locale header). Locale detection currently works without it because `request.ts` reads `Accept-Language` directly.
- [x] Server Components for layout; client components for interactive parts
- [x] shadcn primitives restyled with Rankoya tokens

### 2.2 Structure and routing (spec section 2)

- [x] App moved from `app/` to `src/app/`; `@/*` now points to `src/*`
- [ ] Route groups `(auth)`, `(onboarding)`, `(app)`, `/workspaces`, `/[brand]/…`
- [x] Folders: `components/{ui,brand,charts,agent}`, `i18n`, `messages`, `lib/api`, `lib/mocks`. Extras: `components/data-table`, `components/forms`, `lib/store`, `lib/hooks`.
- [ ] `components/layout/*` (Phase 2)
- [ ] `features/<module>/` (created per module from Phase 3 on)
- [~] Tokens live in `src/app/globals.css` rather than a separate `styles/tokens.css`
- [x] Zustand UI store: sidebar collapsed, agent panel open, command open, active workspace and brand mirrored to cookies ([src/lib/store/ui.ts](../src/lib/store/ui.ts))
- [x] `X-Workspace-Id` header on every client API call (openapi-fetch middleware)
- [ ] Workspace switch clears the React Query cache and redirects to the last-used brand or to onboarding (Phase 2)
- [x] Query-key factories ([src/lib/api/query-keys.ts](../src/lib/api/query-keys.ts)): `me`, `workspace`, `overview`, `visibility`, `job`, `notification`, `agent`. Add more per module.
- [x] Job polling every 3 s via `useJob` with real progress ([src/lib/api/use-job.ts](../src/lib/api/use-job.ts))
- [ ] nuqs URL state for range, engine and table filters (adapter is mounted; first use in Phase 4)
- [~] One `ApprovalCard` component exists. Edit is a callback for now; the real edit flow comes in Phase 5.
- [x] MSW gated by `NEXT_PUBLIC_API_MOCKING`; base URL from `NEXT_PUBLIC_API_URL`
- [x] Fictional mock entities. **Note:** the mock user was changed in `fixtures.ts` to "Favour Odili" (by the user); keep it.

### 2.3 Brand guide (spec section 3)

- [x] All light and dark tokens. Two extra tokens, `blue-bg` and `blue-ink`, carry the "You" tint from the mockups.
- [x] Signal is used only as a fill with signal-ink text (also used for text selection)
- [x] Primary button is `bg-ink text-ink-fg`
- [x] Your brand is always `chart-you`, drawn last (on top) at 2 px versus 1.5 px for competitors
- [x] Deltas always show arrow + sign + color. Rank deltas are lower-is-better (`▲ 5` in green).
- [x] Type utilities: `text-display`, `text-h1`–`text-h3`, `text-body`, `text-body-lg`, `text-small`, `text-caption`, `text-overline`, `text-metric-xl`, `text-metric`, `text-mono`, plus `num` for tabular figures. Overline drops uppercase and tracking for ar/zh/ja.
- [x] Radius scale 4/8/12/16, card and popover shadows (cards have no shadow in dark mode)
- [x] Motion tokens: 120/200/320 ms, `--ease-out` and `--ease-in-out`, press scale 0.97, KPI tween ≤400 ms, reduced motion honored
- [x] Theme switching without transitions (`disableTransitionOnChange`)
- [x] Logical properties throughout; directional icons use `rtl:-scale-x-100`
- [x] Engine monogram tiles (GPT, GEM, PPX, CLD, AIO)
- [x] Logo: lowercase wordmark plus ring mark with a Signal dot
- [ ] Sidebar 248/64 px, top bar 56 px sticky, 1440 px max content width with 32/16 px page padding (Phase 2 shell)

### 2.4 Core components (spec section 4)

- [x] Button: sizes sm/md/lg/icon-sm/icon; variants primary/secondary/ghost/agent/destructive/link; hover, press, focus, disabled and loading states; 44 px touch target
- [x] Input (40 px, 48 px `lg`), read-only field with lock icon, domain input that strips protocol and trailing slashes, `FormField` with label, helper and error
- [x] KpiCard, ScoreRing (bands, empty state), DeltaChip, EngineChip, RankCell, OwnerChip, StatusBadge
- [x] DataTable on TanStack Table **v9**: sticky header, end-aligned numbers, column picker, CSV export, loading and empty states
- [x] EmptyState and Skeleton
- [~] AgentPanel: 400 px end-side sheet with ⌘J/Ctrl+J, thread and composer. It is only mounted in the gallery; app-wide mounting comes in Phase 2.
- [x] Message (markdown + GFM tables, "from Telegram" source), ApprovalCard, TaskRow
- [x] Charts: VisibilityTrend (Recharts), ShareOfVoice, RankDistribution, Sparkline. Colors come from CSS variables and the x-axis reverses in RTL.
- [ ] Chart custom date range picker (7/30/90 exist as tabs; custom range comes with the Phase 4 screens)

### 2.5 Shared app patterns (spec section 4b): all Phase 2 / Phase 6

- [ ] Workspace and brand switcher
- [ ] Credits and plan chip
- [ ] Language switcher (the gallery has only a temporary en/ar toggle)
- [ ] Theme toggle in the top bar and profile menu (the gallery has a temporary toggle)
- [ ] Notifications popover (mock endpoint `GET /notifications` already exists)
- [ ] Profile menu
- [ ] Sidebar footer (user card, plan badge, Upgrade, Telegram status)
- [ ] Settings tabs (profile, security, workspace, team, brand, autopilot, notifications, api-keys, billing)
- [ ] `/workspaces`
- [ ] Help and support sheet, feedback dialog
- [ ] Page sub-tabs synced to the URL

### 2.6 Screens (spec section 5)

| # | Route | Status |
|---|---|---|
| 1–3 | sign-in, sign-up, forgot-password / verify | [ ] Phase 2 |
| 4–8 | onboarding brand / competitors / keywords / connect / scan | [ ] Phase 3. Job mock with per-engine progress (one engine fails) already exists. |
| 9 | overview | [ ] Phase 4. `GET /brands/:id/summary` mock exists, including a zero-data "first scan running" brand (`br_new`). |
| 10–14 | visibility, prompt detail, rankings, competitors, audit | [ ] Phase 4 |
| 15–18 | actions, content calendar, article editor, agent | [ ] Phase 5. Agent thread and message mocks exist. |
| 19–21 | integrations, settings/*, workspaces | [ ] Phase 6 |
| 22–23 | social and reports stubs | [ ] Phase 6 |
| — | ⌘K command menu, ⌘J panel on every app screen, `not-found.tsx`, `error.tsx` | [ ] Phase 2 / 6 |

Every screen still needs `page.tsx`, `loading.tsx`, an empty state and MSW handlers.

### 2.7 Dark mode and translation (spec section 6)

- [x] next-themes (class attribute, system default) with Light / Dark / System
- [x] Theme mirrored to the `rankoya_theme` cookie; the server renders an explicit dark choice
- [ ] Theme saved to the profile via `PATCH /me` (the mock endpoint exists; wiring comes in Phase 2)
- [x] All colors from tokens: charts, skeleton, focus rings, scrollbars (`color-scheme`), selection
- [ ] Tiptap editor theming, QR code tile (Phases 3 / 5)
- [x] next-intl without locale prefixes; resolution order cookie → profile (mirrored into the cookie) → `Accept-Language` → `en`
- [x] `en` complete for Phase 1 keys. `ar` is a draft marked `"_status": "draft"`. Missing keys fall back to `en` with a dev warning.
- [ ] `es`, `fr`, `de`, `pt`, `zh`, `ja` message files (Phase 7). Add each to `enabledLocales` and `loaders` in `src/i18n`.
- [x] No hard-coded UI strings: `react/jsx-no-literals` plus `scripts/check-i18n.mjs` for attribute strings
- [x] ICU plurals; Intl formatters with named formats ([src/i18n/formats.ts](../src/i18n/formats.ts))
- [x] RTL: `<html dir="rtl" lang="ar">`, Radix `Direction.Provider`, sheets on logical sides, `dir="auto"` on agent and user content, signed numbers isolated in RTL
- [ ] Language switcher with search and native names; saves to cookie + `PATCH /me` and refreshes without losing filters (Phase 2)
- [~] UI language and brand content language are separate in the data model (`Brand.contentLanguage`); the UI controls come in Phases 3 and 6
- [x] `locale` is sent with `POST /agent/messages`

### 2.8 Quality bar (spec section 7)

- [x] build, lint, no `any` (enforced by ESLint)
- [~] 375 / 1440 px, light / dark, en / ar verified for the gallery only. German (long strings) cannot be checked until `de.json` exists.
- [ ] `break-ui` per screen
- [ ] Contrast audit per screen (see the known issue in section 5)

### 2.9 Build order (spec section 8)

- [x] Phase 1 committed, **stopped for review**
- [ ] Phases 2–7. Commit after each phase and report what was built, what was mocked, which gaps were filled and any backend assumptions.

---

## 3. Decisions made this session

| Decision | Why |
|---|---|
| Work on branch `feat/rankoya-mvp` | Repo rule: don't commit to `main` |
| Shadcn semantic tokens (`background`, `primary`, `muted`…) mapped onto Rankoya tokens | Every primitive inherits the palette without per-component edits |
| One global focus rule (2 px blue outline, 2 px offset), unlayered CSS | Beats the `outline-none` utilities that shadcn ships with |
| Type styles as `@utility` classes, registered in `cn` (`src/lib/utils.ts`) | Stops `text-h1` and `text-fg` from cancelling each other in `cn` |
| Ink buttons hover by mixing 14% toward `ink-fg` | Darkening near-black by 6% is invisible |
| Latin digits in every locale, including Arabic | Numbers stay in Geist Mono with tabular alignment; separators still follow the locale |
| MSW on the server too (`src/instrumentation.ts`) | Server Components can prefetch for first paint |
| API client waits for the MSW worker before its first request | Mocks are reliable without blocking render |
| Mock job progress computed from wall-clock time since first poll | Real progress, consistent between browser and server mocks |
| OpenAPI contract drafted in `src/lib/api/openapi.yaml`; types generated | Doubles as the API assumptions list for the backend developer |
| `/dev/components` only available when mocking is enabled | Internal page; returns 404 in production builds without mocks |
| Mock "today" fixed at 2026-10-04 (`MOCK_NOW`) | Stable screenshots and tests |

---

## 4. Mockup gaps and conflicts (fill as listed when building)

**Gaps**
- **"ACTION PLAN" mockup:** a copy of Site audit. Design from the spec as 4 columns (Needs your approval / Rankoya is working on / You need to do / Done this week) plus a projected-score strip.
- **Missing screens:** sign-up, forgot/verify, onboarding 2–5, article editor (`Editor.dc.html` is linked but not provided), workspaces, every settings tab except Autopilot, notifications, profile menu, ⌘K, reports, social. Build them from spec sections 4b and 5.
- **Placeholders:** `[PLAN NAME]` comes from the usage API (mock: Growth). `[COMPANY NAME]` stays a translatable placeholder until legal confirms the name.

**Conflicts (the spec wins)**
- **Sidebar width:** mockup 232 px, spec 248 px.
- **Active nav icon:** the mockup uses a Signal fill. Signal is reserved for the agent and for wins, so use ink/surface emphasis.
- **Overview score ring:** the mockup draws 64 in blue. ScoreRing bands make 40–69 warning (amber).
- **Chart line widths:** mockup 2.5 px for your brand; spec 2 px versus 1.5 px.
- **Onboarding step name:** the mockup says "Topics"; use "Keywords" to match the route.
- **Content width:** mockup caps at 1200 px; spec says 1440 px.
- **Top bar:** the mockup lacks the switcher, credits, language, profile and notifications that 4b requires. Search moves into ⌘K.

---

## 5. Gotchas for the next session

1. **Don't edit files with Windows PowerShell `Get-Content`/`Set-Content`.** PowerShell 5.1 reads UTF-8 as ANSI and adds BOMs. This corrupted characters once (now repaired). Use the editor tools or a Node script.
2. **Multi-line git commit messages:** `git commit -F -` with a here-string does not work in this shell. Write the message to a file and use `git commit -F <file>`.
3. **Next.js 16.3:** `middleware.ts` is now `proxy.ts` (Node runtime only). Request APIs are async. Read `node_modules/next/dist/docs/` before using an unfamiliar API.
4. **TanStack Table is v9.** Use `useTable` with `tableFeatures({...})`, not `useReactTable`. Shared features and column meta live in `dataTableFeatures` / `DataColumn<T>` ([src/components/data-table/data-table.tsx](../src/components/data-table/data-table.tsx)). Keep column arrays stable with `useMemo`. Bundled docs: `node_modules/@tanstack/react-table/skills/`.
5. **MSW is v3.** The option is `onUnhandledFrame`, not `onUnhandledRequest`. `sse` from `msw` is available for streaming agent replies.
6. **`cn` comes from shadcn's `cn` package**, configured in `src/lib/utils.ts`. Always import `cn` from `@/lib/utils`. Add new `text-*` size utilities to its `font-size` group.
7. **Zustand v5:** never return a new function or object from a selector (infinite render loop). Use `useUiStore.getState()` inside handlers.
8. **React lint rules flag** `setState` inside effects and impure calls such as `Date.now()` during render. Use `useMounted()` (`src/lib/hooks/use-mounted.ts`) or derived state instead.
9. **Contrast watch:** `text-fg-3` (#6B7380) on `surface-2` (#F0F2F5) is about 4.3:1 in light mode, below 4.5:1. Use `text-fg-2` on surface-2 and bg fills; table headers already do.
10. **Prettier** (`npm run format`) uses defaults with semicolons, 120 columns and Tailwind class sorting.
11. **Two `.env` files:** `.env.example` is committed; `.env.local` is gitignored.
12. **Agent replies:** the mock reply to `POST /agent/messages` is always English. Make it locale-aware when SSE streaming is built in Phase 5.

---

## 6. Backend assumptions to confirm with the backend developer

All are also marked `ASSUMPTION` in [src/lib/api/openapi.yaml](../src/lib/api/openapi.yaml):

- **Auth:** an httpOnly session cookie (`rankoya_session`); every call sends `X-Workspace-Id`.
- **Errors:** a `Problem` object `{ code, title, status, detail }` with a stable `code` (e.g. `engine_unavailable`, `publish_failed`).
- **Long work:** returns `202 { jobId }`. `GET /jobs/{id}` returns `status`, `progress` (0–1), `etaSeconds` and per-step `{ key, status, progress, retryAt }`.
- **Plans and credits:** `GET /workspaces/{id}/usage` returns plan `{ name, tier, isTopTier }`, credits `{ remaining, total }` and meters for scans, articles and prompts. No limit is hard-coded on the client.
- **Last-used brand:** `Workspace.lastBrandSlug` is remembered per user and workspace.
- **Brands:** `Brand.contentLanguage` (what Rankoya writes in) is separate from `Me.locale` (UI language).
- **Notifications:** sent as `kind` plus structured `params`; the client owns the copy.
- **Agent:** `POST /agent/messages` takes `{ threadId, text, locale }`; replies stream over SSE at `GET /agent/threads/{id}/stream`. The thread is shared with Telegram.
- **Approvals:** `POST /approvals/{id}/decision` with `{ decision: approve | reject, note? }`.
- **Missing data:** `mentionRate` is `null` when an engine was unreachable; `visibility.score` is `null` before the first scan.

---

## 7. Open questions for the product owner

- Is `feat/rankoya-mvp` the right branch, or should work go to `main`?
- The `.gitignore` change that ignores `CLAUDE.md`, `.claude/`, `.agents/` etc. was included in the Phase 1 commit. Keep it?
- What is the legal company name for footers? Placeholder until then.
- Arabic UI uses Latin digits. Confirm, or switch to Arabic-Indic digits (this changes the number font strategy).

---

## 8. Phase 2 notes (shell and auth)

- **Shell** (`src/components/layout/`): `AppShell` (client) composes `AppSidebar` (248/64 px, collapse state in the `rankoya_sidebar` cookie so the server renders the right width), `Topbar` (56 px sticky), `ContextSwitcher` (workspace / brand popovers built on cmdk, search past 6 items, create-workspace dialog), `CreditsChip`, `LanguageSwitcher`, `ThemeToggle`, `NotificationsPopover`, `ProfileMenu`, `CommandMenu` (⌘K), `HelpSheet` + `FeedbackDialog` (faked submit), and the app-wide `AgentPanel` (⌘J).
- **Brand resolution:** `useBrandLookup(slug)` finds which workspace owns the slug (active workspace first), then a layout effect syncs the store and cookies before child queries run. Unknown slug → 404.
- **Workspace switch:** clears the React Query cache, shows a toast, opens the last-used brand or `/onboarding/brand`.
- **⌘K** can hand an unmatched query to the agent panel; the composer draft lives in the UI store (`agentDraft`).
- **Auth (faked):** `proxy.ts` checks only that `rankoya_session` exists. Sign-in accepts anything except the password `wrong-password` (shows the error). Verify accepts `123456`. Sign-up → verify → onboarding; forgot → verify (with new password) → app.
- **Fonts:** Noto Sans SC/JP were removed from next/font. Turbopack fetched hundreds of CJK font files at build time and one failed download broke every page. zh/ja now use system CJK fonts.
- **Placeholders:** `[brand]/[...section]` renders a temporary screen for routes not built yet; it disappears as real routes land.

## 9. Phase 3 notes (onboarding)

- `/onboarding/[step]` (brand, competitors, keywords, connect, scan) inside `OnboardingShell` (step pills, linked once reached; compact step counter and progress line on mobile; Save and exit).
- The draft lives in a zustand store (`features/onboarding/store.ts`) with fake suggestions in `features/onboarding/data.ts`. A refresh resets it; that is fine at this stage.
- **Brand:** typing a valid domain fakes a 1.8 s crawl, then shows the learned profile. Market and content-language names come from `Intl.DisplayNames`, so they translate for free. The content language is labelled as separate from the UI language.
- **Keywords:** the limit is remaining tracked prompts from the existing usage endpoint (25 when there is no workspace).
- **Connect:** Telegram card with a real, scannable QR (`qrcode.react`; fixed `qr-bg`/`qr-fg` tokens keep it dark on light in both themes), copyable link code, fake connect; WordPress and Search Console fake connects; `AutopilotOptions` (reused in Settings).
- **Scan:** polls the existing `/jobs/:id` mock every 3 s with a fresh job id per run. Real per-engine progress; AI Overviews fails with the shared engine-down copy. Takes about 160 s, and Go to dashboard unlocks when it finishes.
- Fixed a double focus ring on inputs nested in a bordered wrapper (global focus rule beat `outline-none`).

## 10. Phase 4 notes (insights)

- **Data:** screens without a mock endpoint use `useFakeQuery(key, loader)` (`src/lib/fake-query.ts`) over fixtures in `src/lib/mocks/ui-data.ts`, so loading, empty and error states are real. Swap the loader for an API call later and keep the keys. Overview still uses the existing summary endpoint.
- **Zero data:** brand `fresh-start` (Ada's Agency) returns empty data everywhere; overview shows the running first scan with live per-engine progress.
- **URL state (nuqs):** `range` (7d/30d/90d/custom + `from`/`to`), `engine`, `device`, `view`, `severity`.
- **Jobs:** `useJobRunner` + `JobBanner` for Run new scan, Recheck, Run audit and fixes. The job mock now has short audit (30 s) and fix (15 s) jobs.
- **Approvals:** audit fixes go through `ApprovalCard` (dialog or inline on the issue page). The decision mock now accepts any approval id, and the card keeps its own content and only takes the new status.
- **Routes:** overview, visibility, visibility/prompts/[promptId], rankings, competitors, audit, audit/[issueId]; each has a `loading.tsx`.
- **Arabic:** Phase 4+ strings are English-only for now (fallback with dev warnings); drafted in Phase 7.
- The browser time zone is mirrored to `rankoya_tz` so the server-rendered greeting matches the user's clock.

## 11. Phase 5 notes (agent and content)

- **Action plan:** 4 columns. Needs-approval cards are real `ApprovalCard`s; approve moves a card to Rankoya is working on, reject removes it, and Edit opens the article. Approve all asks for confirmation first. The projected-score strip shows the gain left on the plan. Mark done moves your cards to Done.
- **Content:** calendar or list view (`?view=`), month in the URL (`?month=2026-10`), locale week start (date-fns locale), legend, Waiting for you, Plan next month (faked). Mobile shows an agenda instead of the grid. Calendar days are anchored at local noon so time-zone formatting never shifts a date.
- **Article editor** (`content/[articleId]`): Tiptap (StarterKit, H2/H3, lists, quote, undo/redo, token-styled `.rankoya-editor`), Short answer callout, score + checklist, meta title counter, URL slug, publish target, date/time, notify on Telegram. `[PLACEHOLDER]` tokens block Approve and schedule. The body uses the brand's content language (`lang`), separate from the UI language. Reject asks for confirmation; Revise opens a dialog.
- **Agent** (`/agent`): full thread with day dividers, suggestion chips, typing indicator and a streamed reply (word-by-word reveal; instant with reduced motion; SSE stub). Side panel has capabilities, Telegram status and open tasks. The mock reply follows the UI language (en/ar).
- Data for these screens: `src/lib/mocks/ui-data-work.ts`.

## 12. Next session: Phases 6 and 7

- **Phase 6:** integrations (19), settings tabs (20: profile, security, workspace, team, brand, autopilot (reuse `AutopilotOptions`), notifications, api-keys, billing), `/workspaces` (21), social and reports stubs (22–23), `not-found.tsx`, `error.tsx`. Remove the `[brand]/[...section]` placeholder once every nav route exists.
- **Phase 7:** motion pass, dark/RTL/German sweep, Arabic strings for Phases 4–6 (about 430 keys fall back to en today), draft es/fr/de/pt/zh/ja, smoke tests (vitest + Playwright).

## 13. Previous Phase 2 plan (done)

1. **`proxy.ts`** (at `src/proxy.ts`):
   - redirect unauthenticated requests to `/sign-in` (mock session cookie)
   - set the `x-rankoya-locale` header from `Accept-Language` when no cookie exists
   - exclude static assets, `/mockServiceWorker.js` and `/dev`
2. **Route groups:** `(auth)`, `(app)/[brand]/layout.tsx` with the shell.
3. **`components/layout/`:**
   - **Core shell:** `AppSidebar` (248/64 px, a start-side Sheet on mobile, nav groups from the mockup, footer with user card, plan, Upgrade and Telegram status) and a sticky 56 px `Topbar`.
   - **Switchers and preferences:** `ContextSwitcher` (workspace / brand), `CreditsChip`, `LanguageSwitcher`, `ThemeToggle`.
   - **Overlays:** `NotificationsPopover`, `ProfileMenu`, `CommandMenu` (⌘K), and AgentPanel mounted app-wide.
4. **Preferences:** wire `PATCH /me` for locale and theme. On workspace switch, clear the query cache, show a toast, and redirect to the last brand or onboarding.
5. **Auth screens 1–3:** split layout with the ink brand panel, Google SSO, forgot password, 6-digit verify (`input-otp`). Language and theme pickers before login.
6. Add mock handlers and OpenAPI entries for auth, then run `npm run api:types`.
7. Replace the root redirect in `src/app/page.tsx` with a session-aware redirect.
8. Verify at 375 / 1440 px, light / dark, en / ar. Run `break-ui`. Commit and report.

## 14. Shared account pages (2026-10-07)

Ported from [SHARED_ACCOUNT_PAGES_HANDOFF.md](SHARED_ACCOUNT_PAGES_HANDOFF.md); checklist and decisions in [shared_account_pages_checklist.md](shared_account_pages_checklist.md).

- **Routes:** `/settings?tab=profile|workspaces|subscriptions|team-members`, `/upgrade`, `/workspaces/[id]`, `/resellers`, `/agency` (inside the app shell, last-used brand), `/admin/*` (own shell), `/[brand]/integrations(/[provider])`, `/integrations/[provider]/select` (OAuth popup), `/privacy-policy`, `/terms-of-service`, `/refund-policy` (public). `/[brand]/settings/*` redirects to `/settings`.
- **Data:** services in `src/services/*` call the shared Netsach backend with axios. Without `NEXT_PUBLIC_API_BASE_URL`, `src/services/api/demo-adapter.ts` answers in the browser (Free allows 1 workspace and no team members, to show the upgrade redirect). Vercel domain routes are simulated the same way.
- **Session:** `authToken` + `authUser` cookies (`src/lib/auth-session.ts`); the faked sign-in writes a demo account. Settings → Profile → **Demo account** switches role (admin), plan and add-ons to test every gate.
- **White Label:** `BrandProvider` paints a tenant's colours onto Rankoya tokens (`--ink`, `--blue`, `--nav-bg`…) on custom domains; the sign-in panel becomes the tenant's carousel.
- Integrations (Telegram, WordPress, Search Console, Analytics) are UI-only, kept in a zustand store.
