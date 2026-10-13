# Rankoya frontend v2: brand refresh, new overview, mock-free code

**Started:** 2026-10-06 · **Branch:** `feat/brand-v2` (based on `feat/rankoya-mvp`, PR #1)
**Reference:** [reference_image.png](reference_image.png) · **Previous spec:** [implementation_v1.md](implementation_v1.md) · **Handoff:** [session_handoff.md](session_handoff.md)

v1 still applies wherever this document doesn't change it: i18n, RTL, accessibility, logical properties, no hard-coded strings or hex values in components, one `ApprovalCard` for live-site changes, the 375 / 1440 px checks.

---

## 0. What changes and why

The product owner asked for four things:

1. **Brand colors from the reference image** become Rankoya's default palette. **Light mode is the default for every user** (not "system"). Dark mode stays available as an option.
2. **Sidebar layout from the reference:** a dark navy sidebar with the logo and tagline, a flat nav list with a filled blue active item, and an upgrade card at the bottom. **Our top bar layout stays as it is.**
3. **The overview matches the reference layout,** with the per-platform AI charts large and easy to see.
4. **No MSW or fake-API plumbing in the code.** Only UI mock data stays. After login, users go through the responsive **onboarding flow before the dashboard**.

### Things we deliberately do not copy

| Reference | Rankoya |
|---|---|
| Product name "SEO Pilot", rocket logo, "Rank Everywhere. Be Found." | Stays **Rankoya**: ring mark and wordmark, with a translated tagline "Be the answer." |
| Google, OpenAI, Anthropic, Perplexity and Gemini logos | **Logo files supplied by the product owner** (`src/assets/icons`) are used for Google, Google Maps, ChatGPT, Claude and Gemini; AI Overviews uses the Google mark. Perplexity has no file yet and keeps its monogram. |
| "Welcome back, John!" | "Welcome back, [first name]". Voice rule: no exclamation marks. |
| Google Maps card | **Kept**, as the product owner asked: it shows local visibility and reviews. AI Overviews stays on the AI visibility screen. |
| Nav items we have no screen for (Topics, Publishing) | Our existing routes, restyled in the reference's flat layout. |

---

## 1. Brand tokens ("Blue and Navy")

Sampled from the reference and adjusted to pass WCAG AA. The reference blue `#286FFE` gives 4.1:1 with white text, so the primary is darkened to `#2563EB` (5.2:1).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f5f8fd` | `#0b1220` | Page |
| `--surface` | `#ffffff` | `#111a2e` | Cards |
| `--surface-2` | `#eff3f9` | `#18233a` | Fills, table headers |
| `--border` | `#e3e9f2` | `#22304a` | Card borders |
| `--border-strong` | `#cbd5e3` | `#30405e` | Inputs |
| `--text` | `#0e1a33` | `#eef2f8` | Headings, body |
| `--text-2` | `#4b5a74` | `#a8b3c7` | Secondary |
| `--text-3` | `#64748b` | `#8492a8` | Muted (4.7:1 on white) |
| `--ink` | `#2563eb` | `#3b82f6` | **Primary buttons**, active states (white text) |
| `--ink-fg` | `#ffffff` | `#ffffff` | Text on primary |
| `--signal` | `#5b47f5` | `#7c6cff` | Agent and upgrade accent (was lime). White text. |
| `--signal-ink` | `#ffffff` | `#ffffff` | Text on signal |
| `--blue` | `#2563eb` | `#7aa2ff` | Links, "You" series |
| `--success` / `-bg` | `#15803d` / `#e8f7ee` | `#4ade80` / `#0f2a1c` | |
| `--warning` / `-bg` | `#b45309` / `#fdf3e3` | `#fbbf24` / `#2e2210` | |
| `--danger` / `-bg` | `#c42b2b` / `#fdecec` | `#ff7a7a` / `#2f1414` | |

**Sidebar tokens** (navy in both themes):

| Token | Value |
|---|---|
| `--sidebar-bg` | `#0f1b33` |
| `--sidebar-fg` | `#c9d2e3` |
| `--sidebar-muted` | `#8a97ae` |
| `--sidebar-hover` | `rgb(255 255 255 / 0.06)` |
| `--sidebar-active` | `#2563eb` (white text) |
| `--sidebar-border` | `#1f2c48` |

**Platform accents** (tile tint, sparkline stroke and area fill):

| Platform | Token | Light |
|---|---|---|
| Google Search | `--engine-google` | `#16a34a` |
| Google Maps | `--engine-maps` | `#1a73e8` |
| ChatGPT | `--engine-chatgpt` | `#8b5cf6` |
| Claude | `--engine-claude` | `#ea580c` |
| Gemini | `--engine-gemini` | `#3b82f6` |
| Perplexity | `--engine-perplexity` | `#0d9488` |

**Rules**

- `bg-ink text-ink-fg` stays the primary button. It is blue now.
- Signal (violet) is a fill with white text: the agent button, the upgrade CTA, "Rankoya" owner chips, Rankoya's avatar.
- The "You" series is still `chart-you`, now blue. Competitor colors don't change.
- **Default theme:** `defaultTheme="light"`. "System" and "Dark" stay available in the toggle, the profile menu and ⌘K.

---

## 2. Sidebar (reference layout)

- Navy panel, 248 px wide (64 px collapsed), full height and sticky. RTL puts it on the right.
- **Top:** Rankoya mark and wordmark in white, with the tagline "Be the answer." under it in `--sidebar-muted`. Collapse button beside it.
- **Nav:** one flat list. No group headers when expanded. Items are 44 px tall (spec allows ≥36), with 18 px icons. Active item: `bg-sidebar-active` filled, white text, 8 px radius. Hover: `bg-sidebar-hover`.
  - Order: Overview, AI visibility, Rankings, Competitors, Site audit, Action plan, Content, Ask Rankoya, Social (Soon), Integrations, Reports, Settings.
- **Bottom:** an "Upgrade to Pro" card on a slightly lighter navy: star icon, heading, one line, and a full-width violet "View plans" button. Shown only below the top tier. Under it, a compact user row with the Telegram status dot.
- **Mobile:** the same panel inside the start-side sheet.

## 3. Top bar

No layout change: the switcher, ⌘K search, credits, language, theme, notifications, Ask Rankoya and the profile menu stay. Only the colors change (white surface, new border, violet Ask Rankoya button).

## 4. Overview (reference layout)

**Desktop (≥1280 px):** main column plus a 300 px right rail.

1. **Header row:**
   - Start: H1 "Welcome back, [first name]" and the supporting line "Here's how [brand] is performing across search and AI platforms."
   - End: promo banner (light blue tint): icon, "Get the most out of Rankoya", one line, primary "Add website".
   - Range picker and Run new scan sit in a toolbar row under the header.
2. **Getting started** card: title and helper on the start side, a 6-step stepper on the end side (Connect website → Analyze website → Discover opportunities → Optimize → Publish → Measure). Steps are numbered circles joined by arrows; the current step is a filled blue circle and completed steps show a check. It hides when every step is done, and can be dismissed.
3. **Your visibility at a glance:** title, helper and a "View detailed report" link, then **6 large platform cards** in a responsive grid (6 → 3 → 2 → 1 columns). Each card has:
   - an accent tile with the monogram
   - the platform name and what it measures ("Organic rankings and visibility", "AI recommendations", "AI search visibility")
   - a big percentage (`text-metric-xl`) and a delta
   - "vs. last 30 days"
   - a **colored area sparkline** in the platform accent, 56 px tall with a soft gradient fill
   - a link to the matching detail screen
4. **Lower main row:**
   - "Add another website": URL, business name, business type, country, city, a website-platform picker (WordPress, Shopify, Wix, Webflow, Next.js, Ghost, Other) and an "Add website" primary button. This starts onboarding for the new brand.
   - "From setup to growth in 6 simple steps": colored numbered steps with one line each.
5. **Visibility vs competitors** line chart and **Share of voice** stay below, as before.
6. **Right rail:** Quick actions (Add website, View opportunities, Check content plan, Run site audit; each is an icon tile, title and one line), Need help (avatar, copy, "Contact support" opens the help sheet), Recent activity (icon, title, subtitle, relative time, "View all activity").

**Mobile and tablet:** everything stacks. The right rail moves under the main column, the stepper scrolls horizontally, and the platform cards take 2 columns from 640 px and 1 below.

**Zero-data brand:** the platform cards show "—" and an empty sparkline track instead of 0%, and Getting started points at the running scan.

## 5. Remove MSW and fake-API plumbing

**Delete:**
- `msw`, `openapi-fetch`, `openapi-typescript` from package.json
- `public/mockServiceWorker.js`
- `src/instrumentation.ts`
- `src/lib/mocks/{browser,node,handlers}.ts`
- `src/lib/api/{client,openapi.yaml,schema.d.ts}`
- the `api:types` script
- `NEXT_PUBLIC_API_MOCKING` and `NEXT_PUBLIC_API_URL`

**Keep or move:**
- Types become hand-written in `src/lib/api/types.ts` (no generated schema).
- UI mock data lives in `src/lib/mocks/*` (fixtures, jobs, ui-data). It is read through `useFakeQuery` / React Query, so loading states still show.
- In-memory UI state (me, workspaces, notifications, agent thread, approvals) lives in a small mock store, `src/lib/mocks/store.ts`.
- `useJob` polls the local job fixture every 3 s. The scan shortens to about 45 s so the onboarding demo stays watchable.
- `/dev/components` is available in development builds only (`NODE_ENV !== "production"`).

The app then runs with **no environment variables**. This also fixes the endless skeletons on Vercel.

## 6. Login → onboarding → dashboard

- Sign-in, Google sign-in and verify (sign-up) all land on `/onboarding/brand`. Every login runs the full onboarding flow before the dashboard.
- The last step ("Go to dashboard") opens `/[brand]/overview`. "Save and exit" also goes to the dashboard.
- Onboarding gets the new palette and a responsive pass at 375 / 768 / 1440 px.
- `?next=` deep links (e.g. from a notification email) still win over onboarding.

## 7. Quality bar

Same as v1 §7:
- build, lint and typecheck pass; no `any`
- 375 and 1440 px, light and dark, en and ar
- AA contrast
- no hard-coded hex values outside tokens
- no raw strings

---

## 8. Checklist

### A. Docs and branch
- [x] `implementation_v2.md` (this file)
- [x] Session handoff updated with the v2 plan
- [x] Branch `feat/brand-v2`

### B. Brand tokens
- [x] Light palette in `globals.css` (§1)
- [x] Dark palette (navy)
- [x] Sidebar tokens
- [x] Platform accent tokens
- [x] Signal becomes violet with white text; owner chip, Rankoya avatar, agent button and logo dot follow
- [x] `defaultTheme="light"` (no "system" default); server render and `themeColor` follow
- [x] Skeleton, focus ring and scrollbars checked in both themes

### C. Sidebar
- [x] Navy panel, logo and tagline, flat nav, filled active item
- [x] Collapsed 64 px state with tooltips
- [x] Upgrade card (below the top tier only) and user row with the Telegram dot
- [x] Mobile sheet uses the navy panel; RTL mirrors

### D. Overview
- [x] Header and promo banner
- [x] Getting-started stepper (dismissible, scrolls on mobile)
- [x] 6 platform cards with accent tiles and area sparklines
- [x] Add-another-website form and the 6-step explainer
- [x] Right rail: quick actions, need help, recent activity
- [x] Trend and share of voice kept below
- [x] Zero-data and loading states
- [x] Responsive at 375 / 768 / 1280 / 1440 px

### E. Remove MSW and fake-API plumbing
- [x] Hand-written types
- [x] Local mock store replaces every `api.*` call (me, workspaces, brands, usage, summary, notifications, agent thread, send message, approvals, jobs)
- [x] Delete MSW, openapi files, instrumentation and the worker; remove the deps and script
- [x] Gallery gated to development
- [x] `.env.example` trimmed; the app runs with no env vars

### F. Login → onboarding
- [x] Sign-in, Google and verify land on `/onboarding/brand` (unless `?next=`)
- [x] Scan shortened to about 45 s
- [x] Onboarding restyled and checked at 375 / 768 / 1440 px

### G. Verify
- [x] typecheck, lint, build
- [x] Screenshots: sign-in, onboarding steps, overview, two other screens; light and dark; en and ar; 375 and 1440 px
- [x] Handoff updated with the results

### Follow-up (2026-10-06)
- [x] Logos from `src/assets/icons` are trimmed into 128 px copies in `src/assets/icons/platforms/` (5–19 KB each; the originals are untouched) and rendered through `PlatformLogo` / `EngineIcon`
- [x] Google Maps replaces AI Overviews in "Your visibility at a glance"
- [ ] Perplexity logo: add a file to `src/assets/icons` and map it in `platform-logo.tsx`

### Notes from the build

- The platform-card grid and the two-column rows use **container queries** (`@container`). Their width depends on the sidebar and the rail, not the viewport, so they show 6 cards across at 1440 px with the sidebar open and drop to 3, 2 and 1 as space shrinks.
- The sidebar uses the `dark` class to scope dark-surface tokens to the navy panel, so nested controls (ghost buttons, badges, the upgrade button) read correctly in both themes.
- The scan now finishes in about 45 s (AI Overviews still "fails" to show the engine-down state).
- `.env.local` on the dev machine still lists the old `NEXT_PUBLIC_API_*` variables. Nothing reads them, so they can be deleted.
- Arabic strings were added for the new sidebar and overview. Older Phase 4–5 screens still fall back to English (Phase 7).
