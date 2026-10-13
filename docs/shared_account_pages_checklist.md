# Shared account pages: implementation checklist

**Started:** 2026-10-07 · **Branch:** `feat/brand-v2` · **Source:** [SHARED_ACCOUNT_PAGES_HANDOFF.md](SHARED_ACCOUNT_PAGES_HANDOFF.md) (Flowcasta)

Legend: `[x]` done · `[~]` partly done or done differently (see note) · `[ ]` not started · `[-]` deliberately not ported

## Ground rules for this port

- **Logic stays, UI is Rankoya's.** Services, types, validation, gating, URL contracts, optimistic and polling behaviour follow the handoff. Every screen is built with Rankoya's own tokens (`globals.css`), shadcn primitives, type utilities, i18n and RTL rules. There is **no** Flowcasta token aliasing (`--brand`, `--surface-raised`…); components use Rankoya tokens directly.
- **Data layer (owner decision, 2026-10-07):** the axios services are ported verbatim against the shared Netsach backend. When `NEXT_PUBLIC_API_BASE_URL` is unset, the axios instance uses an in-memory **demo adapter** so the pages work on Vercel with no env.
- **Session (owner decision, 2026-10-07):** adopt `authToken` + `authUser` cookies (`lib/auth-session.ts`). The faked sign-in writes a demo `authUser` so role and plan gates work. `proxy.ts` checks `authToken`.
- **Dependencies:** install only what has no equivalent. Equivalents already present: shadcn/Radix (all `@radix-ui/*`), `sonner` (react-hot-toast), `motion` (framer-motion), `cn` (clsx + tailwind-merge), our cookie helpers (cookies-next), Tiptap (quill), `next-themes`, `zustand`, `lucide-react`. **New:** `axios`, `@paddle/paddle-js`.
- **Integrations:** Flowcasta's streaming channels (YouTube, Twitch, Kick, RTMP…) are not ported. Rankoya keeps the reusable *pattern* (catalogue, OAuth popup + `postMessage`, manual connect, details, disconnect) for its own integrations.
- Every string goes through next-intl (`en.json`); Arabic falls back to English until the Phase 7 translation pass.

## 0. Foundation

- [x] Install `axios`, `@paddle/paddle-js`
- [x] `src/types/shared.ts`: §5 types (streaming/destination/project/AI-agent types dropped; they belong to Flowcasta features)
- [x] `src/services/api/api.ts`: axios instance + Bearer token; demo adapter when no base URL
- [x] `src/services/api/demo-adapter.ts`: in-memory backend for every ported route (workspaces, team, subscriptions, custom domains, uploads, reseller, admin, credits, email campaigns)
- [x] `src/lib/auth-session.ts` (cookie helpers swapped for `lib/cookies`; `rankoya:` event prefix)
- [x] `src/lib/errors.ts`: `getErrorMessage`; `getInitialsFromName` reuses `layout/initials.ts`
- [x] `src/lib/toast.ts`: `toast.success / error / upgrade / loading / dismiss` on sonner
- [x] `src/lib/plan-core.ts`, `src/lib/plan.ts` (Rankoya plan copy), `src/lib/subscription.ts`, `src/lib/white-label-access.ts`, `src/lib/profile-image.ts`
- [x] `src/stores/workspace-store.ts` (zustand, verbatim logic)
- [x] `src/services/{workspaces,team-members,subscriptions,custom-domain,upload,reseller,admin,credits,email-marketing}.ts`
- [-] `services/Projects.ts`, `lib/tours.ts`: streaming projects and product tours don't exist in Rankoya
- [-] Flowcasta UI primitives (§7): Rankoya's shadcn Button / Dialog / Input / Select / Tabs / Badge / Card / Tooltip / Avatar / Skeleton are used instead

## 1. Session, sign-in and route gating

- [x] Faked sign-in / sign-up / verify / Google write `authToken` + demo `authUser`; sign-out calls `clearSession()`
- [x] `proxy.ts`: `authToken` auth check, legal pages public, `/admin/**` admin-only (→ `/`), vendor-only legal pages on tenant hosts. Flow AI, `/go`, guest rooms, `/register` block dropped
- [x] Dev-only role/plan switcher so every gate can be checked (admin, free, professional, agency, reseller, White Label add-on)

## 2. Account shell and navigation

- [x] Account routes render inside the existing `AppShell` (last-used brand) at top level: `/settings`, `/upgrade`, `/workspaces/[id]`, `/resellers`, `/agency`
- [x] Sidebar Settings item and profile menu point to `/settings?tab=…`; Upgrade card and credits chip point to `/upgrade`
- [x] Sidebar/profile entries for Resellers and Agency, shown to the roles and plans that can use them; Admin console link for admins

## 3. Settings (`/settings?tab=profile|workspaces|subscriptions|team-members`)

- [x] Tabs synced to `?tab=` (local state first, then `router.replace`)
- [x] **Profile:** avatar (upload → `UploadService` → localStorage), name and email, change password with a 4-bar strength meter (save = toast only, quirk 1 kept)
- [x] **Workspaces:** list from `useWorkspaceStore`, `?workspaceModal=create` deep link, create / edit (+ activate) / delete with confirm, View details, Configure White Label (gated → upgrade dialog), member counts from the team list, "upgrade" errors → `/upgrade`
- [x] **Subscriptions:** Active plans (Renews / Expires / Lifetime), Cancel plan → confirm → `cancelSubscription` → optimistic "Renewal cancelled" + Pay now; Add-ons (valid keys only, `reseller_seats` → White Label)
- [x] **Team members:** list, add / edit in one dialog (roles `team_member | client | editor | admin`, password required on add, optional on edit via `/team/update/password`, workspace checkboxes, ≥1 workspace, `user_access` for every workspace, active workspace pre-ticked), delete with confirm, "upgrade" errors → `/upgrade`

## 4. Upgrade (`/upgrade`, Paddle)

- [x] `PaddleProvider`, `lib/paddle.ts`, `lib/paddle-config.ts` (env price IDs); checkout disabled with a notice when Paddle isn't configured
- [x] Plans (monthly / annual) and add-ons tabs (`?tab=whitelabel`), Rankoya copy and features
- [x] `handleCardAction` decision tree: White Label → checkout; free or cancelled → checkout; active paid → confirm dialog → cancel first → checkout (cancel-only stops)
- [x] White Label owners see the sales-kit CTA via `useWhiteLabelAccess` (cookie, then server check)

## 5. White Label

- [x] `config/brand.ts` with Rankoya defaults (colours from Rankoya tokens, login carousel copy, host helpers, `NEXT_PUBLIC_APP_HOST`)
- [x] `ConfigureWhiteLabelModal`: domain, brand name, logo, icon, favicon, carousel slides, default theme, six colours with live preview, support / reply-to emails; new → `POST /api/custom-domains` then `saveDomain`; existing → `updateConfig`; redirect to `/workspaces/:id?dns=:domainId`
- [x] `WhiteLabelUpgradeModal`
- [x] `/workspaces/[id]`: domain cards (status, SSL, colour preview, carousel count, logo), 5 s verification poll → `PATCH /custom-domains/:id/verification`, `?dns=` opens records, edit, delete (Vercel first, then backend)
- [x] `DnsDomainRecordModal` (A / CNAME / TXT, copy, manual Verify), `ConfirmDeleteDomainModal`
- [x] `app/api/custom-domains/**` Vercel routes (demo responses when Vercel env is missing)
- [x] `BrandProvider` + `BrandGate`: resolve host, override Rankoya's tokens (`--ink`, `--signal`, `--bg`, `--surface`, `--text`…) inline, title / favicon; curtain until ready. No-op on the vendor host

## 6. Reseller console (`/resellers`)

- [x] Gate: admin / super_admin or `reseller` plan, locked state otherwise
- [x] Three stat cards, reseller table, add / edit dialog (password required on add, optional on edit via `/reseller/update/password`), delete with confirm

## 7. Agency resources (`/agency`)

- [x] Gate: admin / super_admin or active `agency` / `reseller` plan
- [x] Rankoya resource kit (summary header, category filter, cards with Download / Preview). Assets are placeholders until the kit exists. "Manage plan" → `/settings?tab=subscriptions` (quirk 2 fixed)

## 8. Admin console (`/admin/**`)

- [x] `/admin` → `/admin/user-management`; admin shell (own sidebar + header, Rankoya styling)
- [x] User management: paged list with debounced search, stats, table actions (edit details / plan / add-ons / password, activate / deactivate, delete, add / update credits, licence details), add user
- [x] Statistics cards
- [x] Marketing: create campaign (individual / bulk / CSV import, recipient search) with a Tiptap editor instead of Quill, campaign table

## 9. Integrations (Rankoya's own, the Flowcasta pattern)

- [x] `/[brand]/integrations` catalogue: Telegram, WordPress, Google Search Console, Google Analytics (+ "coming soon" Shopify, Webflow)
- [x] OAuth-style connect in a popup → `/integrations/[provider]/select` landing → `postMessage({ type: "rankoya:integration-connected" })` to the opener; popup close-poll fallback; plan-limit error → `/upgrade`
- [x] Manual connect (WordPress application password, Telegram link code)
- [x] Connected-account details, disconnect with confirm
- [-] Flowcasta streaming channels, RTMP / stream keys, project unlink flow

## 10. Legal pages (public)

- [x] `LegalPageShell` (Rankoya logo, token-based header, links, Back to home)
- [x] `/privacy-policy`, `/terms-of-service`, `/refund-policy` with Rankoya facts; integrations list matches Rankoya (Google APIs incl. Limited Use, Telegram, WordPress); NETSACH TECH LTD kept as the operator
- [x] Footer links from the auth screens

## 11. Verification

- [x] `npm run typecheck`, `npm run lint`, `npm run build`
- [~] Screens at 1440 / 375 px and light / dark checked with Playwright (no console errors, no horizontal scroll). Arabic not re-checked: the new strings fall back to English until the Phase 7 translation pass
- [x] Gates checked with each demo role / plan
- [x] Update `session_handoff.md` and `.env.example`

## Backend and ops notes

- Set `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_HOST`, the Paddle and Vercel env for the Rankoya project. Without the API URL the demo adapter answers.
- Profile save and password change are still toast-only (no backend endpoint yet).
- Rankoya's shell switcher still reads the UI mock workspaces; it should move to `useWorkspaceStore` when the real API is wired.
- Integration OAuth callbacks must point at `/integrations/:provider/select` once the backend exposes Rankoya's providers.

## Decisions and deviations (2026-10-07)

- **Plan names:** backend keys stay `free / professional / agency / reseller`; Rankoya shows them as Free / Growth / Agency / Enterprise (messages `account.plans`).
- **Prices:** Rankoya has no confirmed pricing, so `src/config/pricing.ts` is all `null` and the cards say "Price coming soon". Plan feature lists are a first draft for the owner to confirm.
- **Data reads** use React Query around the ported services (the project's lint rules forbid setState in effects); the service calls, payloads and handler order are unchanged.
- **Fixed deliberately:** reseller edit dialog now pre-fills and asks for a password confirmation (the source never pre-filled and sent an empty confirmation); locked-state "Upgrade" buttons go to `/upgrade` (quirk 2); White Label initial values are memoised so polling no longer resets the form; admin Statistics shows real counts instead of the source's placeholder numbers.
- **Marketing assets CTA** on the White Label tab opens `/agency` (Rankoya has no separate sales-kit page).
- **Popup errors:** the OAuth landing page sends the opener to `/upgrade` only when the error mentions upgrading; other errors are shown in the connect dialog.
- **BrandGate** renders no curtain on Rankoya's own host (decided on the server), so first paint is never held back.
- **Legal copy** lives in `src/content/legal.ts` (English is binding); refund windows and payment terms are copied unchanged and need legal review.
- **Company / contact:** NETSACH TECH LTD; product URLs and support emails are placeholders in `src/config/product.ts`.
