# Build the Rankoya MVP frontend (all screens)

You are building the frontend for an AI SEO + GEO (generative engine optimization) platform, working name **Rankoya** (placeholder). The app shows a brand where it ranks on Google and inside AI answers (ChatGPT, Claude, Gemini, Perplexity, Google AI Overviews), compares it with competitors, and lets an AI agent do the work to close the gap: it writes articles, fixes on-page SEO and publishes after approval. Users also talk to the same agent on Telegram. The backend is being built in parallel by another developer, so **every screen runs on MSW mocks first**. The deadline is Oct 30, 2026.

---

## How to treat the reference material below this prompt

Two kinds of images or code may be pasted under this prompt:

**A. Rankoya mockups (labelled `### MOCKUP: <screen>`)**

- They are **incomplete, early and in places unintelligible**: some screens are missing, some text is placeholder, some layouts are rough.
- Use them as a **starting reference to build on, not a spec to replicate**. Take the information hierarchy, the content and the intent; improve layout, spacing, states and responsiveness where you see a better solution.
- Where a mockup is unclear or missing, design the screen yourself from section 5 and the brand guide.
- **Order of authority:**
  1. this prompt's spec (tokens, components, copy, behavior)
  2. section 5's screen requirements
  3. the mockups
- Never copy inline styles or hard-coded values from mockups.

**B. Concept screenshots from our other products (labelled `### CONCEPT: <name>`)**

- These come from other apps we have built (for example a reviews tool and a live-streaming tool).
- They show **recurring patterns our products always have**: workspace switcher, language picker, credits and plan indicator, profile menu, settings tabs, team members, upgrade prompt, support entry point.
- **Keep the concept and the behavior, not the look.** Do not reproduce their branding, colors, logos, layout proportions, copy or icons. Build each pattern in Rankoya's own design language (section 3). Section 4b describes exactly what each pattern must do.

---

## 0. Before writing code

1. Read this whole prompt and every reference below it.
2. Run `/impeccable init` and give it the Brand guide (section 3) as design context.
3. Use the installed skills while you build:
   - `pick-ui-library` to confirm the component choices.
   - `emil-design-eng` and `design-taste-frontend` while building components.
   - `minimalist-ui` for the data screens.
   - `find-animation-opportunities` and `review-animations` for the motion pass.
   - `break-ui` on every finished screen to catch long names, empty data, 375 px widths, dark mode, right-to-left layout and long German strings.
4. Reply with a short build plan:
   - the phases from section 8 and the files you will create
   - which mockups are unclear or missing and how you will fill each gap
   - any conflict you found between the spec and the references

   Then start Phase 1 without waiting.

5. Run `npm prune` once (there are extraneous wasm packages).

## 1. Stack (already installed: Next 16.3, React 19.2, Tailwind 4.3, TypeScript 5.9)

```bash
npx shadcn@latest init
npx shadcn@latest add button input label textarea select checkbox switch radio-group tabs dialog sheet drawer dropdown-menu popover tooltip command badge avatar card separator skeleton table progress sonner chart calendar sidebar breadcrumb scroll-area toggle-group form alert-dialog
npm i lucide-react motion @tanstack/react-query @tanstack/react-table nuqs zustand react-hook-form zod @hookform/resolvers date-fns next-themes next-intl react-markdown remark-gfm @tiptap/react @tiptap/starter-kit @tiptap/pm openapi-fetch
npm i -D openapi-typescript msw @faker-js/faker prettier prettier-plugin-tailwindcss
```

- Load fonts with `next/font/google`: **Geist** and **Geist Mono**. For locales Geist doesn't cover, add `Noto Sans Arabic`, `Noto Sans SC` and `Noto Sans JP`, loaded only for those locales.
- Next 16 renamed `middleware.ts` to `proxy.ts`. Use `proxy.ts` for the auth redirect and locale detection, and check the installed Next docs in `node_modules/next` if anything is unclear.
- Use App Router Server Components for the first paint, and client components for filters, polling and forms.
- Restyle the shadcn components with our tokens. Do not ship the default shadcn look.

## 2. Structure and routing

```text
src/
  app/
    (auth)/sign-in, sign-up, forgot-password, verify
    (onboarding)/onboarding/[step]        brand | competitors | keywords | connect | scan
    (app)/
      workspaces/                         view all workspaces + create
      [brand]/
        overview/
        visibility/            visibility/prompts/[promptId]
        rankings/
        competitors/
        audit/                 audit/[issueId]
        actions/
        content/               content/[articleId]
        social/                (P1 stub)
        agent/
        reports/               (P1 stub)
        integrations/
        settings/              profile | security | workspace | team | brand | autopilot | notifications | api-keys | billing
    layout.tsx  globals.css  not-found.tsx  error.tsx
  components/
    ui/          shadcn primitives (restyled)
    brand/       logo, engine-icon, score-ring, delta-chip, owner-chip, status-badge
    charts/      visibility-trend, share-of-voice, rank-distribution, sparkline
    agent/       agent-panel, message, approval-card, task-row
    layout/      app-sidebar, topbar, context-switcher, language-switcher, theme-toggle,
                 credits-chip, profile-menu, notifications-popover, command-menu, onboarding-shell
  features/<module>/   hooks, table columns, zod schemas per module
  i18n/                request.ts, config.ts (locales, rtl list)
  messages/            en.json, es.json, fr.json, de.json, pt.json, ar.json, zh.json, ja.json
  lib/api/             openapi-fetch client, types, query-key factories
  lib/mocks/           msw handlers + faker fixtures
  styles/tokens.css
proxy.ts
```

**Hierarchy:** User → **Workspaces** (team, billing and credits live here) → **Brands** (the websites Rankoya optimizes) → screens.

- The active workspace is held in a cookie plus zustand, and every API call sends the `X-Workspace-Id` header.
- Brand routes stay `/[brand]/…`.

**Data-layer rules**

- Create one query-key factory per module, e.g. `visibilityKeys.byEngine(workspace, brand, range)`.
- Switching workspace clears the React Query cache and redirects to that workspace's last-used brand, or to onboarding if it has none.
- Long jobs (scans, agent tasks) poll `GET /jobs/:id` every 3 s and show real progress. Never show a frozen spinner.
- Put date range, engine filter and table filters in the URL with `nuqs`.
- Use `zustand` only for UI state: sidebar collapsed, active workspace, active brand, agent panel open.
- Every agent action that changes a live site goes through one `ApprovalCard` (Approve / Edit / Reject).
- MSW is enabled by `NEXT_PUBLIC_API_MOCKING=enabled`. The API base URL comes from `NEXT_PUBLIC_API_URL`.
- Mock data uses fictional entities:
  - workspaces "Northwind Team" and "Ada's Agency"
  - brand **Northwind Roasters** (northwindroasters.com, coffee subscriptions)
  - competitors **Bluebird Coffee**, **Halfmoon Roastery**, **Ember & Oak**
  - user **Ada Okafor** (Owner)

## 3. Brand guide: "Ink and Signal"

The interface is calm, dense and data-first, in cool neutrals and near-black ink, with one electric lime (**Signal**) reserved for the agent and for wins. Do not use purple gradients, glowing orbs, sparkle icons or emoji.

### Tokens (put in `globals.css`)

```css
@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-fg: var(--text);
  --color-fg-2: var(--text-2);
  --color-fg-3: var(--text-3);
  --color-ink: var(--ink);
  --color-ink-fg: var(--ink-fg);
  --color-signal: var(--signal);
  --color-signal-ink: var(--signal-ink);
  --color-blue: var(--blue);
  --color-success: var(--success);
  --color-success-bg: var(--success-bg);
  --color-warning: var(--warning);
  --color-warning-bg: var(--warning-bg);
  --color-danger: var(--danger);
  --color-danger-bg: var(--danger-bg);
  --color-chart-you: var(--chart-you);
  --color-chart-a: var(--chart-a);
  --color-chart-b: var(--chart-b);
  --color-chart-c: var(--chart-c);
  --color-chart-other: var(--chart-other);
  --color-chart-grid: var(--border);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
:root {
  color-scheme: light;
  --bg: #f6f7f9;
  --surface: #ffffff;
  --surface-2: #f0f2f5;
  --border: #e3e6eb;
  --border-strong: #cdd2da;
  --text: #0f1218;
  --text-2: #4a5260;
  --text-3: #6b7380;
  --ink: #0f1218;
  --ink-fg: #ffffff;
  --signal: #c5f04a;
  --signal-ink: #0f1218;
  --blue: #2d4fe0;
  --success: #0e7a55;
  --success-bg: #e6f4ee;
  --warning: #a35a00;
  --warning-bg: #fdf1e1;
  --danger: #c42b2b;
  --danger-bg: #fcebeb;
  --chart-you: #2d4fe0;
  --chart-a: #f08a24;
  --chart-b: #13a38b;
  --chart-c: #b54ac7;
  --chart-other: #8a94a6;
}
.dark {
  color-scheme: dark;
  --bg: #0b0d11;
  --surface: #12151b;
  --surface-2: #1a1e26;
  --border: #262b35;
  --border-strong: #353b47;
  --text: #f2f4f7;
  --text-2: #a9b0bc;
  --text-3: #7e8794;
  --ink: #f2f4f7;
  --ink-fg: #0f1218;
  --signal: #c5f04a;
  --signal-ink: #0f1218;
  --blue: #7c93ff;
  --success: #3dd39a;
  --success-bg: #0f2a20;
  --warning: #f5b54a;
  --warning-bg: #2e2210;
  --danger: #ff7a7a;
  --danger-bg: #2f1414;
  --chart-you: #7c93ff;
  --chart-a: #f5a04a;
  --chart-b: #2ec4a8;
  --chart-c: #cf6fe0;
  --chart-other: #7e8794;
}
```

**Color rules**

- Signal is **never** used as a text color. It is only a fill, with signal-ink text on top, in both themes.
- The primary button uses `bg-ink text-ink-fg`, so it inverts automatically in dark mode.
- The user's brand is always `chart-you` and drawn first and thickest in charts (2 px line vs 1.5 px).
- Deltas always show an arrow, a sign and a color: `▲ +12.3%` in success, `▼ −4.1%` in danger, `— 0.0%` in fg-3. For rank positions lower is better, so a move from #8 to #3 shows `▲ 5` in green.

### Typography

Geist for all UI. Geist Mono with `tabular-nums` for every compared number.

| Style      | Size / line height | Weight  | Tracking           | Use                                |
| ---------- | ------------------ | ------- | ------------------ | ---------------------------------- |
| Display    | 44/48              | 600     | −0.025em           | Auth and onboarding headlines only |
| H1         | 28/34              | 600     | −0.02em            | Page titles                        |
| H2         | 20/28              | 600     | −0.01em            | Section titles                     |
| H3         | 15/22              | 600     | 0                  | Card titles                        |
| Body       | 14/20              | 400     | 0                  | Default                            |
| Body large | 16/24              | 400     | 0                  | Agent messages, editor             |
| Small      | 13/18              | 400–500 | 0                  | Table cells, helper text           |
| Caption    | 12/16              | 500     | 0                  | Axes, timestamps                   |
| Overline   | 11/16              | 600     | +0.06em, uppercase | KPI labels, nav groups             |
| Metric XL  | 40/44 Mono         | 500     | −0.02em            | Hero KPI                           |
| Metric     | 22/28 Mono         | 500     | −0.01em            | KPI cards                          |
| Mono       | 13/20 Mono         | 400     | 0                  | Positions, URLs, keys              |

Add these as Tailwind utilities (`text-h1`, `text-overline`, `text-metric` …). Overline styling never uppercases non-Latin scripts and drops letter-spacing for `ar`, `zh` and `ja`.

### Spacing, layout and shape

- Use a 4 px grid. Allowed steps: 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.
- **Sidebar:** 248 px wide (64 px collapsed), nav items 36 px tall.
- **Top bar:** 56 px tall, sticky.
- **Content:** max width 1440 px, 32 px page padding (16 px under 768 px).
- **Gaps:** 16 px in dense dashboards, 24 px in forms.
- **Card:** 20 px padding, 12 px radius, 1 px border, shadow `0 1px 2px rgb(15 18 24 / .04)` (no shadow in dark mode).
- **Popover:** 8 px radius, shadow `0 8px 24px -4px rgb(15 18 24 / .12)`.
- **Modal/sheet:** 16 px radius, max 560 px wide.
- **Radius scale:** 4 badges · 8 buttons/inputs · 12 cards · 16 modals · 999 pills.
- **Tables:** 44 px rows (36 px compact), 36 px header.
- **Breakpoints:** Tailwind defaults. Every screen must work at **375 px** and **1440 px**. On mobile the sidebar becomes a sheet; wide tables scroll inside their own container.
- **Use logical properties everywhere** (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`) so right-to-left layouts mirror correctly. Never use `ml-`, `mr-`, `left-` or `right-` for layout.

### Motion

Motion explains change and never decorates.

- **Durations:** 120 ms for hover and press, 200 ms for menus, tabs and toasts, 320 ms for sheets and the agent panel.
- **Easing:** `--ease-out` for entering, `--ease-in-out` for moving on screen.
- **Press:** buttons scale to 0.97.
- **Data refresh:** KPI numbers tween for at most 400 ms.
- **Reduced motion:** respect `prefers-reduced-motion` everywhere.
- **Theme switching:** the change must not animate every element. Disable transitions during the swap.

### Icons and logo

- Lucide icons: 16 px inline, 18 px in nav, 1.5 px stroke.
- Directional icons (chevrons, arrows, send) flip in right-to-left layouts with `rtl:-scale-x-100`.
- AI engines sit in a 24 px neutral tile with a monogram (GPT, GEM, PPX, CLD, AIO) until official marks are added.
- Logo: a lowercase "rankoya" wordmark plus a ring mark whose dot is Signal.

### Voice

- Plain and specific: numbers first, then the meaning, then the action.
- Sentence case. No exclamation marks.
- The agent speaks as "Rankoya" in first person.
- Banned words: supercharge, unleash, revolutionize, magic, game-changer, seamless.

## 4. Core components (Phase 1, before any page)

**Buttons**

| Size         | Height | Padding x | Text   | Icon  |
| ------------ | ------ | --------- | ------ | ----- |
| sm           | 32 px  | 12 px     | 13/500 | 14 px |
| md (default) | 40 px  | 16 px     | 14/500 | 16 px |
| lg           | 48 px  | 20 px     | 15/600 | 18 px |

- Icon buttons are 32 or 40 px square and **must** have an `aria-label`. Radius is 8. Touch hit area is at least 44 px.
- **Variants:**
  - `primary`: ink fill, ink-fg text. One per view.
  - `secondary`: surface fill, border-strong.
  - `ghost`: transparent, fg-2.
  - `agent`: Signal fill, signal-ink text.
  - `destructive`: danger fill. Always behind an `alert-dialog` confirm.
  - `link`: blue text.
- **States:**
  - hover: fill darkens 6% (lightens in dark mode)
  - press: scale 0.97
  - focus: 2 px blue ring, offset 2 px
  - disabled: 40% opacity
  - loading: a spinner, width kept

**Inputs**

- Inputs are 40 px tall (48 px in onboarding), with a 1 px border-strong, 8 px radius and 12 px padding.
- Labels sit above at 13/500. Helper and error text sit below at 12 px. Errors show a border **and** a message.
- Read-only fields (email, role) use a surface-2 fill, fg-3 text and a lock icon.
- Domain inputs strip `https://` and trailing slashes as you type.

**Data display**

- **KpiCard:** overline, Metric value, DeltaChip, sparkline. Links to its detail screen.
- **ScoreRing:** 0–100. Color bands: 0–39 danger, 40–69 warning, 70–100 success.
- **DeltaChip, EngineChip, RankCell, OwnerChip:** OwnerChip shows "Rankoya" with a Signal fill or "You" with a blue tint.
- **StatusBadge:** Live, Published, Scheduled, Draft, Needs approval, Failed.
- **DataTable:** TanStack Table with a sticky header, right-aligned numbers, a column picker and CSV export.
- **EmptyState:** one line on what the screen shows, one line on how to fill it, one action. **Every data screen must handle a brand-new workspace with zero data** without showing broken "0.0" charts.
- **Skeleton:** for every data screen.

**Agent components**

- **AgentPanel:** a 400 px end-side sheet opened with ⌘J, using the same thread as `/agent` and Telegram.
- **Message, ApprovalCard, TaskRow.**

**Charts** (recharts via shadcn chart)

- Read every color from CSS variables so charts restyle on theme change without a re-mount.
- Grid lines use `chart-grid`. Tooltips list every series with its delta.
- Ranges are 7, 30 and 90 days, plus custom. Charts mirror correctly in right-to-left layouts.

## 4b. Shared app patterns (concepts from our other products: build them in Rankoya's style)

These appear in every app we ship. Implement the **behavior** described here. Do not copy the visuals from the concept screenshots.

1. **Workspace and brand switcher** (top bar, start side)
   - Shows a two-level control: `[workspace avatar] Northwind Team / Northwind Roasters ▾`. On mobile it shows only the brand.
   - **Workspace menu:**
     - a short header ("Switch workspace")
     - a list of workspaces with an initials avatar, the name, the user's role in muted text, and a check on the active one
     - a search field when there are more than 6
     - "View all workspaces" (goes to `/workspaces`)
     - "Create workspace" (a dialog asking for the name)
   - **Brand menu:** the same pattern for brands inside the active workspace, with "Add brand", which goes to onboarding.
   - Switching shows a toast ("Switched to …") and resets the cache (section 2).
2. **Credits and plan indicator** (top bar)
   - A compact chip showing remaining usage, e.g. `Credits 1,380` with a small meter. Its hover tooltip breaks usage down (scans, articles, prompts) and its click goes to `settings/billing`.
   - Turns warning-colored below 20% remaining and danger-colored at 0.
   - The plan name shows in the profile menu and in the sidebar footer.
   - Plan limits come from the API (mock: Growth plan). Never hard-code them.
3. **Language switcher** (top bar). Details in section 6.
4. **Theme toggle** (top bar icon button, and also in the profile menu). Details in section 6.
5. **Notifications** (bell with an unread dot)
   - The popover lists agent events, approvals waiting, finished scans and team invites.
   - Includes "Mark all as read" and links into the relevant screen.
6. **Profile menu** (avatar, end side of the top bar)
   - **Header:** avatar, full name, email, role badge.
   - **Items:** Profile settings · Credits and billing (shows the balance inline) · Team members · Help and support · Send feedback.
   - **Dark mode:** an inline switch.
   - **Language:** the current language, which opens the same picker.
   - **Sign out:** in danger text, separated by a divider.
   - Role-gated items (e.g. an admin console) render only for those roles.
   - Fully keyboard-navigable (shadcn dropdown).
7. **Sidebar footer**
   - A compact user card with the plan badge and a "Manage" link to billing.
   - An **Upgrade** button (agent-style secondary emphasis, not a loud full-width block) shown only on plans below the top tier.
   - The Telegram connection status.
8. **Settings tabs** (`/[brand]/settings/*`, sub-navigation as tabs on desktop and a select on mobile)
   - **Profile:**
     - photo upload with a square crop and size and type limits
     - full name
     - email (read-only, with a "Change email" flow)
     - role (read-only)
     - language and theme preferences
     - Save
   - **Security:** change password (current, new, confirm, with strength hints) and active sessions with "Sign out other sessions".
   - **Workspace:**
     - name, avatar, default language and timezone
     - leave workspace
     - delete workspace (owner only, type-the-name confirm)
   - **Team members:**
     - a table of members (avatar, name, email, role, joined, last active)
     - "Invite member" dialog (emails plus a role picker)
     - pending invites with Resend and Revoke
     - change role, remove member
     - roles: Owner, Admin, Member, Viewer; only Owner and Admin can manage members
   - **Brand profile, Autopilot, Notifications, API keys:** as in section 5.
   - **Billing and credits:** current plan card, usage meters, credit balance and top-up, invoices table, "Change plan".
9. **`/workspaces`:** a grid or list of all workspaces with member count, brand count, plan and role, plus Create, and Leave or Delete per role.
10. **Help and support**
    - Rankoya's agent is the main conversational surface, so **do not add a second floating chat bubble** that competes with ⌘J.
    - Support lives in the profile menu: "Help and support" opens a sheet with docs links and a "Submit a ticket" form, behind a `NEXT_PUBLIC_SUPPORT_WIDGET` flag for a third-party widget later.
    - "Send feedback" opens a small dialog: type (idea, bug, other) and a message.
11. **Sub-tabs on page headers:** data screens with several views use a tab row under the H1, synced to the URL with nuqs.

## 5. Screens (each is `page.tsx` + `loading.tsx` + an empty state + MSW handlers)

All copy goes through translation keys (section 6). The English strings are below; `[brackets]` are data.

| #   | Route                            | Headline · supporting line · primary action                                                                                                                               | Must include                                                                                                                                                                                                                                                                                           | API (mock it)                                                                             |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | /sign-in                         | "Welcome back" · "Sign in to see how your brand ranks today." · Sign in                                                                                                   | Form on one side, ink brand panel on the other ("Be the answer." plus a sample AI answer with the brand highlighted). Google SSO, forgot password. Language and theme pickers available before login                                                                                                   | POST /auth/login, /auth/google                                                            |
| 2   | /sign-up                         | "Be the answer" · "Track your brand in Google, ChatGPT, Claude, Gemini and Perplexity, and let an agent do the work." · Create account                                    | Same layout as sign-in; also creates the first workspace                                                                                                                                                                                                                                               | POST /auth/register                                                                       |
| 3   | /forgot-password, /verify        | —                                                                                                                                                                         | Single field; 6-digit code input                                                                                                                                                                                                                                                                       | POST /auth/reset, /auth/verify                                                            |
| 4   | /onboarding/brand                | "What are we growing?" · "Add your website and Rankoya will learn your brand, products and audience." · Continue                                                            | Domain input with crawl status; auto-filled, editable brand name, industry, market, **content language**, one-line description                                                                                                                                                                         | POST /brands, GET /brands/:id/profile                                                     |
| 5   | /onboarding/competitors          | "Who are you up against?" · "We found these from your search results. Keep up to 5." · Continue                                                                           | Suggested list with toggles; add by domain                                                                                                                                                                                                                                                             | GET …/competitor-suggestions                                                              |
| 6   | /onboarding/keywords             | "What should people find you for?" · "Pick the keywords and questions your customers ask. We suggested 20." · Continue                                                    | Keywords with volume and AI questions; select up to the plan limit; usage meter                                                                                                                                                                                                                        | GET …/keyword-suggestions, …/prompt-suggestions                                           |
| 7   | /onboarding/connect              | "Where should Rankoya work?" · "Connect Telegram to talk to Rankoya, and your site so it can publish." · Connect Telegram                                                     | Telegram deep link, QR code and code; WordPress; Search Console; autopilot mode (3 radio cards, "Ask me first" default)                                                                                                                                                                                | POST /integrations/telegram/link-token, /integrations/:type                               |
| 8   | /onboarding/scan                 | "Running your first scan" · "Asking 5 AI engines 20 questions about your market. This takes about 3 minutes." · Go to dashboard (disabled until done)                     | Per-engine progress from job polling; partial results                                                                                                                                                                                                                                                  | GET /jobs/:id                                                                             |
| 9   | /[brand]/overview                | "Good morning, [first name]" (time-of-day aware) · "Here's how [brand] showed up in Google and AI answers this month." · Run new scan                                     | Hero AI visibility ScoreRing with per-engine bars; 4 KpiCards; "Visibility vs competitors" line chart; Share of voice; Next best actions; "What Rankoya did" feed; zero-data state that points to the running or next scan                                                                               | GET /brands/:id/summary?range=                                                            |
| 10  | /[brand]/visibility              | "AI visibility" · "How often AI engines mention and cite you, and where you rank in their answers." · Add questions                                                       | Engine filter chips; 4 KPIs; By-engine table; Questions table (engine dots, rank, top competitor) linking to detail; "Sources AI engines cite"                                                                                                                                                         | GET /visibility, /visibility/prompts, /visibility/sources                                 |
| 11  | /[brand]/visibility/prompts/[id] | The question as H1 · tags · "Let Rankoya close this gap" (agent)                                                                                                            | Engine summary tiles; per-engine answer cards with the brand highlighted, position and citations; "Why you're missing" notes; Rankoya's plan with "Add to action plan"; history chart                                                                                                                    | GET /visibility/prompts/:id                                                               |
| 12  | /[brand]/rankings                | "Google rankings" · "Daily positions for [n] tracked keywords." · Add keywords                                                                                            | Desktop/Mobile toggle; stat strip; average-position chart (lower is better); distribution bars; keyword table with sparkline, volume, difficulty, URL and "In AI answers"; view tabs; CSV export                                                                                                       | GET /rankings?device=&range=                                                              |
| 13  | /[brand]/competitors             | "Competitors" · a one-line insight · Add competitor                                                                                                                       | Comparison table (your row highlighted); question gaps with "Write answer page"; keyword gaps with add-to-plan; "Where competitors get cited and linked" tagged **You need to do** plus "Draft all outreach emails"                                                                                    | GET /competitors/comparison, /gaps                                                        |
| 14  | /[brand]/audit                   | "Site audit" · "SEO and AI readiness for [domain]. [n] pages checked [time]." · Run audit + "Let Rankoya fix [n] issues"                                                    | SEO health and AI readiness rings; 6 category bars; severity tabs; issue rows with owner and "Let Rankoya fix" or "How to fix"                                                                                                                                                                           | GET /audit, POST /audit/run, POST /audit/issues/:id/fix                                   |
| 15  | /[brand]/actions                 | "Action plan" · "What to do next, ranked by impact. Rankoya handles its part; the rest is yours." · "Approve all [n] from Rankoya"                                            | 4 columns: Needs your approval / Rankoya is working on / You need to do / Done this week; cards with owner, area, impact, effort and actions; projected score                                                                                                                                            | GET /actions, PATCH /actions/:id                                                          |
| 16  | /[brand]/content                 | "Content" · "Your plan for [month]: [n] articles, [n] published, [n] waiting for you." · "Plan [next month]"                                                              | Calendar/List toggle; locale-aware month calendar (week start follows locale); status legend; "Waiting for you" panel                                                                                                                                                                                  | GET /content?month=, POST /content/plan                                                   |
| 17  | /[brand]/content/[id]            | Breadcrumb, status, "Written by Rankoya · [words] · saved [time]" · Reject / Ask Rankoya to revise / **Approve and schedule**                                                 | Tiptap editor with toolbar; "Short answer" callout; score panel with checklist; meta title with counter; URL; publish target; date; notify-on-Telegram checkbox; placeholders like [PRICE] block publishing. **The article's language is the brand's content language, separate from the UI language** | GET/PATCH /content/:id, POST /content/:id/publish                                         |
| 18  | /[brand]/agent                   | Rankoya thread · "Ask about rankings, competitors or content. Same conversation as Telegram." · Send                                                                        | Day dividers; message source ("from Telegram"); markdown tables; inline ApprovalCard; TaskRow; suggestion chips; composer; side panel with capabilities, Telegram status and open tasks; streamed replies (SSE stub)                                                                                   | GET /agent/threads/:id, POST /agent/messages                                              |
| 19  | /[brand]/integrations            | "Integrations" · "Connect where Rankoya reads your data and where it publishes. Rankoya only uses the access you give it."                                                    | Grouped cards: Talk to Rankoya / Publish / Data / Social; Connected, Not connected or Coming soon states                                                                                                                                                                                                 | GET /integrations, DELETE /integrations/:id                                               |
| 20  | /[brand]/settings/*              | See 4b.8; Autopilot: "How much should Rankoya do on its own?" · "You can change this anytime. Rankoya never touches your site without the access you give it." · Save changes | Autopilot radio cards, permission rows, guardrails; all other tabs per 4b.8                                                                                                                                                                                                                            | GET/PATCH /me, /workspaces/:id, /workspaces/:id/members, /brands/:id, /api-keys, /billing |
| 21  | /workspaces                      | "Workspaces" · "Switch between teams or create a new one." · Create workspace                                                                                             | See 4b.9                                                                                                                                                                                                                                                                                               | GET/POST /workspaces                                                                      |
| 22  | /[brand]/social                  | P1 stub                                                                                                                                                                   | EmptyState: "Social posting is coming soon."                                                                                                                                                                                                                                                           | —                                                                                         |
| 23  | /[brand]/reports                 | P1 stub                                                                                                                                                                   | EmptyState: "Weekly report goes to Telegram every Monday."                                                                                                                                                                                                                                             | —                                                                                         |

**Also build**

- The ⌘K command menu, which can also switch workspace, brand, language and theme.
- The ⌘J agent panel on every app screen.
- `not-found.tsx` and `error.tsx`.

**Shared copy**

- No data yet: "Nothing here yet. Your first scan finishes in about [n] minutes."
- Engine down: "We couldn't reach [engine] this time. We'll retry at [time]; other engines are up to date."
- Publish failed: "We couldn't publish to [site]. Check the WordPress connection, then retry."
- Generic error: "Something went wrong on our side. Try again, and if it keeps happening, tell us at [support email]."

## 6. Dark mode and translation (both are MVP, not polish)

### Dark mode

- Use `next-themes` with `attribute="class"`, `defaultTheme="system"` and `enableSystem`. The user can choose **Light, Dark or System**.
- **Controls:** a top bar icon button (sun/moon) toggles light and dark. The profile menu has a switch. Settings → Profile has the full three-way choice.
- **Persistence:** saved to the user profile via `PATCH /me` and to a cookie, so the server renders the right theme with no flash. Add `suppressHydrationWarning` on `<html>` and set `disableTransitionOnChange`.
- **Coverage:** every color comes from tokens, including:
  - charts
  - skeleton shimmer
  - focus rings
  - the Tiptap editor
  - scrollbars (via `color-scheme`)
  - the QR code (keep it dark on a light tile in both themes so it stays scannable)
  - images with a transparent background
- No hex values in components.
- **Accessibility:** every screen is checked in both themes for 4.5:1 text contrast. Dark mode drops card shadows and relies on borders.

### Translation (i18n)

- Use **next-intl** without locale URL prefixes, so routes stay `/[brand]/…`.
  - The locale comes from a cookie, then the user profile, then the `Accept-Language` header (resolved in `proxy.ts`), then `en`.
  - Load `i18n/request.ts` messages per request.
- **Launch locales:** `en` (complete, source of truth), `es`, `fr`, `de`, `pt`, `ar`, `zh`, `ja`.
  - Non-English files start as machine-drafted copies, marked with `"_status": "draft"`.
  - Missing keys fall back to `en` and log a dev warning.
- **No hard-coded UI strings.** Every visible string, `aria-label`, placeholder, toast, empty state and error goes through `useTranslations` / `getTranslations` with namespaced keys (`overview.hero.title`). Add a lint rule or script that fails on raw JSX text in `src/app` and `src/components`.
- **Plurals and variables** use ICU syntax (`{count, plural, one {# article} other {# articles}}`). Never build sentences by concatenating strings.
- **Formatting:** numbers, percentages, currency, dates, relative times ("2 min ago") and calendar week start all use next-intl formatters / `Intl` with the active locale. Mono numerals stay tabular.
- **Right-to-left:** for `ar`, set `<html dir="rtl" lang="ar">`.
  - Logical properties (section 3) make the layout mirror.
  - The sidebar moves to the right and the agent panel opens from the left.
  - Directional icons flip; charts keep time flowing in the reading direction.
  - Check every screen in RTL.
- **Text expansion:** design for strings up to 40% longer (German). Buttons and tabs must not clip, truncate with a tooltip where needed, and never set fixed widths on text containers.
- **Language switcher** (top bar, and also in the profile menu and on auth pages):
  - The trigger shows a short code and the native name ("EN · English").
  - The menu lists languages by **native name** with the English name muted beneath ("Deutsch / German"), a check on the active one, a search field and a scroll area.
  - Switching updates the cookie and `PATCH /me`, then refreshes without losing the current page or filters.
  - Don't use country flags for languages.
- **Two languages, kept separate:** the **UI language** (user preference) and the **brand content language** (what Rankoya writes and which market it tracks, set per brand in onboarding and brand settings) are different settings. Label both clearly.
- **Agent replies** come back in the user's UI language. Pass `locale` on agent API calls.

## 7. Quality bar (every screen must pass)

- `npm run build` and `npm run lint` pass with no errors and no `any` in feature code.
- Checked at **375 px and 1440 px**, in **light and dark**, in **English, German (long strings) and Arabic (RTL)**.
- Accessibility:
  - real `<button>`, `<a>`, `<label>` elements
  - visible focus rings
  - `aria-label` on icon buttons, translated
  - text contrast at least 4.5:1 in both themes
  - deltas never shown by color alone
- Loading skeleton, zero-data empty state and error state on every data screen.
- No hard-coded hex values, no hard-coded UI strings, no physical left/right spacing.
- Every number uses Mono with tabular figures and locale formatting.
- Run `break-ui` on the finished screen and fix what it finds.

## 8. Build order (commit after each phase with a clear message)

1. **Foundations:**
   - tokens and the dark theme
   - fonts
   - next-intl setup with `en` plus a draft `ar` (to prove RTL early)
   - all section 4 components
   - a `/dev/components` page showing every component in every state, in light/dark and LTR/RTL
   - MSW, API client and query keys

   **Stop and summarize for review.**

2. **Shell and shared patterns:** AppSidebar, Topbar, workspace and brand switcher, credits chip, language switcher, theme toggle, notifications, profile menu, CommandMenu, AgentPanel shell, `proxy.ts`, screens 1–3.
3. **Onboarding:** screens 4–8 with job polling.
4. **Insights:** screens 9–14.
5. **Agent and content:** screens 15–18.
6. **Workspace and settings:** screens 19–21 (all settings tabs, team members, billing, `/workspaces`), 22–23 stubs, 404/500, help and feedback.
7. **Polish:**
   - motion pass with the animation skills
   - full sweep in dark mode, RTL and German
   - draft translations for the remaining locales
   - smoke tests (vitest + Playwright) on sign-in → onboarding → approve article, switching workspace, and switching language and theme

At the end of each phase, report what you built, what you mocked, which mockup gaps you filled and how, and any assumption about the backend API so I can confirm it with the backend developer.

---

# REFERENCES

Rankoya mockups are labelled `### MOCKUP: <screen>`; incomplete, use as a starting point.
Concept screenshots from our other products are labelled `### CONCEPT: <pattern>`; take the behavior only, never the look.
