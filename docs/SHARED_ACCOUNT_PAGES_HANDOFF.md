# Netsach Shared Account Pages — Replication Handoff

**Source app:** Flowcasta (`flowcasta` repo, branch `dev-branch` @ `a6a3817`) · **Generated:** 2026-10-07

This doc holds everything needed to recreate the **shared account pages** in a new Netsach product. The new app uses the **same backend, routes and types**:

| # | Area | What it covers |
|---|------|----------------|
| 1 | **Settings shell** | The tabbed settings page: Profile · Workspaces · Subscriptions · Team Members |
| 2 | **Workspaces** | List, create, edit, activate, delete; the workspace details page |
| 3 | **Team Members** | List, add, edit (incl. password), delete, assign to workspaces |
| 4 | **Subscriptions** | Active plan + add-ons, cancel renewal, the Upgrade/pricing page (Paddle) |
| 5 | **White Label (the "Site" page)** | Configure white label (custom domain + branding), DNS records, verification polling, domain details/delete, runtime tenant branding |
| 6 | **Reseller** | Reseller console: stats, add/edit/delete reseller accounts |
| 7 | **Agency** | Agency resource library (templates, sales kits) |
| 8 | **Admin** | Admin console: user management, credits, licences, statistics, email marketing |
| 9 | **Integrations** | Social channel catalogue, OAuth popup + manual (stream key) connect, channel details, delete/unlink |
| 10 | **Legal pages** | Privacy Policy, Terms of Service, Refund Policy + the shared legal shell (copy to update for the new product) |

Every code block is copied **verbatim** from the repo, except three files marked *trimmed* (cut down to the functions these pages use) and one *stub*. The full set was type-checked in isolation (`tsc --strict`, 0 errors), so nothing outside this doc is required.

---

## ⚠️ 0. Replication rule — read this first

> **Copy the flow and logic exactly. Rebuild the UI in the new app's design language.**

### Keep exactly as written (do not "improve" without backend sign-off)
- **Service functions:** endpoint paths, HTTP methods, payload field names, multipart vs JSON, response handling. Backend typos are real routes: `/cancle/subscription`, `/upload-loacal-image`. Do not fix them.
- **Types:** the field names and shapes in §5.
- **State flows and ordering:** e.g. White Label save = *register domain with Vercel first → then persist to backend → then redirect to `/workspaces/:id?dns=:domainId`*. Domain delete = *remove from Vercel first → then backend*.
- **Validation rules:** required fields, password match, "assign at least one workspace", password strength (≥8 chars, upper, digit, symbol).
- **Gating:** role checks, plan/add-on checks, proxy redirects, the "error mentions *upgrade* → push to `/upgrade`" behaviour.
- **URL contracts:** `/settings?tab=profile|workspaces|subscriptions|team-members`, `?workspaceModal=create`, `/workspaces/:id?dns=:id`, `/integrations/:channel/select?workspace_id=&error=`, the `postMessage` type `flowcasta:integration-connected` *(rename the prefix for the new product, but keep it the same on both sides)*.
- **Optimistic and polling behaviour:** the optimistic renewal-cancel state, the 5-second DNS verification poll, the OAuth popup close-poll.

### Rebuild in the new app's design system
Recreate every visual part with the **new app's tokens and components**, not Flowcasta's:
- **Colour scheme:** map every `var(--…)` in §3 to the new palette. Do not copy the Flowcasta orange `#dd4c25`.
- **Typography:** the new font families, type scale and weights. `font-display` becomes the new heading style.
- **Spacing and layout structure:** the new grid, gutters, section padding and card density. Flowcasta's `px-6 py-7`, `p-5`, `gap-3` are references, not requirements.
- **Radius, elevation, motion:** the new app's equivalents.
- **Language and copy:** the new product's name, voice and terminology. Replace "Flowcasta", tour copy, demo video links, help-centre URLs and the `flowcasta:` storage/event prefixes.
- **Primitives:** if the new app already has Button / Modal / Input / Select / Tabs / Badge / Card, use those and keep the **props contract** used here (§7). Otherwise port §7 and re-skin it.
- **Icons:** `lucide-react` names are listed in each file. Swap them for the new icon set if it differs.

**Rule of thumb:** a reviewer should be able to diff the new app's `services/`, `types/`, `stores/`, `lib/` and the handler functions inside each page against this doc and find **no behavioural differences**. Only JSX markup and class names should differ.

---

## 1. File map (keep the same paths in the new app)

```
app/
  admin/page.tsx                        → redirects to /admin/user-management
  admin/loading.tsx
  admin/(dashboard)/layout.tsx          → AdminDashboardShell
  admin/(dashboard)/loading.tsx
  admin/(dashboard)/user-management/page.tsx
  admin/(dashboard)/statistics/page.tsx
  admin/(dashboard)/marketing/page.tsx
  (dashboard)/settings/layout.tsx + page.tsx      ← Settings shell (4 tabs)
  (dashboard)/workspaces/[id]/page.tsx            ← Workspace details + White Label domains ("Site" page)
  (dashboard)/upgrade/page.tsx                    ← Plans & add-ons (Paddle)
  (dashboard)/resellers/layout.tsx + page.tsx
  (dashboard)/agency/page.tsx
  (dashboard)/channels/page.tsx                   ← Integrations catalogue
  (dashboard)/channels/[channel]/page.tsx         ← Connected accounts for one platform
  integrations/[channel]/select/page.tsx          ← OAuth popup landing page (outside dashboard shell)
  privacy-policy/page.tsx                         ← public legal pages (LegalPageShell)
  terms-of-service/page.tsx
  refund-policy/page.tsx
  api/custom-domains/route.ts                     ← Next route: add domain to Vercel
  api/custom-domains/[domain]/route.ts            ← Next route: Vercel domain status / remove
  api/custom-domains/[domain]/config/route.ts     ← Next route: Vercel DNS config check
components/
  admin/**                    modals/**            channels/**
  providers/BrandProvider.tsx providers/BrandGate.tsx
  marketing-assets/useWhiteLabelAccess.ts         demo/WatchDemoButton.tsx
  legal/LegalPageShell.tsx    layout/FullLogo.tsx
  ui/{Button,Modal,Input,Switch,Select,Badge,Card,Tabs,Tooltip,Avatar,Toaster,PageSkeletons}.tsx
  motion/StaggerList.tsx
services/  api/api.ts Admin Credits EmailMarketing Reseller Teammember Worskpaces(sic)
           Subscriptions CustomDomain Channels Upload(trimmed) Projects(trimmed)
stores/    workspace-store.ts
lib/       auth-session utils toast animations plan-core plan subscription white-label-access
           profile-image paddle paddle-config destinations channelConnectAccess
           constants(excerpt) tours(stub)
config/    brand.ts
providers/ PaddleProvider.tsx
types/     types.ts (subset)
proxy.ts   (Next 16 middleware: auth + admin + white-label gating)
```

> **Next.js 16 note:** Flowcasta runs `next@16.2.4`, where middleware lives in **`proxy.ts`** (not `middleware.ts`). Route `params` in route handlers are async (`await params`). If the new app is on a different Next major, check `node_modules/next/dist/docs/` before porting `proxy.ts` and `app/api/**`.

### Layout dependencies outside this doc
- Pages use Tailwind v4 **container queries** named `app` (`@3xl/app:grid-cols-2`, `@5xl/app:`, `@7xl/app:`). The dashboard layout must wrap page content in `<div className="@container/app">`, or you can swap these for the new app's breakpoints.
- `app/layout.tsx` order: `ThemeProvider(next-themes, class) → BrandProvider → BrandGate → children + <Toaster/>`.
- `app/(dashboard)/layout.tsx` wraps the dashboard in `<PaddleProvider>`.
- Sidebar entries used by these pages (from `NAV_ITEMS`): `/channels` "Channels", `/resellers` "Resellers", `/agency` "Agency". Settings and Upgrade are reached from the top bar / profile menu.

---

## 2. Dependencies & environment

### npm packages used by this code
```bash
npm i axios cookies-next zustand clsx tailwind-merge framer-motion lucide-react react-hot-toast \
  @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-switch \
  @radix-ui/react-tooltip @radix-ui/react-avatar @radix-ui/react-dropdown-menu \
  @paddle/paddle-js next-themes quill
# quill → only the admin email-marketing editor
```

### Environment variables
| Variable | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `services/api/api.ts`, `lib/white-label-access.ts` | Backend base URL (same backend as Flowcasta) |
| `NEXT_PUBLIC_APP_HOST` | `config/brand.ts` | The new app's own (vendor) host. Used to tell "our host" from tenant domains. Falls back to `studio.flowcasta.com`, so **set it for the new app** |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | `app/api/custom-domains/**` (server only) | Add, check and remove white-label domains on the **new app's** Vercel project |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | `lib/paddle.ts` | Paddle.js init |
| `NEXT_PUBLIC_PADDLE_{PROFESSIONAL,AGENCY,RESELLER}_PLAN_{MONTHLY,ANNUALLY}` | `lib/paddle-config.ts` | Plan price IDs |
| `NEXT_PUBLIC_PADDLE_REMOVE_BRANDING_LIFETIME`, `NEXT_PUBLIC_PADDLE_WHITELABEL_{STARTER,PRO,UNLIMITED}` | `lib/paddle-config.ts` | Add-on price IDs |

### Static assets to copy from `public/`
- `public/channels/`: `youtube1.png`, `facebook1.svg`, `linkedin.svg`, `twitch_logo.png`, `kick.jpeg`, `rtmp-instagram-logo.png`, `tiktok.png` (live integrations). Copy the rest of the folder too if you re-enable commented-out platforms.
- `public/agency/`: every banner/card image plus `flowcasta_agency_template.zip` (rebrand the zip for the new product).
- Default login carousel images referenced in `config/brand.ts` (`DEFAULT_LOGIN_CAROUSEL`).
- Product logos used by `FullLogo`: `public/assets/flowcasta_new_logo_dark_nobg.png` and `_light_nobg.png` (replace with the new product's logos).

---

## 3. Design-token contract (map these to the new app)

Flowcasta components style only through these CSS variables. Fill in the right-hand column with the new app's token and do a project-wide replace, or alias the old names to the new tokens in `globals.css`. **White Label depends on this:** `BrandProvider` overrides `--brand*` (and background/text/button) at runtime on a reseller's domain, so the new app's brand colour **must flow through CSS variables**, not hard-coded hex.

| Flowcasta token | Flowcasta value (dark) | Role | → New app token |
|---|---|---|---|
| `--brand` | #dd4c25 | Primary accent: CTAs, active states, focus rings, links | |
| `--brand-hover` | #c73f1c | Hover state of primary CTAs | |
| `--brand-alt` | (gradient pair) | Second stop of avatar/initial gradients | |
| `--brand-muted` | rgba(221,76,37,.14) | Tinted brand background (selected chips, hover wash) | |
| `--brand-wash / --brand-faint` | 8% / 15% brand | Very light brand tints | |
| `--brand-border` | 30% brand | Brand-coloured borders | |
| `--brand-glow` | 28% brand | Glow shadows | |
| `--bg / --bg-secondary` | #0a0a09 / #111110 | Page backgrounds | |
| `--surface` | #141413 | Cards, modals | |
| `--surface-raised` | #1c1c1a | Sections, inputs, table headers | |
| `--surface-overlay` | #242422 | Popovers, dropdowns | |
| `--surface-hover` | (hover fill) | Row/button hover | |
| `--border / --border-subtle / --border-strong / --border-hover` | #272725 / #1e1e1c / #333331 | Hairlines, dividers | |
| `--text-primary` | #f2f2ef | Headings, body | |
| `--text-secondary` | #a8a8a2 | Supporting copy | |
| `--text-muted` | #5c5c58 | Labels, captions, placeholders | |
| `--success / --success-muted` | #22c55e | Active / connected / verified badges | |
| `--warning / --warning-muted` | #f59e0b | Pending / renewal-cancelled badges | |
| `--danger / --danger-muted / --danger-hover` | #ef4444 | Destructive actions, errors | |
| `--info / --info-muted` | #3b82f6 | Informational callouts | |
| `--gradient-brand / --gradient-hero` | brand gradients | Hero banners, upgrade cards | |
| `--radius-sm / -md / -lg / -xl / -full` | 6 / 10 / 14 / 20 / 9999px | Corner radii | |
| `--shadow-sm / -md / -lg / -xl / --shadow-brand(-sm)` |  | Elevation | |
| `--ease-smooth` | cubic-bezier(.4,0,.2,1) | Transitions | |
| `font-display (class) → --font-display` | next/font variable | Display font for headings (`font-display` utility) | |

Runtime-overridable white-label tokens (set inline by `BrandProvider`): `--brand`, `--brand-hover`, `--brand-muted`, `--brand-wash`, `--brand-faint`, `--brand-border`, `--brand-border-strong`, `--brand-glow`, `--brand-secondary`, `--brand-background`, `--brand-text`, `--brand-button`, `--brand-button-text`. Keep these names (or their equivalents) so tenant branding keeps working.

Flowcasta's raw palette blocks (`:root`, `.dark`, `.light`) for reference. **Do not copy the values**, only the variable set:

```css
:root {
  --brand: #dd4c25;
  --brand-hover: #c73f1c;
  --brand-light: #f26640;
  --brand-dim: #b83d1e;
  --brand-muted: rgba(221, 76, 37, 0.14);
  --brand-glow: rgba(221, 76, 37, 0.28);
  --brand-glow-lg: rgba(221, 76, 37, 0.18);

  /* Translucent brand edges. Components must use these instead of writing the
     brand hue as a literal rgba(), or a reseller's palette can't reach them —
     BrandProvider overrides tokens, not hardcoded colors. */
  --brand-wash: rgba(221, 76, 37, 0.08);
  --brand-faint: rgba(221, 76, 37, 0.15);
  --brand-border: rgba(221, 76, 37, 0.3);
  --brand-border-strong: rgba(221, 76, 37, 0.4);

  /* White-label surface. BrandProvider overrides these inline on a reseller's
     custom domain; on the Flowcasta host they resolve to the stock palette. */
  --brand-secondary: #1a1a1a;
  --brand-background: var(--bg);
  --brand-text: var(--text-primary);
  --brand-button: var(--brand);
  --brand-button-text: #ffffff;

  --bg: #0a0a09;
  --bg-secondary: #111110;
  --bg-tertiary: #171715;
  --surface: #141413;
  --surface-raised: #1c1c1a;
  --surface-overlay: #242422;
  --border: #272725;
  --border-subtle: #1e1e1c;
  --border-strong: #333331;

  --text-primary: #f2f2ef;
  --text-secondary: #a8a8a2;
  --text-muted: #5c5c58;
  --text-inverse: #0a0a09;

  --success: #22c55e;
  --success-muted: rgba(34, 197, 94, 0.12);
  --warning: #f59e0b;
  --warning-muted: rgba(245, 158, 11, 0.12);
  --danger: #ef4444;
  --danger-muted: rgba(239, 68, 68, 0.12);
  --info: #3b82f6;
  --info-muted: rgba(59, 130, 246, 0.12);

  --gradient-brand: linear-gradient(135deg, #dd4c25 0%, #b83d1e 100%);
  --gradient-brand-glow: linear-gradient(
    135deg,
    rgba(221, 76, 37, 0.9) 0%,
    rgba(184, 61, 30, 0.7) 100%
  );
  --gradient-surface: linear-gradient(180deg, #1c1c1a 0%, #141413 100%);
  --gradient-hero: linear-gradient(
    135deg,
    #1a0f0b 0%,
    #0a0a09 50%,
    #111008 100%
  );
  --gradient-clips-hero: linear-gradient(
    135deg,
    #1e0d20 0%,
    #0d0a1a 40%,
    #0a0a09 100%
  );

  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-2xl: 28px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.6);
  --shadow-brand: 0 0 24px var(--brand-glow), 0 0 8px var(--brand-muted);
  --shadow-brand-sm: 0 0 12px var(--brand-muted);

  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 350ms;
}

.dark {
  /* Backgrounds */
  --bg: #0a0a09;
  --bg-secondary: #111110;
  --bg-tertiary: #171715;
  --surface: #141413;
  --surface-raised: #1c1c1a;
  --surface-overlay: #242422;

  /* Borders */
  --border: #272725;
  --border-subtle: #1e1e1c;
  --border-strong: #333331;

  /* Text */
  --text-primary: #f2f2ef;
  --text-secondary: #a8a8a2;
  --text-muted: #5c5c58;
  --text-inverse: #0a0a09;

  /* Gradients */
  --gradient-surface: linear-gradient(180deg, #1c1c1a 0%, #141413 100%);
  --gradient-hero: linear-gradient(
    135deg,
    #1a0f0b 0%,
    #0a0a09 50%,
    #111008 100%
  );
  --gradient-clips-hero: linear-gradient(
    135deg,
    #1e0d20 0%,
    #0d0a1a 40%,
    #0a0a09 100%
  );

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.6);
  --shadow-brand: 0 0 24px var(--brand-glow), 0 0 8px var(--brand-muted);
  --shadow-brand-sm: 0 0 12px var(--brand-muted);

  /* Semantic state — muted overlays */
  --success-muted: rgba(34, 197, 94, 0.12);
  --warning-muted: rgba(245, 158, 11, 0.12);
  --danger-muted: rgba(239, 68, 68, 0.12);
  --info-muted: rgba(59, 130, 246, 0.12);
}

.light {
  --bg: #fafaf8;
  --bg-secondary: #f4f4f1;
  --bg-tertiary: #ededea;
  --surface: #ffffff;
  --surface-raised: #f9f9f7;
  --surface-overlay: #ffffff;
  --border: #e8e8e4;
  --border-subtle: #f0f0ec;
  --border-strong: #d4d4ce;
  --text-primary: #1a1a17;
  --text-secondary: #5c5c58;
  --text-muted: #a0a09a;
  --text-inverse: #f2f2ef;
  --gradient-hero: linear-gradient(
    135deg,
    #fff5f2 0%,
    #fafaf8 50%,
    #f8f8f4 100%
  );
  --gradient-clips-hero: linear-gradient(
    135deg,
    #f5f0ff 0%,
    #fdf8ff 40%,
    #fafaf8 100%
  );
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

---

## 4. Architecture & cross-cutting rules

### API client & auth
- One axios instance (`services/api/api.ts`) with `baseURL = NEXT_PUBLIC_API_BASE_URL`. It attaches `Authorization: Bearer <authToken cookie>`.
- Session = two cookies written by `lib/auth-session.ts`: `authToken` and `authUser` (JSON `SessionUser`: role, active workspace, **subscriptions**). Pages read `getSessionUserFromCookie()` once on mount. When the cookie is rewritten, `SESSION_UPDATED_EVENT` fires.
- All services follow the same shape: `async (payload) => { try { const r = await api.<verb><T>(path, payload); return r.data } catch (e) { throw e } }`. Pages catch errors and show `toast.error(getErrorMessage(err, fallback))`.
- **Upgrade redirect convention:** in Workspaces and Team Members, if the error message contains "upgrade", the page also does `router.push("/upgrade")`. The backend uses this to signal plan limits.

### Roles, plans & gating
| Gate | Rule | Where enforced |
|---|---|---|
| `/admin/**` | `authUser.role === "admin"` | `proxy.ts` (redirect → `/home`) |
| `/resellers` | role `admin`/`super_admin` **or** `subscriptions.subscription.name === "reseller"` (Enterprise) | in page (shows locked state) |
| `/agency` | role `admin`/`super_admin` **or** active subscription named `agency` or `reseller` | in page |
| White Label (configure/domains) | `hasWhiteLabel(subscriptions)` → add-on `reseller_seats.status`. Without it, `WhiteLabelUpgradeModal` opens instead | settings page, workspace page. `proxy.ts` + server check `fetchWhiteLabelAccess` for `/marketing-assets` |
| Integrations connect buttons | `member`/`team_member` → manual only, `reviewer` → OAuth only, others → both. Per-platform overrides apply | `lib/channelConnectAccess.ts` |
| Plans | `PlanName = "free" \| "professional" \| "agency" \| "reseller"`; `getActivePlan(subscriptions)` | `lib/plan-core.ts` |
| Real add-ons | only `remove_branding` and `reseller_seats` (shown as "White Label"); legacy keys ignored | `lib/subscription.ts` |

> Cookie checks are **UX gates, not security**. The backend must authorise every endpoint. Keep the same split in the new app.

### Backend endpoint index (same backend, same routes)
| Area | Method & path | Service fn |
|---|---|---|
| Workspaces | `GET /workspace` | `getAllWorkspaces` |
| | `POST /workspace/store` (multipart: name, slug, is_default, logo?) | `createWorkspace` |
| | `POST /workspace/update` | `updateWorkspace` |
| | `POST /workspaces/:id` (activate) | `activateWorkspace` |
| | `POST /workspace/delete` | `deleteWorkspace` |
| Team | `GET /team` → `{ users, workspaces }` | `getAllTeamMembers` |
| | `POST /team/add` · `POST /team/update` · `POST /team/update/password` · `DELETE /team/delete` (body) | add/update/updatePassword/delete |
| Subscriptions | `POST /cancle/subscription` *(sic)* `{ subscriptionId }` | `cancelSubscription` |
| | `GET /users/:id/addons/reseller-seats/access` | `getWhiteLabelAccess` / `fetchWhiteLabelAccess` |
| White Label | `GET /custom-domains` · `POST /custom-domains` · `PATCH /custom-domains/:id/config` · `PATCH /custom-domains/:id/verification` · `DELETE /custom-domains/:id` · `GET /custom-domains/resolve?domain=` | `CustomDomainService.*` |
| | Next routes → Vercel: `POST /api/custom-domains`, `GET/DELETE /api/custom-domains/:domain`, `GET /api/custom-domains/:domain/config` | used directly via `fetch` |
| Uploads | `POST /upload-loacal-image` *(sic)* (field `image`) · `POST /upload-gif` (field `gif_file`) | `UploadService` |
| Reseller | `GET /reseller` · `POST /reseller/add` · `POST /reseller/update/details` · `POST /reseller/update/password` · `DELETE /reseller/delete` | `resellerService.*` |
| Admin | `GET /admin?page=&search=` · `POST /admin/users/add` · `POST /admin/users/update/details` · `POST /admin/users/delete` · `POST /activateUser` · `POST /deactivateUser` · `POST /admin/users/update/subscriptions` · `POST /admin/users/update/password` · `POST /admin/addon/update` | `adminService.*` |
| | `POST /admin/users/credits/add` · `POST /admin/users/credits/update` | `Credits` |
| | `POST /user/sendCampaign` · `GET /all/email/campaign` | `EmailMarketing` |
| Integrations | `GET /destinations/oauth/{facebook,instagram,linkedin,youtube,twitch,kick,trovo,dropbox,google_drive}/redirect` | `get*OAuthUrl` |
| | `POST /destinations` · `POST /destinations/{youtube,instagram,tiktok,facebook}/manual` | create / createManual* |
| | `GET /destinations?type=` · `GET/PATCH/DELETE /destinations/:id` · `PATCH /destinations/manualupdate/:id` | get/update/delete/updateStreamKey |
| | `GET /projects` · `GET /projects/:id/destinations` · `DELETE /projects/:id/destinations/:destId` | used before deleting a channel |

### Known quirks (keep or fix deliberately)
1. **Settings → Profile "Save Changes" and "Update Password" only show a toast.** No API call is wired yet. The profile photo is stored in `localStorage` (`lib/profile-image.ts`), not on the backend. Wire them in the new app if the backend has endpoints. Otherwise replicate as-is.
2. **Agency page "Manage plan" pushes `/subscriptions`**, a route that doesn't exist. Point it to `/settings?tab=subscriptions` or `/upgrade` in the new app.
3. `services/Worskpaces.ts` filename is misspelled. Rename freely in the new app (imports only).
4. Integrations catalogue: only **7 platforms are live** (YouTube, Facebook, LinkedIn, Twitch, Kick, Instagram → OAuth; TikTok → manual). Others are commented out in `CHANNELS_LIST`. OAuth URL helpers also exist for Trovo, Dropbox and Google Drive.
5. `lib/auth-session.ts` imports `clearTourState` from `lib/tours`. A no-op stub is provided below.

---

## 5. Shared types (`types/types.ts` subset)

Extracted automatically: every type these files import from `@/types/types`, plus everything those reference. Paste it as `types/types.ts` (or merge it into the new app's types).

```ts
// GLOBAL USER RELATED TYPES

// workspaces
export interface Workspace {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  is_default: boolean;
  logo: null;
  created_at: string;
  updated_at: string;
}

export interface AllUserWorkspace {
  id: number;
  user_id: number;
  work_space_id: number;
  is_active: number;
  role: string; // member, admin, owner
  created_at: string;
  updated_at: string;
  user_role: string;
  user_count: number;
  workspace: Workspace;
}

// subscriptions
export interface Subscription {
  id: string;
  status: boolean;
  limit: number;
  start_date: string;
  end_date: string;
  type: string;
  name: string;
}

export interface AllUserSubscriptions {
  front_end?: Subscription;
  front_end_pro: Subscription;
  viralgenius_media_studio: Subscription;
  viralgenius_affiliate_offer: Subscription;
  viralgenius_sales_converter: Subscription;
  viralgenius_agency: Subscription;
  reseller: Subscription;
  viralgenius_unlimited: Subscription;
}

export interface SubscriptionSeed {
  status: boolean;
  limit: number;
  start_date: string;
  end_date: string;
  type: string;
}

export interface SubscriptionsNew {
  front_end: SubscriptionSeed;
  viralgenius_unlimited: SubscriptionSeed;
  viralgenius_affiliate_offer: SubscriptionSeed;
  viralgenius_sales_converter: SubscriptionSeed;
  viralgenius_media_studio: SubscriptionSeed;
  viralgenius_agency: SubscriptionSeed;
  reseller: SubscriptionSeed;
}

export type SubscriptionDataNew = {
  id: number;
  name: "free" | "professional" | "agency" | "reseller";
  status: boolean;
  platform: "jvz" | "paddle";
  type: "monthly" | "yearly" | "lifetime";
  start_date: string;
  end_date: string;
  // Renewal cancelled flag: 0 = renews, 1 = set to expire at end_date.
  is_cancelled?: number;
};

export type AddOns = {
  remove_branding?: {
    id: number;
    status: boolean;
    type: string;
    start_date: string;
    end_data: null;
  };
  reseller_seats?: {
    status: boolean;
    limit: number;
  };
  [key: string]: unknown;
};

export interface AllUserSubscriptionsNew {
  // free accounts come back as { plan: "free", addons: [] }
  plan?: string;
  // paid accounts come back as { subscription: {...}, addons: {...} }
  subscription?: SubscriptionDataNew;
  addons: [] | AddOns;
}

// AppSumo license attached to a user that activated via AppSumo.
export interface AppsumoLicense {
  id: number;
  user_id: number;
  license_key: string;
  prev_license_key: string | null;
  event: string;
  last_event: string | null;
  status: string; // active, inactive, ...
  tier: number;
  activated: boolean;
  is_test: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
  upgraded_at: string | null;
  downgraded_at: string | null;
  payload: {
    test: boolean;
    tier: number;
    event: string;
    license_key: string;
    license_status: string;
  };
}

// user types
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  role: string;
  token: string | null;
  token_balance?: number | string | null;
  credit_balance?: number | string | null;
  tokens?: number | string | null;
  is_active: number;
  parent_id: string | null;
  admin_id: number;
  uuid: null;
  added_by: string;
  created_at: string;
  updated_at: string;
  edit_access: boolean;
  first_name: string;
  last_name: string;
  parsed_role: string;
  user_workspaces: number[];
  all_user_workspaces: AllUserWorkspace[];
  active_workspace: Workspace;
  subscriptions: AllUserSubscriptionsNew;
  account_officer: string;
  // Present only for users onboarded through AppSumo.
  license_key?: string | null;
  appsumo_license?: AppsumoLicense | null;
  // Set to true once the user completes or dismisses the onboarding tour.
  tour_completed?: boolean;
}

// Admin Types
export interface getAdminDashboardResponse {
  status: string;
  stats: {
    total_users: number;
    users_today: number;
    users_this_week: number;
  };
  users: {
    current_page: number;
    data: User[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: {
      url: string | null;
      label: string;
      active: boolean;
    }[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
}

// Create User Payload
// POST /admin/users/add
export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
  subscriptions: SubscriptionsNew;
}

export interface CreateUserResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// Update User payload
// POST /admin/users/update/details
export interface UpdateUserPayload {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  role: string;
  is_active: boolean;
}

export interface UpdateUserResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// UPDATE USER SUBSCRIPTIONS
// POST /admin/users/update/subscriptions
export interface UpdateUserSubscriptionsPayload {
  user_id: number;
  subscriptions: {
    front_end: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_unlimited: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_affiliate_offer?: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_sales_converter?: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_media_studio?: {
      id: number;
      status: boolean;
      limit?: number;
    };
    reseller: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_agency: {
      id: number;
      status: boolean;
      limit?: number;
    };
  };
}

// POST /admin/users/update/password
export interface updateUserPasswordPayload {
  user_id: number;
  password: string;
  password_confirmation: string;
}

export interface UserCreditsPayload {
  user_id: number;
  amount: number;
}

export interface UserCreditsResponse {
  status: string;
  message: string;
}

export interface createEmailCampaignPayload {
  name: string;
  subject: string;
  type: "individual" | "bulk" | "bulk_import";
  recipient?: string;
  bulk_recipients?: string[];
  file?: File;
  content: string;
}

export interface createEmailCampaignResponse {
  status: boolean | string;
  camapaign_id?: number;
  message?: string;
}

export interface getEmailCampaignData {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: "individual" | "bulk" | "bulk_import" | string;
  total: number;
  sent: number;
  failed: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface getEmailCampaignResponse {
  current_page?: number;
  data: getEmailCampaignData[];
}

// New Admin User Update Types
// ADD NEW USER - POST - /admin/users/add
export interface AddNewUserFromAdminPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  plan: "free" | "professional" | "agency" | "reseller";
  billing_type: "lifetime" | "monthly" | "yearly";
  addons?: AddOns | null; // add a checkbox for remove branding to add it
}

export interface AddNewUserFromAdminResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

//UPDATE NEW USER - POST - /admin/users/update/details
export interface UpdateNewUserFromAdminPayload {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  role: string;
  plan: "free" | "professional" | "agency" | "reseller";
  billing_type: "lifetime" | "monthly" | "yearly";
  addons?: AddOns | null; // add a checkbox for remove branding to add it
}

export interface UpdateNewUserFromAdminResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// UPDATE ADDONS - POST - /admin/addons/update
export interface UpdateAddonsPayload {
  user_id: number;
  addons: {
    remove_branding?: {
      status: boolean;
      type: "lifetime" | "monthly" | "yearly";
    };
    reseller_seats?: {
      status: boolean;
      limit: number;
    };
    [key: string]: unknown;
  };
}

export interface UpdateAddonsResponse {
  status: string;
  message: string;
}

// WORKSPACE ROUTES & TYPES
// CREATE WORKSPACE:
// create workspace route: POST /workspace/store
export interface CreateWorkspacePayload {
  name: string; // "My Workspace"
  slug: string; // "my-workspace"
  is_default: number; // 1 for true or 0 for false
  logo: File | null; // Optional logo file
}

export interface createWorkspaceResponse {
  status: string;
  message: string;
  workspace?: Workspace;
  errors?: {
    [key: string]: string[];
  };
}

// ACTIVATE WORKSPACE:
// activate workspace route: POST /workspace/activate
export interface ActivateWorkspacePayload {
  id: number; // ID of the workspace to activate
}

export interface ActivateWorkspaceResponse {
  status: string;
  message: string;
}

// GET ALL WORKSPACES:
// get all workspaces route: GET /workspace
export interface GetAllWorkspacesResponse {
  status: string;
  currentWorkspace: Workspace[];
  userWorkspaces: AllUserWorkspace[];
}

// UPDATE/EDIT WORKSPACE:
// edit workspace route: POST /workspace/update
export interface UpdateWorkspacePayload {
  id: number;
  name: string;
  slug: string;
  is_default: number;
}

export interface UpdateWorkspaceResponse {
  status: string;
  message: string;
  workspace?: Workspace;
  errors?: {
    [key: string]: string[];
  };
}

// DELETE WORKSPACE:
// delete workspace route: POST /workspace/delete
export interface DeleteWorkspacePayload {
  id: number; // ID of the workspace to delete
}

export interface DeleteWorkspaceResponse {
  status: string;
  message: string;
}

// TEAM MEMBER TYPES:
export interface TeamMember {
  account_officer: string;
  active_workspace: Workspace;
  added_by: string;
  admin_id: number;
  all_user_workspaces: AllUserWorkspace[];
  created_at: string;
  edit_access: boolean;
  email: string;
  email_verified_at: string | null;
  first_name: string;
  id: number;
  is_active: number; // or boolean if you want to normalize
  last_name: string;
  name: string;
  parent_id: number;
  parsed_role: string;
  role: string;
  subscriptions: AllUserSubscriptions;
  token: string | null;
  updated_at: string;
  user_workspaces: number[];
  uuid: string | null;
}

// ADD TEAM MEMBER:
// add team member route: POST /team/add
export interface AddTeamMemberPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  user_access: { id: number; has_access: boolean }[];
}

export interface AddTeamMemberResponse {
  status: string;
  message: string;
  user?: TeamMember;
  errors?: {
    [key: string]: string[];
  };
}

// GET ALL TEAM MEMBERS:
// get all team members route: GET /team
export interface GetAllTeamMembersResponse {
  status: string;
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  users?: User[];
  errors?: {
    [key: string]: string[];
  };
}

// UPDATE TEAM MEMBER:
// update team member route: "/team/update"
export interface UpdateTeamMemberPayload {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  password?: string;
  user_access: { id: number; has_access: boolean }[];
}

export interface UpdateTeamMemberResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// UPDATE TEAM MEMBER PASSWORD:
// update team member password route: "/team/update/password"
export interface UpdateTeamMemberPasswordPayload {
  id: number;
  password: string;
  password_confirmation: string;
}

export interface UpdateTeamMemberPasswordResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// DELETE TEAM MEMBER:
// delete team member route: DELETE /team/delete
export interface DeleteTeamMemberPayload {
  id: number; // ID of the team member to delete
}

export interface DeleteTeamMemberResponse {
  status: string;
  message: string;
}

// RESELLER ROUTES & TYPES
// GET ALL RESELLERS:
// get all resellers route: GET /reseller
export interface GetAllResellersResponse {
  status: string;
  message?: string;
  page: string;
  workspace: Workspace;
  users: User[];
  sumOfUsers: number;
  sumOfUsersToday: number;
  sumOfUsersThisWeek: number;
}

// ADD RESELLER:
// add reseller route: POST /reseller/add
export interface AddResellerPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  is_active: boolean;
}

export interface AddResellerResponse {
  status: string;
  message: string;
  user?: User[];
}

// UPDATE RESELLER:
// update reseller route: POST /reseller/update/details
export interface UpdateResellerPayload {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}

export interface UpdateResellerResponse {
  status: string;
  message: string;
  user?: User[];
}

// UPDATE RESELLER PASSWORD:
// update reseller password route: POST /reseller/update/password
export interface UpdateResellerPasswordPayload {
  id: number;
  password: string;
  password_confirmation: string;
}

export interface UpdateResellerPasswordResponse {
  status: string;
  message: string;
  user?: User[];
}

// DELETE RESELLER:
// delete reseller route: POST /reseller/delete
export interface DeleteResellerPayload {
  id: number; // ID of the reseller to delete
}

export interface DeleteResellerResponse {
  status: string;
  message: string;
}

// AI AGENT TYPES
// Settings ride on a live stream: /live-streams/{liveStreamId}/ai-settings

export type AiAgentFaqEntry = {
  question: string;
  answer: string;
};

// "offer": {
//         "available": true,
//         "price": "$99",
//         "currency": "USD",
//         "discount": "20% off",
//         "expires_at": "2026-08-01"
//     },

export type AiOfferEntry = {
  available: boolean;
  price: string;
  currency: string;
  discount: string;
  expires_at: string;
};

/**
 * Context the AI agent uses to answer chat and detect buying intent. `type`
 * is one of the backend's stream types (product_demo, online_course,
 * church_service, podcast, webinar).
 */
export type AiAgentMetadata = {
  type: string;
  title?: string | null;
  offer?: AiOfferEntry | null;
  description?: string | null;
  product_name?: string | null;
  website_url?: string | null;
  product_url?: string | null;
  pricing_url?: string | null;
  purchase_url?: string | null;
  key_facts?: string[];
  faq?: AiAgentFaqEntry[];
};

/**
 * AI Agent automation switches for a live stream. `ai_agent_enabled` is the
 * master switch — the other flags are inert while it is off.
 */
export type AiAgentSettings = {
  ai_agent_enabled: boolean;
  ai_auto_reply_enabled: boolean;
  /** "suggest" drafts replies for the host to approve; "auto" posts them. */
  ai_auto_reply_mode: "suggest" | "auto";
  ai_buying_intent_enabled: boolean;
  ai_auto_poll_enabled: boolean;
  ai_auto_cta_enabled: boolean;
  ai_host_attention_enabled: boolean;
  ai_metadata?: AiAgentMetadata | null;
};

/**
 * ai_settings as returned on the project record (GET /projects/:id). The
 * backend copies the last live-stream save here, since live stream ids
 * change per broadcast. A never-configured project has every flag false,
 * `ai_auto_reply_mode: null` and `ai_metadata: null`.
 */
export type AiAgentServerSettings = Omit<
  AiAgentSettings,
  "ai_auto_reply_mode" | "ai_metadata"
> & {
  ai_auto_reply_mode: "suggest" | "auto" | null;
  ai_metadata: AiAgentMetadata | null;
  /**
   * Read-only Flow AI connection state — written by the Telegram/OpenRouter
   * flows, never sent back on a settings PATCH. The Flow AI wizard uses these
   * to know which of its steps a project has already finished.
   */
  telegram_connected?: boolean;
  telegram_bot?: AiAgentTelegramBot | null;
  openrouter_connected?: boolean;
  openrouter_model?: string | null;
};

/** The connected bot, so a returning host gets a real t.me link. */
export interface AiAgentTelegramBot {
  /** Telegram's numeric id, delivered as a string. */
  id: string;
  username: string;
}

// PROJECT TYPES
export type Project = {
  id: number;
  name: string;
  description: string;
  thumbnail: string | null;
  status: string;
  auto_sync: boolean | null;
  active_live_id: number | null;
  active_scene_id: number;
  /** Last-saved AI Agent config, copied from live-stream saves (pristine
   *  defaults when the user has never saved while live). */
  ai_settings?: AiAgentServerSettings | null;
  destinations?: Destination[];
  /**
   * Extra projects whose videos play, in order, after this one's during a
   * Flow AI stream. Null when nothing is sequenced.
   */
  stream_project_ids?: number[] | null;
  /** The pre-recorded video a chat-started stream broadcasts. */
  autonomous_video_url?: string | null;
  created_at: string;
  updated_at: string;
};

// GET ALL PROJECTS
// GET /projects
export interface getProjectsResponse {
  success: boolean;
  message: string;
  data?: {
    projects: Project[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
  errors?: {
    [key: string]: string[];
  } | null;
}

// ── Destination metadata (per-platform shapes returned by GET /destinations) ──
export interface DestinationFacebookPage {
  id: string;
  name: string;
  picture?: { data?: { url?: string | null } | null } | null;
  category?: string | null;
  access_token?: string;
  [key: string]: unknown;
}

export interface DestinationFacebookProfile {
  id: string;
  name: string;
  email?: string | null;
  picture?: string | null;
}

export interface DestinationInstagramAccount {
  id: string;
  username: string;
  media_count?: number;
  follows_count?: number;
  followers_count?: number;
  profile_picture_url?: string | null;
}

export interface DestinationLinkedInProfile {
  sub: string;
  name: string;
  email?: string | null;
  picture?: string | null;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

export interface DestinationYouTubeChannel {
  id: string;
  title: string;
  country?: string | null;
  thumbnail?: string | null;
  description?: string;
  statistics?: {
    viewCount?: string;
    videoCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
  };
}

export interface DestinationTwitchUser {
  id: string;
  type?: string;
  login: string;
  display_name: string;
  profile_image?: string | null;
  broadcaster_type?: string;
}

export interface DestinationKickChannel {
  slug?: string;
  username?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DestinationMetadata {
  // facebook
  page?: DestinationFacebookPage;
  profile?: DestinationFacebookProfile;
  entity_type?: "page" | "profile" | string;
  // instagram
  instagram_account?: DestinationInstagramAccount;
  // linkedin
  linkedin_profile?: DestinationLinkedInProfile;
  linkedin_author_urn?: string;
  linkedin_scopes?: string[];
  // youtube channel + kick channel (different shapes share the `channel` key)
  channel?: DestinationYouTubeChannel | DestinationKickChannel;
  youtube?: Record<string, unknown>;
  // twitch
  user?: DestinationTwitchUser;
  twitch?: Record<string, unknown>;
  // kick
  kick?: { channel?: Record<string, unknown>; [key: string]: unknown };
  expires_in?: number;
  [key: string]: unknown;
}

export type Destination = {
  id: number;
  type: string;
  category: "streaming" | "storage" | string | null;
  name: string;
  platform_id: string | null;
  is_valid: boolean;
  needs_reconnection: boolean;
  rtmp_url: string | null;
  metadata: DestinationMetadata | null;
  chat_supported: boolean;
  chat_provider: string | null;
  clip_publish_supported: boolean;
  clip_publish_mode: string | null;
  docs_url: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

// GET FACEBOOK OAUTH URL - GET /destinations/oauth/facebook/redirect
export interface getFacebookOAuthUrlResponse {
  url: string;
}

// GET INSTARGRAM OUATH URL - GET /destinations/oauth/instagram/redirect
export interface getInstagramOauthUrlResponse {
  url: string;
}

// GET LINKEDIN OUATH URL - GET /destinations/oauth/linkedin/redirect
export interface getLinkedInOauthUrlResponse {
  url: string;
}

// GET YOUTUBE OAUTH URL - GET /destinations/oauth/youtube/redirect
export interface getYouTubeOAuthUrlResponse {
  url: string;
}

// GET TWITCH OAUTH URL - GET /destinations/oauth/twitch/redirect
export interface getTwitchOAuthUrlResponse {
  url: string;
}

// GET KICK OAUTH URL - GET /destinations/oauth/kick/redirect
export interface getKickOAuthUrlResponse {
  url: string;
}

// GET TROVO OAUTH URL - GET /destinations/oauth/trovo/redirect
export interface getTrovoOAuthUrlResponse {
  url: string;
}

// GET DROPBOX OAUTH URL - GET /destinations/oauth/dropbox/redirect
export interface getDropboxOAuthUrlResponse {
  url: string;
}

// GET GOOGLE DRIVE OAUTH URL - GET /destinations/oauth/google_drive/redirect
export interface getGoogleDriveOAuthUrlResponse {
  url: string;
}

// GET ALL DESTINATIONS/CONNECTIONS/CHANNELS - GET /destinations
export interface getDestinationsResponse {
  success: boolean;
  message: string;
  data: {
    destinations: Destination[];
    total: number;
  };
  errors?: {
    [key: string]: string[];
  } | null;
}

// GET DESTINATION/CONNECTION/CHANNEL DETAILS - GET /destinations/:id
export interface getDestinationResponse {
  success: boolean;
  message: string;
  data: Destination;
  errors?: {
    [key: string]: string[];
  } | null;
}

// MANUAL UPDATE DESTINATION STREAM KEY - PATCH /destinations/manualupdate/:id
export interface updateDestinationStreamKeyPayload {
  stream_key: string;
}

export interface updateDestinationStreamKeyResponse {
  success: boolean;
  message: string;
  data: Destination;
  errors?: {
    [key: string]: string[];
  } | null;
}

// CREATE DESTINATION - POST /destinations
export interface createDestinationPayload {
  type: string;
  category?: "streaming" | "storage";
  name: string;
  platform_id?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  rtmp_url?: string | null;
  stream_key?: string | null;
  token_expires_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface createDestinationResponse {
  success: boolean;
  message: string;
  data: Destination;
  errors?: {
    [key: string]: string[];
  } | null;
}

// {
//     "name": "My YouTube Channel",
//     "stream_key": "abcd-1234-efgh-5678-ijkl"
// }.  http://127.0.0.1:8000/api/destinations/youtube/manual
// {
//     "name": "My Instagram",
//     "stream_key": "IG-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
// }  http://127.0.0.1:8000/api/destinations/instagram/manual
// {
//     "name": "My Facebook Page",
//     "stream_key": "FB-1234567890123456?s_bl=1&s_ps=1&s_sw=0&s_vt=api-s&a=AbCdEfGhIjKlMnOp"
// }  http://127.0.0.1:8000/api/destinations/facebook/manual

// MANUAL CONNECT DESTINATIONS — each platform has its own endpoint and
// collects only the account name and stream key. Responses share
// createManualDestinationResponse (= createDestinationResponse).

// CONNECT YOUTUBE MANUALLY - POST /destinations/youtube/manual
export interface createManualYoutubeDestinationPayload {
  name: string;
  stream_key: string;
}

// CONNECT INSTAGRAM MANUALLY - POST /destinations/instagram/manual
export interface createManualInstagramDestinationPayload {
  name: string;
  stream_key: string;
}

// CONNECT FACEBOOK MANUALLY - POST /destinations/facebook/manual
export interface createManualFacebookDestinationPayload {
  name: string;
  stream_key: string;
}

// CONNECT TIKTOK MANUALLY - POST /destinations/tiktok/manual
// Unlike the others, TikTok issues a per-session server URL alongside the key,
// so `rtmp_url` cannot be hard-coded and has to travel with the payload.
export interface createManualTikTokDestinationPayload {
  name: string;
  rtmp_url: string;
  stream_key: string;
}

export type createManualDestinationResponse = createDestinationResponse;

// UPDATE DESTINATION (STREAM KEY) - PATCH /destinations/manualupdate/:id
export interface updateDestinationPayload {
  name?: string;
  platform_id?: string | null;
  rtmp_url?: string | null;
  stream_key?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface updateDestinationResponse {
  success: boolean;
  message: string;
  data: Destination;
  errors?: {
    [key: string]: string[];
  } | null;
}

// DELETE DESTINATION/CONNECTION/CHANNEL - DELETE /destinations/:id
export interface deleteDestinationResponse {
  success: boolean;
  message: string;
  data: null;
  errors?: {
    [key: string]: string[];
  } | null;
}

// PROJECT DESTINATIONS TYPES
// GET PROJECT DESTINATIONS - GET /projects/:project_id/destinations
export interface getProjectDestinationsResponse {
  success: boolean;
  message: string;
  data: {
    destinations: Destination[];
    total: number;
  };
}

export interface deleteProjectDestinationResponse {
  success: boolean;
  message: string;
  data: null;
}

// ─── LOCAL FILE UPLOADS (S3) ─────────────────────────────────────────────────
// These four endpoints take multipart form data and return a public S3 URL.
// They are inconsistent about the response key (`url` vs `filePath`), so
// `services/Upload.ts` normalises both into a single shape.

// POST /upload-loacal-image  (spelling is the live backend route)
export interface uploadLocalImageResponse {
  status: string;
  url: string;
  message?: string;
}

// POST /upload-gif
export interface uploadGifResponse {
  status: string;
  filePath: string;
  message?: string;
}

/** Normalised result returned by every UploadService method. */
export interface LocalUploadResult {
  status: string;
  url: string;
  message?: string;
}

/**
 * GET /users/:id/addons/reseller-seats/access — the backend's own answer on
 * whether this account owns the White Label add-on. It is the authority the
 * front end's `hasWhiteLabel` cookie read only approximates.
 */
export interface AddonAccessResponse {
  status: string;
  has_access: boolean;
}
```

---

## 6. Foundation: API, session, helpers, store

#### `services/api/api.ts`

```ts
import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { getAuthTokenCookie } from "@/lib/auth-session";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined" ? getAuthTokenCookie() : undefined;

    if (typeof token === "string") {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

export default api;
```

<sub>27 lines</sub>

#### `lib/auth-session.ts`

```ts
//modules
import { deleteCookie, getCookie, setCookie } from "cookies-next/client";
// import AuthService from "@/services/auth";
import { User, AllUserSubscriptionsNew } from "@/types/types";
import { clearTourState } from "@/lib/tours";

// Cookie Values
const AUTH_TOKEN_COOKIE_NAME = "authToken";
const AUTH_USER_COOKIE_NAME = "authUser";
const MAX_COOKIE_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// cookie helpers
// read cookie value
export const readCookieValue = (cookieName: string): string | undefined => {
  const cookie = getCookie(cookieName);
  return typeof cookie === "string" ? cookie : undefined;
};

// set auth cookie
export const setAuthTokenCookie = (tokenValue: string) => {
  setCookie(AUTH_TOKEN_COOKIE_NAME, tokenValue, {
    maxAge: MAX_COOKIE_AGE,
    sameSite: "lax",
    secure:
      typeof window !== "undefined" && window.location.protocol === "https:",
    path: "/",
  });
};

// get auth cookie
export const getAuthTokenCookie = (): string | undefined => {
  return readCookieValue(AUTH_TOKEN_COOKIE_NAME);
};

// Session User Type
export type SessionUser = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  date_joined: string;
  last_updated_at: string;
  no_of_workspaces: number;
  active_workspace_id: number;
  active_workspace_name: string;
  subscriptions: AllUserSubscriptionsNew;
  tour_completed?: boolean;
};

export interface RegistrationUserState {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
}

// Split a full name into first/last for the session shape. Everything after the
// first token becomes the last name; a single token leaves last name empty.
const splitFullName = (fullName: string): { first: string; last: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first: "", last: "" };
  }
  const [first, ...rest] = parts;
  return { first, last: rest.join(" ") };
};

// session helpers
export const mapUserToSession = (user: User): SessionUser => {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.name,
    email: user.email,
    role: user.role,
    date_joined: user.created_at,
    last_updated_at: user.updated_at,
    no_of_workspaces: user.all_user_workspaces?.length ?? 0,
    active_workspace_id: user.active_workspace?.id ?? 0,
    active_workspace_name: user.active_workspace?.name ?? "",
    subscriptions: user.subscriptions,
    tour_completed: user.tour_completed ?? false,
  };
};

// Build a session from the trimmed user returned by POST /register. The
// registration payload only carries id/name/email/created_at, so workspace and
// subscription fields fall back to sensible "fresh account" defaults until the
// full profile is fetched (e.g. via GET /me on the next load).
export const mapRegistrationUserToSession = (
  user: RegistrationUserState,
): SessionUser => {
  const { first, last } = splitFullName(user.name);
  return {
    id: user.id,
    firstName: first,
    lastName: last,
    fullName: user.name,
    email: user.email,
    role: "user",
    date_joined: user.created_at,
    last_updated_at: user.created_at,
    no_of_workspaces: 0,
    active_workspace_id: 0,
    active_workspace_name: "",
    subscriptions: { plan: "free", addons: [] },
  };
};

// Event fired whenever the session cookie is (re)written, so live UI such as
// the sidebar/top-bar plan badges can re-read it without a full reload.
export const SESSION_UPDATED_EVENT = "flowcasta:session-updated";

// Persist an already-mapped session user to the cookie and notify listeners.
export const writeSessionUserCookie = (sessionUser: SessionUser) => {
  setCookie(AUTH_USER_COOKIE_NAME, JSON.stringify(sessionUser), {
    maxAge: MAX_COOKIE_AGE,
    sameSite: "lax",
    secure:
      typeof window !== "undefined" && window.location.protocol === "https:",
    path: "/",
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }

  return sessionUser;
};

// Set Session User as token
export const setSessionUserCookie = (user: User) => {
  return writeSessionUserCookie(mapUserToSession(user));
};

// get session user from cookie
export const getSessionUserFromCookie = (): SessionUser | null => {
  const cookieValue = readCookieValue(AUTH_USER_COOKIE_NAME);
  if (!cookieValue) {
    return null;
  }
  try {
    return JSON.parse(cookieValue) as SessionUser;
  } catch {
    return null;
  }
};

// initialize session
export const initializeSession = (user: User, token: string): SessionUser => {
  // Start each login from a clean tour slate so the previous account's
  // finished/off flags don't suppress the tour for this user.
  clearTourState();
  setAuthTokenCookie(token);
  return setSessionUserCookie(user);
};

// initialize session straight from the register response, which returns a
// trimmed user rather than the full profile.
export const initializeSessionFromRegistration = (
  user: RegistrationUserState,
  token: string,
): SessionUser => {
  // Brand-new account — clear any tour flags left by a prior session so the
  // new-user auto-tour actually fires on /home.
  clearTourState();
  setAuthTokenCookie(token);
  return writeSessionUserCookie(mapRegistrationUserToSession(user));
};

// clear auth & session cookies
export const clearSession = () => {
  deleteCookie(AUTH_TOKEN_COOKIE_NAME, { path: "/" });
  deleteCookie(AUTH_USER_COOKIE_NAME, { path: "/" });
  // Drop tour progress so the next account signing in on this browser starts
  // from a clean slate.
  clearTourState();
  // Clear studio-local preferences that are tied to the signed-in (admin) user.
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("flowcasta:admin-hide-branding");
  }
};
```

<sub>186 lines</sub>

#### `lib/tours.ts`

> STUB: replace with the new app's tour module, or keep as a no-op.

```ts
// STUB for the handoff. lib/auth-session.ts calls clearTourState() at login /
// logout. Flowcasta's real lib/tours.ts drives product tours (driver.js); if the
// new app has no tours, this no-op keeps auth-session.ts working unchanged.
export function clearTourState() {
  // no-op
}
```

<sub>6 lines</sub>

#### `lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitialsFromName(
  fullName?: string | null,
  email?: string | null,
) {
  const fallback = email?.split("@")[0] ?? "";
  const source = (fullName ?? "").trim() || fallback.trim();
  if (!source) {
    return "U";
  }

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return `${first}${last}`.toUpperCase();
}

function tryParseJsonObject(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Pulls the first usable message out of a single candidate payload, which may
 * be a string or an object shaped like:
 *   { message: "..." }
 *   { message: "...", errors: { field: ["..."] } }
 * Validation errors take precedence over the top-level message.
 */
function extractMessage(payload: unknown): string | null {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    return trimmed ? trimmed : null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  const validationErrors = record.errors;
  if (validationErrors && typeof validationErrors === "object") {
    for (const value of Object.values(
      validationErrors as Record<string, unknown>,
    )) {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "string" &&
        value[0].trim()
      ) {
        return value[0];
      }
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  return null;
}

/**
 * Extracts a human-readable error message from an API error. Accepts the raw
 * axios error (reads `response.data`), the response body object directly
 * ({ message, errors }), or a JSON / plain string. Validation errors are
 * preferred over the generic message; the network-level message
 * (e.g. "Request failed with status code 403") is only used as a last resort.
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = "Something went wrong",
): string {
  const candidates: unknown[] = [];

  if (typeof error === "string") {
    candidates.push(tryParseJsonObject(error) ?? error);
  } else if (error && typeof error === "object") {
    const err = error as {
      response?: { data?: unknown };
      data?: unknown;
      message?: unknown;
    };

    // Richest first: the API response body, then the object itself.
    candidates.push(err.response?.data);
    candidates.push(err.data);
    candidates.push(error);

    // A network/Error message is the weakest signal — and might itself be JSON.
    if (typeof err.message === "string") {
      candidates.push(tryParseJsonObject(err.message) ?? err.message);
    }
  }

  for (const candidate of candidates) {
    const message = extractMessage(candidate);
    if (message) {
      return message;
    }
  }

  return defaultMessage;
}
```

<sub>127 lines</sub>

#### `lib/toast.tsx`

```tsx
"use client";

import Link from "next/link";
import { Check, Loader2, Sparkles, X, XCircle } from "lucide-react";
import { toast as hotToast } from "react-hot-toast";
import { cn } from "@/lib/utils";

type AppToastOptions = {
  id?: string;
};

type AppToastFn = (message: string, options?: AppToastOptions) => string;
type AppToastDismissFn = (id?: string) => void;

type AppToastApi = {
  success: AppToastFn;
  error: AppToastFn;
  upgrade: AppToastFn;
  loading: AppToastFn;
  dismiss: AppToastDismissFn;
};

type ToastVariant = "success" | "error" | "upgrade" | "loading";

const DURATION_BY_VARIANT: Record<ToastVariant, number> = {
  success: 3000,
  error: 4500,
  upgrade: 6000,
  loading: 999_999_999,
};

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    label: string;
    labelText: string;
    iconBg: string;
    iconColor: string;
    border: string;
  }
> = {
  success: {
    label: "Success",
    labelText: "text-[var(--success)]",
    iconBg: "bg-[var(--success-muted)]",
    iconColor: "text-[var(--success)]",
    border: "border-[var(--success-muted)]",
  },
  error: {
    label: "Error",
    labelText: "text-[var(--danger)]",
    iconBg: "bg-[var(--danger-muted)]",
    iconColor: "text-[var(--danger)]",
    border: "border-[var(--danger-muted)]",
  },
  upgrade: {
    label: "Upgrade",
    labelText: "text-[var(--brand)]",
    iconBg: "bg-[var(--brand-muted)]",
    iconColor: "text-[var(--brand)]",
    border: "border-[var(--brand-muted)]",
  },
  loading: {
    label: "Loading",
    labelText: "text-[var(--info)]",
    iconBg: "bg-[var(--info-muted)]",
    iconColor: "text-[var(--info)]",
    border: "border-[var(--info-muted)]",
  },
};

const renderToast = (
  variant: ToastVariant,
  message: string,
  options?: AppToastOptions,
): string => {
  return hotToast.custom(
    (t) => {
      const cfg = VARIANT_CONFIG[variant];

      return (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto w-full max-w-sm rounded-[var(--radius-lg)] border bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-md)]",
            "transition duration-200",
            t.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            cfg.border,
          )}
        >
          <div className="flex items-start gap-3 p-4">
            <div
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                cfg.iconBg,
                cfg.iconColor,
              )}
            >
              {variant === "success" ? <Check className="size-4" /> : null}
              {variant === "error" ? <XCircle className="size-4" /> : null}
              {variant === "upgrade" ? <Sparkles className="size-4" /> : null}
              {variant === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.2em]",
                  cfg.labelText,
                )}
              >
                {cfg.label}
              </p>
              <p className="text-sm leading-snug text-[var(--text-primary)]">
                {message}
              </p>

              {variant === "upgrade" ? (
                <Link
                  href="/subscription"
                  onClick={() => hotToast.dismiss(t.id)}
                  className={cn(
                    "mt-2 inline-flex h-8 items-center justify-center rounded-[var(--radius-sm)] px-3 text-xs font-semibold",
                    "bg-[var(--brand)] text-white shadow-[var(--shadow-brand-sm)]",
                    "transition hover:bg-[var(--brand-hover)]",
                  )}
                >
                  Upgrade to Unlimited
                </Link>
              ) : null}
            </div>

            <button
              type="button"
              aria-label="Close notification"
              onClick={() => hotToast.dismiss(t.id)}
              className={cn(
                "-mr-1 -mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
                "text-[var(--text-muted)] transition-colors",
                "hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]",
              )}
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      );
    },
    {
      duration: DURATION_BY_VARIANT[variant],
      id: options?.id,
    },
  );
};

export const toast: AppToastApi = {
  success: (message, options) => renderToast("success", message, options),
  error: (message, options) => renderToast("error", message, options),
  upgrade: (message, options) => renderToast("upgrade", message, options),
  loading: (message, options) => renderToast("loading", message, options),
  dismiss: (id) => hotToast.dismiss(id),
};

export const useToast = (): AppToastApi => toast;
```

<sub>166 lines</sub>

#### `lib/animations.ts`

```ts
import type { Variants } from "framer-motion";

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.34, 1.56, 0.64, 1] },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

export const cardHover: Variants = {
  rest: { y: 0, boxShadow: "var(--shadow-sm)" },
  hover: {
    y: -3,
    boxShadow: "var(--shadow-md)",
    transition: { duration: 0.15, ease: "easeOut" },
  },
};

export const reduceMotion =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
```

<sub>61 lines</sub>

#### `lib/plan-core.ts`

```ts
import type { AllUserSubscriptionsNew } from "@/types/types";

/**
 * Plan derivation with no UI imports, so the proxy (edge) can use it without
 * pulling icons and components into its bundle. `lib/plan.ts` re-exports these
 * for app code alongside the presentational metadata.
 */
export type PlanName = "free" | "professional" | "agency" | "reseller";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizePlan(value: unknown): PlanName {
  return value === "professional" || value === "agency" || value === "reseller"
    ? value
    : "free";
}

/**
 * Derives the user's current plan from the new subscriptions shape:
 *   paid:  { subscription: { name, status, ... }, addons }
 *   free:  { plan: "free", addons: [] }
 * A subscription only counts when its `status` is truthy.
 */
export function getActivePlan(
  subscriptions: AllUserSubscriptionsNew | null | undefined,
): PlanName {
  if (!isRecord(subscriptions)) {
    return "free";
  }

  const subscription = isRecord(subscriptions.subscription)
    ? subscriptions.subscription
    : null;

  if (subscription && subscription.status) {
    return normalizePlan(subscription.name);
  }

  return normalizePlan(subscriptions.plan);
}

/** The subset of the session cookie the AI gate needs. */
export interface AiAccessSession {
  role?: string;
  subscriptions?: AllUserSubscriptionsNew | null;
}

/**
 * Who may use the AI features (AI Agent and Flow AI): admins, plus
 * any paid subscriber (Professional, Agency or Reseller). Free-tier
 * users are blocked. The modal UI is kept intact so the gate can be
 * narrowed back to Reseller-only in the future if needed.
 */
export function canUseAiFeatures(
  session: AiAccessSession | null | undefined,
): boolean {
  if (!session) return false;
  if ((session.role ?? "viewer") === "admin") return true;
  return getActivePlan(session.subscriptions) !== "free";
}

/**
 * Who may use templates: admins, plus subscribers on Agency or Reseller.
 */
export function canUseTemplates(
  session: AiAccessSession | null | undefined,
): boolean {
  if (!session) return false;
  if ((session.role ?? "viewer") === "admin") return true;
  const activePlan = getActivePlan(session.subscriptions);
  return activePlan === "agency" || activePlan === "reseller";
}

/**
 * Who may use interactive elements (polls, giveaways, interactive games):
 * admins, plus subscribers on Agency or Reseller.
 */
export function canUseInteractiveElements(
  session: AiAccessSession | null | undefined,
): boolean {
  if (!session) return false;
  if ((session.role ?? "viewer") === "admin") return true;
  const activePlan = getActivePlan(session.subscriptions);
  return activePlan === "agency" || activePlan === "reseller";
}
```

<sub>87 lines</sub>

#### `lib/plan.ts`

```ts
import { Building2, Sparkles, Store, Zap, type LucideIcon } from "lucide-react";
import type { BadgeVariant } from "@/components/ui/Badge";

// Plan derivation lives in plan-core so the proxy can share it without
// dragging this module's icon imports into the edge bundle.
export {
  canUseAiFeatures,
  canUseTemplates,
  canUseInteractiveElements,
  getActivePlan,
  normalizePlan,
  type AiAccessSession,
  type PlanName,
} from "./plan-core";

import type { PlanName } from "./plan-core";

export type PlanMeta = {
  label: string;
  collapsed: string;
  badgeVariant: BadgeVariant;
  icon: LucideIcon;
  /** Prompt shown in the dashboard top bar relative to the active plan. */
  topBarText: string;
  linkForTopBar?: string; // optional link for the top bar prompt
};

export const PLAN_META: Record<PlanName, PlanMeta> = {
  free: {
    label: "Free plan",
    collapsed: "Free",
    badgeVariant: "default",
    icon: Sparkles,
    topBarText: "✦ Upgrade to Professional — multistream to 30+ platforms",
  },
  professional: {
    label: "Professional",
    collapsed: "Pro",
    badgeVariant: "brand",
    icon: Zap,
    topBarText: "✦ Upgrade to Agency — scale your team & workspaces",
  },
  agency: {
    label: "Agency",
    collapsed: "Agn",
    badgeVariant: "success",
    icon: Building2,
    topBarText: "✦ Upgrade to Reseller — resell Flowcasta, keep 100%",
  },
  reseller: {
    label: "Enterprise",
    collapsed: "Ent",
    badgeVariant: "warning",
    icon: Store,
    topBarText: "★ You're on the Enterprise plan — manage subscription",
    linkForTopBar: "/upgrade",
  },
};

const GB = 1024 * 1024 * 1024;

/**
 * Total file-storage allowance per plan, used by the /storage usage meter.
 * `reseller` is the internal key for the plan shown to users as "Enterprise".
 */
export const PLAN_STORAGE_BYTES: Record<PlanName, number> = {
  free: 5 * GB,
  professional: 25 * GB,
  agency: 100 * GB,
  reseller: 250 * GB,
};

/**
 * Hard cap for uploads streamed from the user's machine (image, video, audio
 * and gif alike). Anything larger has to come through the Import-from-URL
 * flow, which the backend fetches server-side.
 */
export const LOCAL_UPLOAD_MAX_BYTES = 5000 * 1024 * 1024;
```

<sub>78 lines</sub>

#### `lib/subscription.ts`

```ts
import type {
  AllUserSubscriptionsNew,
  SubscriptionDataNew,
} from "@/types/types";

/**
 * Add-on keys we treat as real, user-facing add-ons. The subscriptions payload
 * still carries legacy ViralGenius package flags (viralgenius_*, reseller,
 * ...) that are not offered as Flowcasta add-ons — only
 * `remove_branding` and `reseller_seats` are. Everything else is filtered out of add-on displays.
 */
export const VALID_ADDON_KEYS = ["remove_branding", "reseller_seats"] as const;

export function isValidAddon(key: string): boolean {
  return (VALID_ADDON_KEYS as readonly string[]).includes(key);
}

/**
 * Whether the account owns the active `remove_branding` add-on, which hides the
 * Flowcasta watermark across the studio canvas and broadcast output.
 */
export function hasRemoveBranding(
  subscriptions: AllUserSubscriptionsNew | null | undefined,
): boolean {
  const addons = subscriptions?.addons;
  if (!addons || Array.isArray(addons)) return false;
  const removeBranding = addons.remove_branding;
  return Boolean(
    removeBranding &&
    typeof removeBranding === "object" &&
    removeBranding.status,
  );
}

/**
 * Whether the account owns the active `reseller_seats` add-on — sold on the
 * front end as "White Label" — which unlocks custom domains and branding.
 */
export function hasWhiteLabel(
  subscriptions: AllUserSubscriptionsNew | null | undefined,
): boolean {
  const addons = subscriptions?.addons;
  if (!addons || Array.isArray(addons)) return false;
  const resellerSeats = addons.reseller_seats;
  return Boolean(
    resellerSeats && typeof resellerSeats === "object" && resellerSeats.status,
  );
}

/**
 * The next billing cycle for a subscription, derived from its start date rolled
 * forward by its billing interval until the date lands in the future. Lifetime
 * plans have no renewal, so they return null.
 *
 * Note: this is an approximation — the authoritative renewal date should come
 * from Paddle (`next_billed_at`) when available.
 */
export function getNextBillingDate(
  subscription: SubscriptionDataNew | undefined | null,
): Date | null {
  if (!subscription?.start_date || subscription.type === "lifetime") {
    return null;
  }
  const start = new Date(subscription.start_date);
  if (Number.isNaN(start.getTime())) return null;

  const now = new Date();
  const next = new Date(start);
  const stepYearly = subscription.type === "yearly";
  let guard = 0;
  while (next <= now && guard < 1000) {
    if (stepYearly) next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    guard += 1;
  }
  return next;
}

export function formatBillingDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
}
```

<sub>81 lines</sub>

#### `lib/white-label-access.ts`

```ts
import type { AddonAccessResponse } from "@/types/types";

/**
 * The backend's verification of the White Label (`reseller_seats`) add-on.
 *
 * `hasWhiteLabel` in `lib/subscription.ts` reads the `authUser` cookie, which
 * the client writes and can edit — fine for deciding what to render, useless
 * as a boundary. This module asks the API instead, and is written with plain
 * `fetch` and no browser imports so the proxy (edge) and the sales-kit
 * download route can both use it.
 */

/** Path on the API, relative to NEXT_PUBLIC_API_BASE_URL. */
export const whiteLabelAccessPath = (userId: number | string) =>
  `/users/${userId}/addons/reseller-seats/access`;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.flowcasta.com/api";

/**
 * Asks the backend whether this account owns the add-on.
 *
 * Returns `null` — not `false` — when the question could not be answered (no
 * token, network failure, unexpected shape). Callers decide what an unknown
 * means for them: the UI falls back to the cookie so a blip does not lock a
 * paying reseller out, while the download route refuses, because there an
 * unverified request is exactly the one to turn away.
 */
export async function fetchWhiteLabelAccess(
  userId: number | string | null | undefined,
  token: string | null | undefined,
): Promise<boolean | null> {
  if (!userId || !token) return null;

  try {
    const response = await fetch(
      `${API_BASE_URL}${whiteLabelAccessPath(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        // The answer is per-user and can change the moment an add-on is
        // bought or revoked, so it is never cached.
        cache: "no-store",
      },
    );

    if (!response.ok) {
      // A 403 here is the backend saying "no", not a failure to ask.
      if (response.status === 401 || response.status === 403) return false;
      return null;
    }

    const data = (await response.json()) as AddonAccessResponse;
    return typeof data?.has_access === "boolean" ? data.has_access : null;
  } catch {
    return null;
  }
}
```

<sub>60 lines</sub>

#### `lib/profile-image.ts`

```ts
import * as React from "react";

/**
 * Locally-stored profile picture.
 *
 * The backend has no avatar field yet, so the S3 URL returned by the local
 * upload endpoints is kept in localStorage and read by the settings page, the
 * top bar trigger and the profile dropdown. This is per-device by design —
 * swap the storage for the API call once the endpoint exists.
 */

export const PROFILE_IMAGE_STORAGE_KEY = "flowcasta:profile-image";

/** Fired whenever the stored image changes, so open UI can re-read it. */
export const PROFILE_IMAGE_UPDATED_EVENT = "flowcasta:profile-image-updated";

export function getProfileImage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PROFILE_IMAGE_STORAGE_KEY);
  } catch {
    // Private-mode / blocked storage: fall back to initials.
    return null;
  }
}

export function setProfileImage(url: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_IMAGE_STORAGE_KEY, url);
  } catch {
    // Ignore quota/permission errors — the upload still succeeded.
  }
  window.dispatchEvent(new Event(PROFILE_IMAGE_UPDATED_EVENT));
}

export function clearProfileImage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_IMAGE_STORAGE_KEY);
  } catch {
    // Ignore.
  }
  window.dispatchEvent(new Event(PROFILE_IMAGE_UPDATED_EVENT));
}

/**
 * React hook returning the current profile image URL. Re-reads on our own
 * update event and on cross-tab `storage` events. Starts as `null` so the
 * server render and the first client render agree (no hydration mismatch).
 */
export function useProfileImage(): string | null {
  const [image, setImage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const read = () => setImage(getProfileImage());
    read();

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === PROFILE_IMAGE_STORAGE_KEY) {
        read();
      }
    };

    window.addEventListener(PROFILE_IMAGE_UPDATED_EVENT, read);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROFILE_IMAGE_UPDATED_EVENT, read);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return image;
}
```

<sub>74 lines</sub>

#### `stores/workspace-store.ts`

> Zustand store: the single source of truth for workspaces across Settings, the workspace details page and the workspace switcher.

```ts
"use client";

import { create } from "zustand";
import workspaceService from "@/services/Worskpaces";

export interface Workspace {
  id: string;
  name: string;
  members: number;
  image: string | null;
  active: boolean;
}

type WorkspaceStore = {
  workspaces: Workspace[];
  isLoading: boolean;
  isCreatingWorkspace: boolean;
  isChangingWorkspace: boolean;
  isUpdatingWorkspace: boolean;
  isDeletingWorkspace: boolean;
  hasLoaded: boolean;
  error: string | null;
  reset: () => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (input: {
    name: string;
    imagePreview: string | null;
    logoFile: File | null;
  }) => Promise<Workspace | null>;
  activateWorkspace: (id: string) => Promise<void>;
  updateWorkspace: (workspace: Workspace) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
};

const initialState = {
  workspaces: [] as Workspace[],
  isLoading: false,
  isCreatingWorkspace: false,
  isChangingWorkspace: false,
  isUpdatingWorkspace: false,
  isDeletingWorkspace: false,
  hasLoaded: false,
  error: null as string | null,
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  ...initialState,

  reset: () => {
    set({ ...initialState });
  },

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspaceService.getAllWorkspaces();

      const mapped: Workspace[] = (response.userWorkspaces ?? []).map(
        (item: any) => ({
          id: String(item.workspace.id),
          name: item.workspace.name,
          members: Number(item.user_count) || 1,
          image: item.workspace.logo || null,
          active: Number(item.is_active) === 1,
        }),
      );

      // Ensure at least one workspace is marked as active
      if (mapped.length > 0 && !mapped.some((w) => w.active)) {
        mapped[0].active = true;
      }

      set({
        workspaces: mapped,
        isLoading: false,
        hasLoaded: true,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  createWorkspace: async (input) => {
    set({ isCreatingWorkspace: true, error: null });

    try {
      await workspaceService.createWorkspace({
        name: input.name,
        slug: slugify(input.name),
        is_default: 0,
        logo: input.logoFile,
      });

      await get().fetchWorkspaces();

      const createdWorkspace = get().workspaces.find(
        (workspace) =>
          workspace.name.toLowerCase() === input.name.toLowerCase(),
      );

      set({ isCreatingWorkspace: false });
      return createdWorkspace || null;
    } catch (error) {
      set({
        isCreatingWorkspace: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  activateWorkspace: async (id) => {
    const workspaceId = Number(id);
    if (Number.isNaN(workspaceId)) {
      throw new Error("Invalid workspace id.");
    }

    set({ isChangingWorkspace: true, error: null });

    try {
      await workspaceService.activateWorkspace({ id: workspaceId });
      await get().fetchWorkspaces();
      set({ isChangingWorkspace: false });
    } catch (error) {
      set({
        isChangingWorkspace: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  updateWorkspace: async (workspace) => {
    const workspaceId = Number(workspace.id);
    if (Number.isNaN(workspaceId)) {
      throw new Error("Invalid workspace id.");
    }

    set({ isUpdatingWorkspace: true, error: null });

    try {
      await workspaceService.updateWorkspace({
        id: workspaceId,
        name: workspace.name,
        slug: slugify(workspace.name),
        is_default: workspace.active ? 1 : 0,
      });

      await get().fetchWorkspaces();
      set({ isUpdatingWorkspace: false });
    } catch (error) {
      set({
        isUpdatingWorkspace: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  deleteWorkspace: async (id) => {
    const workspaceId = Number(id);
    if (Number.isNaN(workspaceId)) {
      throw new Error("Invalid workspace id.");
    }

    set({ isDeletingWorkspace: true, error: null });

    try {
      await workspaceService.deleteWorkspace({ id: workspaceId });
      await get().fetchWorkspaces();
      set({ isDeletingWorkspace: false });
    } catch (error) {
      set({
        isDeletingWorkspace: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
}));
```

<sub>192 lines</sub>

#### `services/Upload.ts`

> TRIMMED: image + gif uploads only.

```ts
// TRIMMED for the handoff: only the image/gif uploads used by the Settings
// profile photo and the White Label logo/favicon/carousel pickers. The full
// Flowcasta service also has uploadVideo (S3 presign) and uploadAudio.
import api from "./api/api";
import { LOCAL_UPLOAD_MAX_BYTES } from "@/lib/plan";
import type {
  LocalUploadResult,
  uploadGifResponse,
  uploadLocalImageResponse,
} from "@/types/types";

/** Human-readable form of the multipart (image/audio/gif) ceiling. */
export const LOCAL_UPLOAD_MAX_LABEL = `${Math.round(
  LOCAL_UPLOAD_MAX_BYTES / (1024 * 1024),
)} MB`;

export class LocalUploadTooLargeError extends Error {
  constructor() {
    super(
      `Files uploaded from your device must be ${LOCAL_UPLOAD_MAX_LABEL} or smaller. Import larger files from a public URL instead.`,
    );
    this.name = "LocalUploadTooLargeError";
  }
}

/** Throws before any network call when the picked file breaks the cap. */
export function assertWithinLocalUploadLimit(file: File) {
  if (file.size > LOCAL_UPLOAD_MAX_BYTES) {
    throw new LocalUploadTooLargeError();
  }
}

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

async function postFile<T>(
  endpoint: string,
  fieldName: string,
  file: File,
): Promise<T> {
  assertWithinLocalUploadLimit(file);

  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await api.post<T>(endpoint, formData, MULTIPART);
  return response.data;
}

const UploadService = {
  /** Static images (png/jpg/webp…). Use `uploadGif` for animated gifs. */
  uploadImage: async (file: File): Promise<LocalUploadResult> => {
    const data = await postFile<uploadLocalImageResponse>(
      "/upload-loacal-image", // sic — this is the real backend route
      "image",
      file,
    );
    return { status: data.status, url: data.url, message: data.message };
  },

  uploadGif: async (file: File): Promise<LocalUploadResult> => {
    const data = await postFile<uploadGifResponse>(
      "/upload-gif",
      "gif_file",
      file,
    );
    return { status: data.status, url: data.filePath, message: data.message };
  },
};

export default UploadService;
```

<sub>70 lines</sub>

#### `services/Projects.ts`

> TRIMMED: only the three calls Integrations needs.

```ts
// TRIMMED for the handoff: only the three calls the Integrations pages make
// (finding / unlinking projects that still use a channel before it is deleted).
// The full Flowcasta ProjectService also covers create/update/go-live/schedules.
import api from "./api/api";
import type {
  getProjectsResponse,
  getProjectDestinationsResponse,
  deleteProjectDestinationResponse,
} from "@/types/types";

const ProjectService = {
  getProjects: async () => {
    try {
      const res = await api.get<getProjectsResponse>(`/projects`);
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  getProjectDestinations: async (id: number) => {
    try {
      const res = await api.get<getProjectDestinationsResponse>(
        `/projects/${id}/destinations`,
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  unlinkProjectDestination: async (id: number, destinationId: number) => {
    try {
      const res = await api.delete<deleteProjectDestinationResponse>(
        `/projects/${id}/destinations/${destinationId}`,
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  },
};

export default ProjectService;
```

<sub>44 lines</sub>


---

## 7. UI primitives (keep the props API, re-skin the markup)

These are the shared building blocks the pages import. **Keep the exported names and props** (`variant`, `size`, `open`, `onOpenChange`, `title`, …) so page code ports unchanged. Restyle the internals with the new tokens.

#### `components/ui/Button.tsx`

```tsx
"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "brand"
  | "secondary"
  | "ghost"
  | "outline"
  | "destructive";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

const variantClasses: Record<ButtonVariant, string> = {
  brand:
    "border border-transparent bg-[var(--brand)] text-white shadow-[var(--shadow-brand-sm)] hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-overlay)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]",
  outline:
    "border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:border-[var(--brand)] hover:text-[var(--brand)]",
  destructive:
    "border border-transparent bg-[var(--danger-muted)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-7 rounded-[var(--radius-sm)] px-3 text-xs",
  sm: "h-8 rounded-[var(--radius-sm)] px-3 text-sm",
  md: "h-9 rounded-[var(--radius-md)] px-4 text-sm",
  lg: "h-11 rounded-[var(--radius-md)] px-6 text-base",
  xl: "h-13 rounded-[var(--radius-lg)] px-8 text-lg",
};

// export interface ButtonProps extends Omit<
//   React.ButtonHTMLAttributes<HTMLButtonElement>,
//   "color"
// > {
//   variant?: ButtonVariant;
//   size?: ButtonSize;
// }
export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "color"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "brand", size = "md", ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={variant === "brand" ? { scale: 1.02 } : undefined}
        whileTap={variant === "brand" ? { scale: 0.98 } : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
```

<sub>67 lines</sub>

#### `components/ui/Modal.tsx`

```tsx
"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl" | "xxl" | "xxxl" | "4xl";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[480px]",
  lg: "max-w-[600px]",
  xl: "max-w-[720px]",
  xxl: "max-w-[840px]",
  xxxl: "max-w-[960px]",
  "4xl": "max-w-[1240px]"
};

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  /**
   * Preferred panel height. Treated as a *maximum*, never a fixed height, and
   * always clamped to the viewport — a hard pixel value (e.g. "500px") used to
   * push the footer off-screen on short/mobile viewports.
   */
  maxHeight?: string | null;
  showBrandGlow?: boolean;
  /**
   * Optional content rendered beside the panel (outside its border), for
   * modals that float an illustration or guide next to the dialog. The
   * element owns its own responsive visibility.
   */
  aside?: React.ReactNode;
  /**
   * Stacking base for the overlay (content sits one above it). Defaults to the
   * standard 50/51.
   *
   * Only needed when the modal is opened from UI that already sits on an
   * unusually high layer — the Flow AI panel goes full-screen on mobile at a
   * near-maximum z-index, and this dialog portals to `<body>`, so the two share
   * a stacking context and the default would render behind it.
   */
  zIndexBase?: number;
}

export function Modal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  maxHeight = "auto",
  showBrandGlow,
  aside,
  zIndexBase,
}: ModalProps) {
  // The panel owns its own width so the shrink-to-fit dialog wrapper has
  // something concrete to measure: `w-[calc(100vw-1.5rem)]` keeps a gutter on
  // phones, and the size class caps it on larger screens. Height is capped
  // against the dynamic viewport (dvh accounts for mobile browser chrome) so
  // the sticky footer can never be pushed off-screen.
  const viewportHeightCap = "calc(100dvh - 1.5rem)";
  const panelMaxHeight =
    maxHeight && maxHeight !== "auto"
      ? `min(${maxHeight}, ${viewportHeightCap})`
      : viewportHeightCap;

  const panel = (
    <div
      className={cn(
        "flex w-[calc(100vw-1.5rem)] flex-col rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface)]",
        sizeClasses[size],
      )}
      style={{
        maxHeight: panelMaxHeight,
        boxShadow: showBrandGlow
          ? "0 0 0 1px var(--brand-faint) inset, var(--shadow-lg)"
          : "var(--shadow-lg)",
      }}
    >
      {/* Header — never scrolls */}
      <header className="relative shrink-0 border-b border-[var(--border-subtle)] px-4 py-4 pr-14 sm:px-6 sm:py-5">
        <Dialog.Title className="text-display-sm text-[var(--text-primary)]">
          {title}
        </Dialog.Title>
        {subtitle ? (
          <Dialog.Description className="mt-0.5 text-body-sm text-[var(--text-muted)]">
            {subtitle}
          </Dialog.Description>
        ) : null}
        <Dialog.Close className="absolute right-3 top-3 grid size-8 place-items-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] sm:right-4 sm:top-4">
          <X size={16} />
        </Dialog.Close>
      </header>

      {/* Body — takes remaining space and scrolls internally */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        {children}
      </div>

      {/* Footer — never scrolls */}
      {footer ? (
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] px-4 py-3 sm:px-6 sm:py-4">
          {footer}
        </footer>
      ) : null}
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                // Inline style wins over the class, so the default stays 50.
                style={
                  zIndexBase === undefined ? undefined : { zIndex: zIndexBase }
                }
                className="w-full fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                style={
                  zIndexBase === undefined
                    ? undefined
                    : { zIndex: zIndexBase + 1 }
                }
                className="fixed left-1/2 top-1/2 z-[51] w-fit max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2"
              >
                {aside ? (
                  <div className="flex items-center justify-center gap-4 xl:gap-7">
                    {aside}
                    {panel}
                  </div>
                ) : (
                  panel
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
```

<sub>167 lines</sub>

#### `components/ui/Input.tsx`

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "prefix" | "suffix"
>;

interface InputProps extends NativeInputProps {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}
// prefix and suffix can be used for things like currency symbols, units, or icons.
// They are optional and will be displayed inside the input field, aligned to the left (prefix) or right (suffix)
// of the user's input.

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, suffix, id, ...props }, ref) => {
    const inputId = id ?? "custom id";

    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-1.5 block font-display text-[13px] font-semibold tracking-[0.01em] text-[var(--text-secondary)]"
          >
            {label}
          </label>
        ) : null}

        <div
          className={cn(
            "flex h-11 items-center rounded-[var(--radius-md)] border bg-[var(--surface-raised)] px-3",
            error
              ? "border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-muted)]"
              : "border-[var(--border)] focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-muted)]",
          )}
        >
          {prefix ? (
            <span className="mr-2 text-[var(--text-muted)]">{prefix}</span>
          ) : null}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "h-full w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none",
              className,
            )}
            {...props}
          />
          {suffix ? (
            <span className="ml-2 text-[var(--text-muted)]">{suffix}</span>
          ) : null}
        </div>

        {error ? (
          <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
```

<sub>67 lines</sub>

#### `components/ui/Switch.tsx`

```tsx
"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-6 w-11 rounded-full border border-[var(--border)] bg-[var(--surface-overlay)] transition data-[state=checked]:border-[var(--brand)] data-[state=checked]:bg-[var(--brand-muted)]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-[var(--text-secondary)] transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-[var(--brand)]" />
    </SwitchPrimitive.Root>
  );
}
```

<sub>22 lines</sub>

#### `components/ui/Select.tsx`

```tsx
"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  /** Extra classes for the dropdown popup — e.g. a higher z-index when the
   *  select sits inside a modal (Dialog content is z-[51], popup default is
   *  z-50, so without this the options render underneath the modal). */
  contentClassName?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  contentClassName,
}: SelectProps) {
  const normalizedOptions = React.useMemo(
    () => options.filter((option) => option.value !== ""),
    [options],
  );
  const normalizedValue = normalizedOptions.some(
    (option) => option.value === value,
  )
    ? value
    : "";

  React.useEffect(() => {
    if (options.some((option) => option.value === "")) {
      console.warn("[FlowCasta][Select] EMPTY_OPTION_VALUE_DROPPED", {
        optionCount: options.length,
      });
    }
  }, [options]);

  return (
    <SelectPrimitive.Root value={normalizedValue} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder ?? "Select"} />
        <SelectPrimitive.Icon>
          <ChevronDown size={16} className="text-[var(--text-muted)]" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "z-50 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-overlay)] shadow-[var(--shadow-lg)]",
            contentClassName,
          )}
        >
          <SelectPrimitive.Viewport className="p-1.5">
            {normalizedOptions.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center rounded-[var(--radius-sm)] py-2 pl-8 pr-2 text-sm text-[var(--text-secondary)] outline-none transition focus:bg-[var(--surface-raised)] focus:text-[var(--text-primary)]"
              >
                <span className="absolute left-2 inline-flex items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check size={14} className="text-[var(--brand)]" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
```

<sub>94 lines</sub>

#### `components/ui/Badge.tsx`

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "live"
  | "pro"
  | "draft"
  | "scheduled";

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "border border-[var(--border)] bg-[var(--surface-overlay)] text-[var(--text-secondary)]",
  brand:
    "border border-[var(--brand-border)] bg-[var(--brand-muted)] text-[var(--brand)]",
  success:
    "border border-transparent bg-[var(--success-muted)] text-[var(--success)]",
  warning:
    "border border-transparent bg-[var(--warning-muted)] text-[var(--warning)]",
  danger:
    "border border-transparent bg-[var(--danger-muted)] text-[var(--danger)]",
  live: "border border-transparent bg-[var(--danger-muted)] text-[var(--danger)]",
  pro: "border border-transparent bg-[var(--gradient-brand)] text-white font-bold",
  draft:
    "border border-[var(--border)] bg-[var(--surface-overlay)] text-[var(--text-muted)]",
  scheduled:
    "border border-[var(--brand-border)] bg-[var(--brand-muted)] text-[var(--brand)]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-body-xs font-semibold uppercase",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {variant === "live" ? (
        <span className="size-1.5 rounded-full bg-[var(--danger)] animate-[live-dot_1.2s_ease-in-out_infinite]" />
      ) : null}
      {children}
    </span>
  );
}
```

<sub>59 lines</sub>

#### `components/ui/Card.tsx`

```tsx
"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cardHover } from "@/lib/animations";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "brand";

export interface CardProps extends Omit<HTMLMotionProps<"div">, "color"> {
  hoverable?: boolean;
  variant?: CardVariant;
}

export function Card({
  className,
  hoverable,
  variant = "default",
  ...props
}: CardProps) {
  const base = cn(
    "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    variant === "brand" &&
      "border-[var(--brand-border)] bg-[linear-gradient(135deg,var(--brand-wash)_0%,var(--surface)_60%)]",
    className,
  );

  if (!hoverable) {
    return <motion.div className={base} {...props} />;
  }

  return (
    <motion.div
      initial="rest"
      animate="rest"
      whileHover="hover"
      variants={cardHover}
      className={cn(base, "hover:border-[var(--border-strong)]")}
      {...props}
    />
  );
}
```

<sub>43 lines</sub>

#### `components/ui/Tabs.tsx`

```tsx
"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

type TabsVariant = "pill" | "underline";

interface TabsContextValue {
  variant: TabsVariant;
}

const TabsStyleContext = React.createContext<TabsContextValue>({
  variant: "pill",
});

interface TabsProps extends React.ComponentProps<typeof TabsPrimitive.Root> {
  variant?: TabsVariant;
}

export function Tabs({ variant = "pill", children, ...props }: TabsProps) {
  return (
    <TabsStyleContext.Provider value={{ variant }}>
      <TabsPrimitive.Root {...props}>{children}</TabsPrimitive.Root>
    </TabsStyleContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const { variant } = React.useContext(TabsStyleContext);

  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-2",
        variant === "pill" && "rounded-[var(--radius-full)]",
        variant === "underline" && "border-b border-[var(--border-subtle)]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { variant } = React.useContext(TabsStyleContext);

  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-[var(--radius-full)] px-4 py-2 text-sm font-medium transition",
        variant === "pill" &&
          "border border-transparent bg-[var(--surface-raised)] text-[var(--text-secondary)] data-[state=active]:bg-[var(--brand)] data-[state=active]:text-white",
        variant === "underline" &&
          "rounded-none border-b-2 border-transparent bg-transparent px-2.5 text-[var(--text-secondary)] data-[state=active]:border-[var(--brand)] data-[state=active]:text-[var(--brand)]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-4", className)} {...props} />;
}
```

<sub>74 lines</sub>

#### `components/ui/Tooltip.tsx`

```tsx
"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={120}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-overlay)] px-2 py-1 text-xs text-[var(--text-secondary)] shadow-[var(--shadow-lg)]",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
```

<sub>35 lines</sub>

#### `components/ui/Avatar.tsx`

```tsx
"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--brand)] bg-[var(--surface-raised)]",
        className,
      )}
      {...props}
    />
  );
}

export function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      className={cn("size-full object-cover", className)}
      {...props}
    />
  );
}

export function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center text-xs font-semibold uppercase text-[var(--brand)]",
        className,
      )}
      {...props}
    />
  );
}
```

<sub>47 lines</sub>

#### `components/ui/Toaster.tsx`

```tsx
"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      gutter={12}
      containerStyle={{ top: 16, right: 16 }}
      toastOptions={{ duration: 4000 }}
    />
  );
}
```

<sub>14 lines</sub>

#### `components/ui/PageSkeletons.tsx`

```tsx
function SkeletonBlock({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-border/55 ${className}`} />
  );
}

// Root skeleton loader
export function RootPageSkeleton() {
  return (
    <div className="min-h-screen bg-dark-bg px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <SkeletonBlock className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-32 w-full" />
        </div>
        <SkeletonBlock className="h-85 w-full" />
      </div>
    </div>
  );
}

// Auth page skeleton loader
export function AuthPageSkeleton() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-dark-bg px-4 py-8">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center">
        <div className="w-full lg:w-1/2">
          <div className="mx-auto max-w-105 rounded-2xl border border-border bg-card-bg/80 p-8 backdrop-blur-xl">
            <SkeletonBlock className="mb-6 h-8 w-36" />
            <SkeletonBlock className="mb-2 h-4 w-52" />
            <SkeletonBlock className="mb-8 h-4 w-44" />
            <div className="space-y-4">
              <SkeletonBlock className="h-11 w-full" />
              <SkeletonBlock className="h-11 w-full" />
              <SkeletonBlock className="h-11 w-full" />
            </div>
          </div>
        </div>

        <div className="hidden w-1/2 lg:block">
          <div className="h-[72vh] rounded-3xl border border-border bg-card-bg/30 p-6">
            <SkeletonBlock className="mb-4 h-8 w-56" />
            <SkeletonBlock className="h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <SkeletonBlock className="h-80 w-full lg:col-span-2" />
        <SkeletonBlock className="h-80 w-full lg:col-span-2" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SkeletonBlock className="h-95 w-full xl:col-span-2" />
        <SkeletonBlock className="h-95 w-full" />
      </div>
    </div>
  );
}

export function DashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-14 w-full" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <SkeletonBlock className="h-80 w-full lg:col-span-2" />
        <SkeletonBlock className="h-80 w-full lg:col-span-2" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SkeletonBlock className="h-95 w-full xl:col-span-2" />
        <SkeletonBlock className="h-95 w-full" />
      </div>
    </div>
  );
}

export function AnalysisPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-60" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </div>

      <SkeletonBlock className="h-14 w-full" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SkeletonBlock className="h-80 w-full lg:col-span-2" />
        <SkeletonBlock className="h-80 w-full" />
      </div>

      <SkeletonBlock className="h-96 w-full" />
    </div>
  );
}

export function CalendarContentSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonBlock className="h-30 w-full" />
        <SkeletonBlock className="h-30 w-full" />
        <SkeletonBlock className="h-30 w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <SkeletonBlock className="h-145 w-full" />
        <div className="space-y-4">
          <SkeletonBlock className="h-70 w-full" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
      </div>

      <SkeletonBlock className="h-100 w-full" />
    </div>
  );
}
```

<sub>174 lines</sub>

#### `components/motion/StaggerList.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

export function StaggerList({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul";
}) {
  const Tag = as === "ul" ? motion.ul : motion.div;

  return (
    <Tag
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}
```

<sub>28 lines</sub>


---

## 8. Route gating (`proxy.ts`)

Copy the auth, admin and white-label rules. Drop Flowcasta-specific paths (Flow AI, lead-capture `/go`, guest rooms) that the new app doesn't have.

#### `proxy.ts`

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canUseAiFeatures, type AiAccessSession } from "@/lib/plan-core";
import { hasWhiteLabel } from "@/lib/subscription";
import { fetchWhiteLabelAccess } from "@/lib/white-label-access";
import type { AllUserSubscriptionsNew } from "@/types/types";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/appsumo",
  "/forgot-password",
  "/reset-password",
  "/privacy-policy",
  "/refund-policy",
  "/terms-of-service",
  "/guest",
  "/guest-invites",
  "/guest-room",
  // Public lead capture pages. The audience arrives from a stream chat link
  // and has no account — an auth redirect here would lose every lead.
  // Matching is exact or prefixed with a slash, so the authenticated
  // /lead-capture dashboard is deliberately NOT covered by this entry.
  "/go",
]);

const AUTH_REDIRECT_PATHS = new Set([
  "/login",
  "/register",
  "/appsumo",
  "/forgot-password",
  "/reset-password",
]);

/** /studio/flow-ai/… and /studio/:id/flow-ai/… */
const FLOW_AI_PATH = /^\/studio(?:\/[^/]+)?\/flow-ai(?:\/|$)/;

/** /admin and everything under it. */
const ADMIN_PATH = /^\/admin(?:\/|$)/;

/** /marketing-assets — the White Label sales kit. */
const MARKETING_ASSETS_PATH = /^\/marketing-assets(?:\/|$)/;

/**
 * Self-service registration is closed for now, so /register is bounced rather
 * than rendered. The sign-up links that pointed here are commented out at
 * their call sites (LoginView, GuestHeader, GuestHelpPanel) — this covers the
 * direct-URL and stale-link cases those cannot.
 *
 * `/register` deliberately stays in PUBLIC_PATHS and AUTH_REDIRECT_PATHS:
 * those entries are inert while this redirect stands, and leaving them means
 * reopening registration is just deleting this block and uncommenting the
 * links.
 */
const REGISTER_PATH = /^\/register(?:\/|$)/;

/**
 * Flow AI is gated to admins and Reseller-tier subscribers. The session cookie
 * carries both, so the check happens here rather than after the page has
 * already loaded and started calling the agent's endpoints.
 */
const sessionCanUseAi = (request: NextRequest): boolean => {
  const raw = request.cookies.get("authUser")?.value;
  if (!raw) return false;

  try {
    return canUseAiFeatures(JSON.parse(raw) as AiAccessSession);
  } catch {
    // An unreadable cookie is treated as no access rather than full access.
    return false;
  }
};

/**
 * Whether the session cookie claims the admin role.
 *
 * Like `sessionCanUseAi`, this reads a cookie the client writes and can edit,
 * so it is navigation UX rather than an authorisation boundary: it stops a
 * signed-in non-admin from wandering into `/admin`, and nothing more. Every
 * admin endpoint returns 403 on its own, so a forged cookie buys the sight of
 * a shell whose every request fails.
 */
const sessionIsAdmin = (request: NextRequest): boolean => {
  const raw = request.cookies.get("authUser")?.value;
  if (!raw) return false;

  try {
    return (JSON.parse(raw) as { role?: string }).role === "admin";
  } catch {
    // An unreadable cookie is treated as no access rather than full access.
    return false;
  }
};

/**
 * Whether this session owns the `reseller_seats` add-on — sold on the front
 * end as White Label, and what the marketing sales kit ships with.
 *
 * Two gates. The cookie is read first because it costs nothing and refuses
 * most non-owners outright; it is client-written, so it is only ever allowed
 * to refuse. Anything it lets through is then confirmed against the backend,
 * which is the authority.
 *
 * This runs on one path only, so the extra round trip never touches ordinary
 * navigation. An unanswered check falls back to the cookie: the page verifies
 * again on mount and the download route refuses outright, so failing open here
 * costs nothing and keeps a paying reseller out of a redirect loop when the
 * API is briefly unreachable.
 */
const sessionHasWhiteLabel = async (request: NextRequest): Promise<boolean> => {
  const raw = request.cookies.get("authUser")?.value;
  if (!raw) return false;

  let userId: number | null = null;
  try {
    const session = JSON.parse(raw) as {
      id?: number;
      subscriptions?: AllUserSubscriptionsNew | null;
    };
    if (!hasWhiteLabel(session.subscriptions)) return false;
    userId = typeof session.id === "number" ? session.id : null;
  } catch {
    // An unreadable cookie is treated as no access rather than full access.
    return false;
  }

  const token = request.cookies.get("authToken")?.value;
  const verified = await fetchWhiteLabelAccess(userId, token);
  // `null` is "couldn't ask", not "no" — the cookie already said yes.
  return verified !== false;
};

/**
 * Pages that only exist for Flowcasta's own customers. They stay in
 * PUBLIC_PATHS — signed-out visitors on the vendor host must still reach them.
 */
const VENDOR_ONLY_PATHS = new Set([
  "/privacy-policy",
  "/refund-policy",
  "/terms-of-service",
]);

/**
 * Whether the request arrived on the Flowcasta host rather than a reseller's
 * custom domain. `x-forwarded-host` wins because tenant traffic reaches us
 * through Cloudflare and Vercel's proxy; local development always counts as
 * the vendor host so these pages stay reachable with `npm run dev`.
 *
 * Mirrors `isDefaultAppHost` in config/brand.ts, inlined because the proxy
 * runs on the edge runtime and should not pull in the brand module.
 */
const isVendorHost = (request: NextRequest): boolean => {
  const rawHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";

  const host = rawHost.trim().toLowerCase().split(":")[0];
  const appHost = (process.env.NEXT_PUBLIC_APP_HOST ?? "studio.flowcasta.com")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];

  return (
    host === appHost ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0"
  );
};

const isPublicPath = (pathname: string) => {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  for (const path of PUBLIC_PATHS) {
    if (pathname.startsWith(path + "/")) {
      return true;
    }
  }

  return false;
};

// Async because the White Label gate below confirms the cookie against the
// backend before opening /marketing-assets.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value;

  // Flowcasta's own legal documents. A reseller's customers have no
  // relationship with us, so on a white-label domain these URLs must not
  // resolve at all — the links are hidden in the UI, this covers direct hits.
  if (VENDOR_ONLY_PATHS.has(pathname) && !isVendorHost(request)) {
    // No route matches this path, so Next renders app/not-found.tsx with a 404.
    return NextResponse.rewrite(new URL("/_vendor-only", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(token ? "/home" : "/login", request.url),
    );
  }

  // Before the auth checks, so it applies whether or not someone is signed in.
  // Signed-in visitors go to /home rather than bouncing through /login only to
  // be redirected again by the rule below.
  if (REGISTER_PATH.test(pathname)) {
    return NextResponse.redirect(
      new URL(token ? "/home" : "/login", request.url),
    );
  }

  if (!token && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && AUTH_REDIRECT_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Sits after the auth redirects above, so a signed-out visitor still lands
  // on /login rather than being bounced to /home by this.
  if (ADMIN_PATH.test(pathname) && !sessionIsAdmin(request)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // The sales kit ships with the White Label add-on. Sent to the tab that
  // sells it rather than to /home, so the redirect explains itself.
  if (
    MARKETING_ASSETS_PATH.test(pathname) &&
    !(await sessionHasWhiteLabel(request))
  ) {
    return NextResponse.redirect(
      new URL("/upgrade?tab=whitelabel", request.url),
    );
  }

  if (FLOW_AI_PATH.test(pathname) && !sessionCanUseAi(request)) {
    return NextResponse.redirect(new URL("/upgrade", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
```

<sub>254 lines</sub>


---

## 9. Settings shell (Profile · Workspaces · Subscriptions · Team Members)

**Flow summary**
- Tabs are driven by `?tab=`. `SettingsParamsReader` (wrapped in Suspense) reads the URL and `handleTabChange` updates local state first, then calls `router.replace`. This avoids a production full-refresh. Keep this pattern.
- **Profile:** avatar initials or a local photo (upload → `UploadService.uploadImage/uploadGif` → `localStorage`), name/email, change password with a 4-bar strength meter. *(See quirk 1: save is a toast only.)*
- **Workspaces:** list from `useWorkspaceStore`. "Add" opens `WorkspaceModal` through `?workspaceModal=create` (deep-linkable). Edit → `updateWorkspace` and, if toggled active, `activateWorkspace`. Delete goes through `ConfirmDeleteWorkspaceModal`. Each card has **View Details** (→ `/workspaces/:id`) and **Configure White Label** (gated by `hasWhiteLabel`, otherwise opens `WhiteLabelUpgradeModal`). Member counts come from the team list grouped by workspace, falling back to `workspace.members`.
- **Subscriptions:** nested tabs. *Active Plans* builds from `sessionUser.subscriptions` via `getActivePlan` + `PLAN_META`. It shows Renews / Expires / Lifetime. **Cancel plan** (non-lifetime only) opens a confirm modal, calls `cancelSubscription(id)`, then marks the plan cancelled optimistically. When cancelled, the card shows "Renewal cancelled" and a "Pay now" link to `/upgrade`. *Add Ons* lists only valid add-ons (`reseller_seats` → "White Label").
- **Team Members:** `GET /team` returns users and the workspaces the owner can assign. Add and edit share one modal: first/last/email/role (`team_member | client | editor | admin`), password (required on add, optional on edit, sent through the separate `/team/update/password` call), and workspace checkboxes. The payload sends `user_access: [{ id, has_access }]` for **every** available workspace. The active workspace is pre-ticked on add.

#### `app/(dashboard)/settings/layout.tsx`

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage your account, profile, subscriptions, team members, and workspaces",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

<sub>16 lines</sub>

#### `app/(dashboard)/settings/page.tsx`

```tsx
"use client";

import * as Select from "@radix-ui/react-select";
import * as Tabs from "@radix-ui/react-tabs";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Palette,
  Plus,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmDeleteWorkspaceModal } from "@/components/modals/ConfirmDeleteWorkspaceModal";
import {
  WorkspaceModal,
  type WorkspaceFormValues,
} from "@/components/modals/WorkspaceModal";
import {
  ConfigureWhiteLabelModal,
  type WhiteLabelFormValues,
} from "@/components/modals/ConfigureWhiteLabelModal";
import { WhiteLabelUpgradeModal } from "@/components/modals/WhiteLabelUpgradeModal";
import { toast } from "@/lib/toast";
import { getSessionUserFromCookie, type SessionUser } from "@/lib/auth-session";
import teamMemberService from "@/services/Teammember";
import { useWorkspaceStore, type Workspace } from "@/stores/workspace-store";
import type { SubscriptionDataNew, User } from "@/types/types";
import { getActivePlan, PLAN_META } from "@/lib/plan";
import {
  getNextBillingDate,
  formatBillingDate,
  isValidAddon,
  hasWhiteLabel,
} from "@/lib/subscription";
import { getErrorMessage } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import SubscriptionService from "@/services/Subscriptions";
import UploadService, { LOCAL_UPLOAD_MAX_LABEL } from "@/services/Upload";
import {
  clearProfileImage,
  setProfileImage,
  useProfileImage,
} from "@/lib/profile-image";

const timezoneOptions = [
  "UTC",
  "Africa/Lagos",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
] as const;

type TeamMemberFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  password: string;
  confirmPassword: string;
  workspaceIds: number[];
};

type WorkspaceOption = {
  id: number;
  name: string;
};

type SettingsTab = "profile" | "workspaces" | "subscriptions" | "team-members";

function normalizeSettingsTab(tab: string | null): SettingsTab {
  if (
    tab === "profile" ||
    tab === "workspaces" ||
    tab === "subscriptions" ||
    tab === "team-members"
  ) {
    return tab;
  }

  return "profile";
}

function toReadableLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function createEmptyTeamMemberForm(): TeamMemberFormState {
  return {
    firstName: "",
    lastName: "",
    email: "",
    role: "team_member",
    password: "",
    confirmPassword: "",
    workspaceIds: [],
  };
}

function getStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  return checks.filter(Boolean).length;
}

function strengthColor(strength: number, index: number) {
  if (index >= strength) {
    return "bg-[var(--border)]";
  }
  if (strength <= 1) {
    return "bg-red-500";
  }
  if (strength === 2) {
    return "bg-orange-400";
  }
  if (strength === 3) {
    return "bg-yellow-400";
  }
  return "bg-[var(--brand)]";
}

function getTeamMemberWorkspaceIds(member: User): number[] {
  const idsFromRelations =
    member.all_user_workspaces
      ?.map((entry) => Number(entry.id))
      .filter((id) => !Number.isNaN(id)) ?? [];

  if (idsFromRelations.length > 0) {
    return idsFromRelations;
  }

  return (
    member.user_workspaces
      ?.map((id) => Number(id))
      .filter((id) => !Number.isNaN(id)) ?? []
  );
}

// Reads the URL search params in full isolation. Keeping useSearchParams in a
// dedicated, Suspense-wrapped child (instead of inside the page body) avoids the
// production full-refresh behaviour when switching tabs.
function SettingsParamsReader({
  onChange,
}: {
  onChange: (tab: SettingsTab, workspaceModal: string | null) => void;
}) {
  const searchParams = useSearchParams();
  const tab = normalizeSettingsTab(searchParams.get("tab"));
  const workspaceModal = searchParams.get("workspaceModal");

  useEffect(() => {
    onChange(tab, workspaceModal);
  }, [tab, workspaceModal, onChange]);

  return null;
}

export default function SettingsPage() {
  const [urlTab, setUrlTab] = useState<SettingsTab>("profile");
  const [workspaceModalParam, setWorkspaceModalParam] = useState<string | null>(
    null,
  );

  const handleParamsChange = useCallback(
    (tab: SettingsTab, workspaceModal: string | null) => {
      setUrlTab(tab);
      setWorkspaceModalParam(workspaceModal);
    },
    [],
  );

  return (
    <>
      <Suspense fallback={null}>
        <SettingsParamsReader onChange={handleParamsChange} />
      </Suspense>
      <SettingsPageContent
        urlTab={urlTab}
        workspaceModalParam={workspaceModalParam}
      />
    </>
  );
}

function SettingsPageContent({
  urlTab,
  workspaceModalParam,
}: {
  urlTab: SettingsTab;
  workspaceModalParam: string | null;
}) {
  const router = useRouter();
  const isCreateWorkspaceModalOpen = workspaceModalParam === "create";

  // Drive the tab UI from local state for an instant switch, and keep it in sync
  // with the URL param (back/forward navigation). Updating local state directly
  // — instead of waiting on the URL round-trip — avoids the production hard
  // refresh seen when switching tabs.
  const [activeTab, setActiveTab] = useState<SettingsTab>(urlTab);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  // Profile picture. Stored locally until the backend exposes an avatar field;
  // gifs go through the dedicated gif endpoint, everything else through the
  // static-image one.
  const profileImage = useProfileImage();
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);

  const handleProfileImageChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset so re-picking the same file still fires a change event.
      event.target.value = "";
      if (!file) return;

      setIsUploadingProfileImage(true);
      try {
        const isGif =
          file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
        const { url } = isGif
          ? await UploadService.uploadGif(file)
          : await UploadService.uploadImage(file);

        if (!url) {
          throw new Error("Upload succeeded but no image URL was returned.");
        }

        setProfileImage(url);
        toast.success("Profile photo updated.");
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to upload profile photo."));
      } finally {
        setIsUploadingProfileImage(false);
      }
    },
    [],
  );

  const handleRemoveProfileImage = useCallback(() => {
    clearProfileImage();
    toast.success("Profile photo removed.");
  }, []);

  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [teamMemberWorkspaces, setTeamMemberWorkspaces] = useState<
    WorkspaceOption[]
  >([]);
  const [isTeamMembersLoading, setIsTeamMembersLoading] = useState(false);
  const [isTeamMembersMutating, setIsTeamMembersMutating] = useState(false);
  const [isTeamMemberModalOpen, setIsTeamMemberModalOpen] = useState(false);
  const [teamMemberToEdit, setTeamMemberToEdit] = useState<User | null>(null);
  const [teamMemberToDelete, setTeamMemberToDelete] = useState<User | null>(
    null,
  );
  const [teamMemberForm, setTeamMemberForm] = useState<TeamMemberFormState>(
    createEmptyTeamMemberForm(),
  );
  const [workspaceToEdit, setWorkspaceToEdit] = useState<Workspace | null>(
    null,
  );
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
    null,
  );
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  
  // White label modal state
  const [workspaceToWhiteLabel, setWorkspaceToWhiteLabel] = useState<Workspace | null>(null);
  const [isWhiteLabelModalOpen, setIsWhiteLabelModalOpen] = useState(false);
  const [isWhiteLabelUpgradeOpen, setIsWhiteLabelUpgradeOpen] = useState(false);

  const [sessionUser] = useState<SessionUser | null>(() =>
    getSessionUserFromCookie(),
  );

  const {
    workspaces,
    hasLoaded,
    isLoading: isWorkspacesLoading,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    activateWorkspace,
    isCreatingWorkspace,
    isUpdatingWorkspace,
    isDeletingWorkspace,
  } = useWorkspaceStore();

  const [fullName, setFullName] = useState(sessionUser?.fullName ?? "");
  const [email, setEmail] = useState(sessionUser?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [timezone, setTimezone] =
    useState<(typeof timezoneOptions)[number]>("Africa/Lagos");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const strength = useMemo(() => getStrength(newPassword), [newPassword]);
  const passwordMismatch =
    confirmPassword.length > 0 && confirmPassword !== newPassword;

  const availableTeamWorkspaces = useMemo(() => {
    if (teamMemberWorkspaces.length > 0) {
      return teamMemberWorkspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
      }));
    }

    return workspaces
      .map((workspace) => ({
        id: Number(workspace.id),
        name: workspace.name,
      }))
      .filter((workspace) => !Number.isNaN(workspace.id));
  }, [teamMemberWorkspaces, workspaces]);

  const teamMembersByWorkspace = useMemo(() => {
    const grouped = new Map<string, User[]>();

    teamMembers.forEach((member) => {
      getTeamMemberWorkspaceIds(member).forEach((workspaceId) => {
        const key = String(workspaceId);
        const current = grouped.get(key) ?? [];
        grouped.set(key, [...current, member]);
      });
    });

    return grouped;
  }, [teamMembers]);

  // The active plan (single subscription) — cancellable when not lifetime.
  const activePlans = useMemo(() => {
    const subs = sessionUser?.subscriptions;
    if (!subs || typeof subs !== "object") {
      return [];
    }

    const plan = getActivePlan(subs);
    if (plan !== "free" && subs.subscription) {
      return [
        {
          id: subs.subscription.id ?? "plan",
          name: PLAN_META[plan].label,
          type: subs.subscription.type || "subscription",
          subscription: subs.subscription,
        },
      ];
    }

    return [];
  }, [sessionUser?.subscriptions]);

  // Active add-ons (e.g. remove_branding). These are never cancellable here.
  const additionalPackages = useMemo(() => {
    const subs = sessionUser?.subscriptions;
    const addons = subs?.addons;
    const entries: Array<{ id: string; name: string; type: string }> = [];

    if (addons && !Array.isArray(addons)) {
      for (const [key, value] of Object.entries(addons)) {
        // Only real add-ons (remove_branding) — skip legacy ViralGenius package
        // flags (viralgenius_*, reseller, reseller_seats, ...).
        if (!isValidAddon(key)) {
          continue;
        }
        if (value && typeof value === "object" && "status" in value) {
          const addon = value as { status?: boolean; type?: string };
          if (addon.status) {
            entries.push({
              id: `addon-${key}`,
              name: key === "reseller_seats" ? "White Label" : toReadableLabel(key),
              type: addon.type || "add-on",
            });
          }
        }
      }
    }

    return entries;
  }, [sessionUser?.subscriptions]);

  // Cancellation flow (single subscription model).
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<{
    id: string | number;
    name: string;
    subscription: SubscriptionDataNew;
  } | null>(null);
  const [isCancellingSubscription, setIsCancellingSubscription] =
    useState(false);
  // Tracks ids cancelled this session so the UI reflects it optimistically.
  const [cancelledSubscriptionIds, setCancelledSubscriptionIds] = useState<
    Set<string | number>
  >(new Set());

  async function handleConfirmCancelSubscription() {
    if (!subscriptionToCancel) {
      return;
    }

    setIsCancellingSubscription(true);
    try {
      await SubscriptionService.cancelSubscription(subscriptionToCancel.id);
      setCancelledSubscriptionIds((prev) =>
        new Set(prev).add(subscriptionToCancel.id),
      );
      toast.success(
        "Your plan will not auto-renew. You keep access until the current period ends.",
      );
      setSubscriptionToCancel(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to cancel subscription renewal."),
      );
    } finally {
      setIsCancellingSubscription(false);
    }
  }

  const cancelNextBillingDate = subscriptionToCancel
    ? getNextBillingDate(subscriptionToCancel.subscription)
    : null;

  const isWorkspaceMutating =
    isCreatingWorkspace || isUpdatingWorkspace || isDeletingWorkspace;

  useEffect(() => {
    if (!hasLoaded) {
      void fetchWorkspaces();
    }
  }, [fetchWorkspaces, hasLoaded]);

  useEffect(() => {
    void fetchTeamMembers();
  }, []);

  async function fetchTeamMembers() {
    setIsTeamMembersLoading(true);
    try {
      const response = await teamMemberService.getAllTeamMembers();
      setTeamMembers(response.users ?? []);
      setTeamMemberWorkspaces(
        (response.workspaces ?? []).map((workspace) => ({
          id: Number(workspace.id),
          name: workspace.name,
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load team members right now.";

      toast.error(message);
    } finally {
      setIsTeamMembersLoading(false);
    }
  }

  function openAddWorkspaceModal() {
    setWorkspaceToEdit(null);
    router.replace(`/settings?tab=workspaces&workspaceModal=create`, {
      scroll: false,
    });
  }

  function openEditWorkspaceModal(workspace: Workspace) {
    setWorkspaceToEdit(workspace);
    setIsWorkspaceModalOpen(true);
  }

  function closeWorkspaceModal() {
    if (isCreateWorkspaceModalOpen) {
      router.replace(`/settings?tab=${activeTab}`, { scroll: false });
      return;
    }

    setIsWorkspaceModalOpen(false);
    setWorkspaceToEdit(null);
  };

  // White label is gated behind the reseller_seats add-on (sold as "White
  // Label"). Without it the CTA opens the upgrade prompt instead.
  const canWhiteLabel = hasWhiteLabel(sessionUser?.subscriptions);

  const openWhiteLabelModal = (workspace: Workspace) => {
    if (!canWhiteLabel) {
      setIsWhiteLabelUpgradeOpen(true);
      return;
    }
    setWorkspaceToWhiteLabel(workspace);
    setIsWhiteLabelModalOpen(true);
  };

  const closeWhiteLabelModal = () => {
    setIsWhiteLabelModalOpen(false);
    setWorkspaceToWhiteLabel(null);
  };

  // The modal owns persistence (Vercel registration + POST /custom-domains);
  // nothing else to do here once it reports success.
  /**
   * The modal owns persistence. All that's left is to hand the reseller the DNS
   * records for the domain they just saved — those live on the workspace page,
   * which opens them when it sees ?dns.
   */
  const handleWhiteLabelSubmit = async (values: WhiteLabelFormValues) => {
    const workspaceId = workspaceToWhiteLabel?.id;
    if (!workspaceId) return;

    router.push(
      values.id
        ? `/workspaces/${workspaceId}?dns=${values.id}`
        : `/workspaces/${workspaceId}`,
    );
  };

  async function handleSaveWorkspace(values: WorkspaceFormValues) {
    try {
      if (workspaceToEdit) {
        await updateWorkspace({
          id: workspaceToEdit.id,
          name: values.name,
          members: workspaceToEdit.members,
          image: workspaceToEdit.image,
          active: values.isActive,
        });

        if (values.isActive && !workspaceToEdit.active) {
          await activateWorkspace(workspaceToEdit.id);
        }

        toast.success("Workspace updated");
      } else {
        const createdWorkspace = await createWorkspace({
          name: values.name,
          imagePreview: null,
          logoFile: values.logoFile,
        });

        if (values.isActive && createdWorkspace?.id) {
          await activateWorkspace(createdWorkspace.id);
        }

        toast.success("Workspace created");
      }

      closeWorkspaceModal();
      await fetchWorkspaces();
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "Unable to save workspace right now.",
      );
      toast.error(errorMessage);
      if (errorMessage.toLowerCase().includes("upgrade")) {
        router.push("/upgrade");
      }
    }
  }

  function openDeleteWorkspaceModal(workspace: Workspace) {
    setWorkspaceToDelete(workspace);
  }

  function closeDeleteWorkspaceModal() {
    setWorkspaceToDelete(null);
  }

  async function handleDeleteWorkspaceConfirm() {
    if (!workspaceToDelete) {
      return;
    }

    try {
      await deleteWorkspace(workspaceToDelete.id);
      toast.success("Workspace deleted");
      closeDeleteWorkspaceModal();
      await fetchWorkspaces();
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "Unable to delete workspace right now.",
      );
      toast.error(errorMessage);
      if (errorMessage.toLowerCase().includes("upgrade")) {
        router.push("/upgrade");
      }
    }
  }

  function handleTabChange(nextTab: string) {
    const normalized = normalizeSettingsTab(nextTab);
    setActiveTab(normalized); // instant UI update
    router.replace(`/settings?tab=${normalized}`, { scroll: false }); // URL sync
  }

  function openAddTeamMemberModal() {
    const activeWorkspaceId = Number(
      workspaces.find((workspace) => workspace.active)?.id,
    );

    setTeamMemberToEdit(null);
    setTeamMemberForm({
      ...createEmptyTeamMemberForm(),
      workspaceIds: Number.isNaN(activeWorkspaceId) ? [] : [activeWorkspaceId],
    });
    setIsTeamMemberModalOpen(true);
  }

  function openEditTeamMemberModal(member: User) {
    setTeamMemberToEdit(member);
    setTeamMemberForm({
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      role: (member.role || member.parsed_role || "team_member")
        .replace(/\s+/g, "_")
        .toLowerCase(),
      password: "",
      confirmPassword: "",
      workspaceIds: getTeamMemberWorkspaceIds(member),
    });
    setIsTeamMemberModalOpen(true);
  }

  function closeTeamMemberModal() {
    setIsTeamMemberModalOpen(false);
    setTeamMemberToEdit(null);
    setTeamMemberForm(createEmptyTeamMemberForm());
  }

  function toggleTeamMemberWorkspace(workspaceId: number) {
    setTeamMemberForm((current) => {
      const exists = current.workspaceIds.includes(workspaceId);

      return {
        ...current,
        workspaceIds: exists
          ? current.workspaceIds.filter((id) => id !== workspaceId)
          : [...current.workspaceIds, workspaceId],
      };
    });
  }

  async function handleSaveTeamMember() {
    const firstName = teamMemberForm.firstName.trim();
    const lastName = teamMemberForm.lastName.trim();
    const emailValue = teamMemberForm.email.trim();
    const password = teamMemberForm.password.trim();
    const confirmPasswordValue = teamMemberForm.confirmPassword.trim();
    const role = teamMemberForm.role.trim() || "team_member";

    if (!firstName || !lastName || !emailValue) {
      toast.error("First name, last name, and email are required.");
      return;
    }

    if (!teamMemberToEdit && (!password || !confirmPasswordValue)) {
      toast.error("Password and confirmation are required.");
      return;
    }

    if (
      (password || confirmPasswordValue) &&
      password !== confirmPasswordValue
    ) {
      toast.error("Passwords do not match.");
      return;
    }

    if (teamMemberForm.workspaceIds.length === 0) {
      toast.error("Assign at least one workspace.");
      return;
    }

    const userAccess = availableTeamWorkspaces.map((workspace) => ({
      id: workspace.id,
      has_access: teamMemberForm.workspaceIds.includes(workspace.id),
    }));

    setIsTeamMembersMutating(true);

    try {
      if (teamMemberToEdit) {
        await teamMemberService.updateTeamMember({
          id: teamMemberToEdit.id,
          first_name: firstName,
          last_name: lastName,
          email: emailValue,
          role,
          user_access: userAccess,
        });

        if (password) {
          await teamMemberService.updateTeamMemberPassword({
            id: teamMemberToEdit.id,
            password,
            password_confirmation: confirmPasswordValue,
          });
        }

        toast.success("Team member updated");
      } else {
        await teamMemberService.addTeamMember({
          first_name: firstName,
          last_name: lastName,
          email: emailValue,
          password,
          role,
          user_access: userAccess,
        });
        toast.success("Team member added");
      }

      closeTeamMemberModal();
      await fetchTeamMembers();
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "Unable to save team member right now.",
      );
      toast.error(errorMessage);
      if (errorMessage.toLowerCase().includes("upgrade")) {
        router.push("/upgrade");
      }
    } finally {
      setIsTeamMembersMutating(false);
    }
  }

  async function handleDeleteTeamMemberConfirm() {
    if (!teamMemberToDelete) {
      return;
    }

    setIsTeamMembersMutating(true);
    try {
      await teamMemberService.deleteTeamMember({ id: teamMemberToDelete.id });
      toast.success("Team member deleted");
      setTeamMemberToDelete(null);
      await fetchTeamMembers();
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "Unable to delete team member right now.",
      );
      toast.error(errorMessage);
      if (errorMessage.toLowerCase().includes("upgrade")) {
        router.push("/upgrade");
      }
    } finally {
      setIsTeamMembersMutating(false);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="space-y-6 px-6 py-7">
        <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
          {/* Scrolls internally on narrow screens instead of pushing the page
              wider than the viewport. */}
          <Tabs.List className="mb-8 flex w-full max-w-full gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1 [-ms-overflow-style:none] [scrollbar-width:none] @2xl/app:w-fit [&::-webkit-scrollbar]:hidden">
            <Tabs.Trigger
              value="profile"
              className="shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-all data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text-primary)]"
            >
              Profile
            </Tabs.Trigger>
            <Tabs.Trigger
              value="workspaces"
              className="shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-all data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text-primary)]"
            >
              Workspaces
            </Tabs.Trigger>
            <Tabs.Trigger
              value="subscriptions"
              className="shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-all data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text-primary)]"
            >
              Subscriptions
            </Tabs.Trigger>
            <Tabs.Trigger
              value="team-members"
              className="shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-all data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text-primary)]"
            >
              Team Members
            </Tabs.Trigger>
          </Tabs.List>

          {/* PROFILE TAB */}
          <Tabs.Content value="profile" className="max-w-2xl space-y-5">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-alt)] text-lg font-semibold text-white">
                  {profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      disabled={isUploadingProfileImage}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-60"
                    >
                      {isUploadingProfileImage ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : null}
                      {isUploadingProfileImage ? "Uploading..." : "Change Photo"}
                    </button>
                    {profileImage ? (
                      <button
                        type="button"
                        onClick={handleRemoveProfileImage}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
                      >
                        Remove Photo
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    JPG, PNG, WEBP or GIF · Max {LOCAL_UPLOAD_MAX_LABEL} · saved
                    on this device only
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                Personal Information
              </h2>

              <div className="grid grid-cols-1 gap-4 @3xl/app:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Full Name
                  </label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>

                {/* <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      type="tel"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Time Zone
                  </label>
                  <Select.Root
                    value={timezone}
                    onValueChange={(value) =>
                      setTimezone(value as typeof timezone)
                    }
                  >
                    <Select.Trigger className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors">
                      <Select.Value />
                      <Select.Icon>
                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="z-50 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                        <Select.Viewport className="p-1">
                          {timezoneOptions.map((option) => (
                            <Select.Item
                              key={option}
                              value={option}
                              className="relative flex cursor-pointer items-center rounded-md py-2 pl-8 pr-3 text-sm text-[var(--text-muted)] outline-none transition-colors data-highlighted:bg-[var(--surface-hover)] data-highlighted:text-[var(--text-primary)]"
                            >
                              <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                                <Check className="h-3.5 w-3.5" />
                              </Select.ItemIndicator>
                              <Select.ItemText>{option}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div> */}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => toast.success("Profile updated")}
                  className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Save Changes
                </button>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                Change Password
              </h2>

              {/* <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    type={showCurrentPassword ? "text" : "password"}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword((current) => !current)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div> */}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    type={showNewPassword ? "text" : "password"}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={`h-1 rounded-full ${strengthColor(strength, index)}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {passwordMismatch ? (
                  <p className="mt-1 text-xs text-red-400">
                    Passwords do not match.
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (passwordMismatch || strength < 4) {
                      toast.error("Please use a stronger matching password");
                      return;
                    }
                    toast.success("Password updated");
                  }}
                  className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Update Password
                </button>
              </div>
            </section>
          </Tabs.Content>

          {/* WORKSPACES TAB */}
          <Tabs.Content value="workspaces" className="w-full max-w-none">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Workspaces
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Manage your workspaces and members.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddWorkspaceModal}
                  disabled={isWorkspaceMutating}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {isWorkspacesLoading ? (
                <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  Loading workspaces...
                </div>
              ) : null}

              {!isWorkspacesLoading && workspaces.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-center text-sm text-[var(--text-muted)]">
                  No workspaces found. Create your first one to begin.
                </div>
              ) : null}

              {!isWorkspacesLoading && workspaces.length > 0 ? (
                <div className="mt-5 grid grid-cols-1 gap-3 @7xl/app:grid-cols-2">
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-linear-to-br from-[var(--brand)] to-[var(--brand-alt)] text-xs font-semibold text-white">
                            {workspace.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {workspace.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {teamMembersByWorkspace.get(String(workspace.id))
                                ?.length ?? workspace.members}{" "}
                              member
                              {(teamMembersByWorkspace.get(String(workspace.id))
                                ?.length ?? workspace.members) === 1
                                ? ""
                                : "s"}
                            </p>
                          </div>
                        </div>
                        {workspace.active && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/workspaces/${workspace.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Details
                          </Link>
                          <button
                            type="button"
                            onClick={() => openWhiteLabelModal(workspace)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-muted)] hover:text-[var(--brand)]"
                          >
                            <Palette className="h-3.5 w-3.5" />
                            Configure White Label
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditWorkspaceModal(workspace)}
                            disabled={isWorkspaceMutating}
                            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Edit ${workspace.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteWorkspaceModal(workspace)}
                            disabled={isWorkspaceMutating}
                            className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Delete ${workspace.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </Tabs.Content>

          {/* SUBSCRIPTIONS TAB */}
          <Tabs.Content value="subscriptions" className="w-full max-w-none">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
              <div className="mb-6">
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Subscriptions
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Manage your active plan and additional packages.
                </p>
              </div>

              <Tabs.Root defaultValue="active-plans">
                <Tabs.List className="mb-6 flex w-fit gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
                  <Tabs.Trigger
                    value="active-plans"
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-all data-[state=active]:bg-[var(--surface-raised)] data-[state=active]:text-[var(--text-primary)]"
                  >
                    Active Plans ({activePlans.length})
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="additional-packages"
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-all data-[state=active]:bg-[var(--surface-raised)] data-[state=active]:text-[var(--text-primary)]"
                  >
                    Add Ons ({additionalPackages.length})
                  </Tabs.Trigger>
                </Tabs.List>

                {/* ACTIVE PLANS */}
                <Tabs.Content value="active-plans">
                  {activePlans.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-center text-sm text-[var(--text-muted)]">
                      No active plan. Visit the upgrade page to subscribe.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 @5xl/app:grid-cols-2">
                      {activePlans.map((plan) => {
                        // Cancelled per backend (is_cancelled === 1) or just
                        // cancelled this session (optimistic).
                        const isCancelled =
                          plan.subscription.is_cancelled === 1 ||
                          cancelledSubscriptionIds.has(plan.id);
                        const isLifetime = plan.type === "lifetime";
                        const renewalDate = getNextBillingDate(
                          plan.subscription,
                        );
                        const endDate = plan.subscription.end_date
                          ? new Date(plan.subscription.end_date)
                          : null;
                        const endDateValid =
                          endDate && !Number.isNaN(endDate.getTime());

                        return (
                          <div
                            key={plan.id}
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                                  {plan.name}
                                </h3>
                                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                                  {toReadableLabel(plan.type)}
                                </p>
                              </div>
                              {isCancelled ? (
                                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-400">
                                  Renewal cancelled
                                </span>
                              ) : (
                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                                  Active
                                </span>
                              )}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                  Status
                                </p>
                                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                  {isCancelled ? "Cancels at period end" : "Active"}
                                </p>
                              </div>
                              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                  {isLifetime
                                    ? "Type"
                                    : isCancelled
                                      ? "Expires"
                                      : "Renews"}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                  {isLifetime
                                    ? "Lifetime"
                                    : isCancelled
                                      ? endDateValid
                                        ? formatBillingDate(endDate)
                                        : toReadableLabel(plan.type)
                                      : renewalDate
                                        ? formatBillingDate(renewalDate)
                                        : toReadableLabel(plan.type)}
                                </p>
                              </div>
                            </div>

                            {/* Cancelled: nudge to reset the billing cycle. */}
                            {isCancelled && !isLifetime ? (
                              <p className="mt-4 text-xs text-[var(--text-muted)]">
                                This plan is set to expire
                                {endDateValid
                                  ? ` on ${formatBillingDate(endDate)}`
                                  : ""}
                                .{" "}
                                <button
                                  type="button"
                                  onClick={() => router.push("/upgrade")}
                                  className="font-medium text-[var(--brand)] hover:underline"
                                >
                                  Pay now
                                </button>{" "}
                                to reset your billing cycle.
                              </p>
                            ) : null}

                            {/* Cancel renewal — only for non-lifetime plans. */}
                            {!isLifetime && !isCancelled ? (
                              <div className="mt-4 flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setSubscriptionToCancel({
                                      id: plan.id,
                                      name: plan.name,
                                      subscription: plan.subscription,
                                    })
                                  }
                                >
                                  Cancel plan
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Tabs.Content>

                {/* ADDITIONAL PACKAGES */}
                <Tabs.Content value="additional-packages">
                  {additionalPackages.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-center text-sm text-[var(--text-muted)]">
                      No add-ons.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 @5xl/app:grid-cols-2">
                      {additionalPackages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                                {pkg.name}
                              </h3>
                              <p className="mt-1 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                                {toReadableLabel(pkg.type)}
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                              Active
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Tabs.Content>
              </Tabs.Root>
            </section>
          </Tabs.Content>

          {/* TEAM MEMBERS TAB */}
          <Tabs.Content value="team-members" className="w-full max-w-none">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Team Members
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Manage members within your workspaces.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddTeamMemberModal}
                  disabled={
                    isTeamMembersMutating ||
                    availableTeamWorkspaces.length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-[var(--text-primary)]">
                    <thead className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Name</th>
                        <th className="px-5 py-3 font-semibold">Email</th>
                        <th className="px-5 py-3 font-semibold">
                          Workspace(s)
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {isTeamMembersLoading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-6 text-center text-[var(--text-muted)]"
                          >
                            Loading team members...
                          </td>
                        </tr>
                      ) : null}

                      {!isTeamMembersLoading && teamMembers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-6 text-center text-[var(--text-muted)]"
                          >
                            No team members yet.
                          </td>
                        </tr>
                      ) : null}

                      {!isTeamMembersLoading
                        ? teamMembers.map((member) => {
                            const workspaceNames = getTeamMemberWorkspaceIds(
                              member,
                            ).reduce<string[]>((accumulator, workspaceId) => {
                              const name = availableTeamWorkspaces.find(
                                (workspace) => workspace.id === workspaceId,
                              )?.name;
                              if (name) {
                                accumulator.push(name);
                              }

                              return accumulator;
                            }, []);

                            return (
                              <tr
                                key={member.id}
                                className="transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)]/20 text-xs font-semibold text-[var(--brand)]">
                                      {member.first_name?.[0]}
                                      {member.last_name?.[0]}
                                    </div>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                      {member.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-[var(--text-muted)]">
                                  {member.email}
                                </td>
                                <td className="px-5 py-4 text-[var(--text-muted)]">
                                  {workspaceNames.length > 0
                                    ? workspaceNames.join(", ")
                                    : "No workspace"}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center justify-end gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openEditTeamMemberModal(member)
                                      }
                                      className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                      aria-label={`Edit ${member.name}`}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setTeamMemberToDelete(member)
                                      }
                                      className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                                      aria-label={`Delete ${member.name}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <WorkspaceModal
        open={isWorkspaceModalOpen || isCreateWorkspaceModalOpen}
        workspace={workspaceToEdit}
        isSubmitting={isWorkspaceMutating}
        onOpenChange={(open) => {
          if (!open) {
            closeWorkspaceModal();
          }
        }}
        onSubmit={handleSaveWorkspace}
      />

      <ConfirmDeleteWorkspaceModal
        open={Boolean(workspaceToDelete)}
        workspace={workspaceToDelete}
        isSubmitting={isWorkspaceMutating}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteWorkspaceModal();
          }
        }}
        onConfirm={handleDeleteWorkspaceConfirm}
      />

      <WhiteLabelUpgradeModal
        open={isWhiteLabelUpgradeOpen}
        onOpenChange={setIsWhiteLabelUpgradeOpen}
      />

      <ConfigureWhiteLabelModal
        open={isWhiteLabelModalOpen}
        workspace={workspaceToWhiteLabel}
        onOpenChange={(open) => {
          if (!open) {
            closeWhiteLabelModal();
          }
        }}
        onSubmit={handleWhiteLabelSubmit}
      />

      {/* TEAM MEMBER MODAL */}
      <AnimatePresence>
        {isTeamMemberModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={() => {
              if (!isTeamMembersMutating) {
                closeTeamMemberModal();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                    {teamMemberToEdit ? "Edit Team Member" : "Add Team Member"}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {teamMemberToEdit
                      ? "Update member details and workspace assignments."
                      : "Add a new teammate and assign workspace access."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeTeamMemberModal}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Close team member modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 @3xl/app:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    First Name
                  </label>
                  <input
                    value={teamMemberForm.firstName}
                    onChange={(event) =>
                      setTeamMemberForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Last Name
                  </label>
                  <input
                    value={teamMemberForm.lastName}
                    onChange={(event) =>
                      setTeamMemberForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>

                <div className="@3xl/app:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Email
                  </label>
                  <input
                    value={teamMemberForm.email}
                    onChange={(event) =>
                      setTeamMemberForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    type="email"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Role
                  </label>
                  <Select.Root
                    value={teamMemberForm.role}
                    onValueChange={(value) =>
                      setTeamMemberForm((current) => ({
                        ...current,
                        role: value,
                      }))
                    }
                  >
                    <Select.Trigger className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors">
                      <Select.Value />
                      <Select.Icon>
                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="z-50 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                        <Select.Viewport className="p-1">
                          {["team_member", "client", "editor", "admin"].map(
                            (option) => (
                              <Select.Item
                                key={option}
                                value={option}
                                className="relative flex cursor-pointer items-center rounded-md py-2 pl-8 pr-3 text-sm text-[var(--text-muted)] outline-none transition-colors data-highlighted:bg-[var(--surface-hover)] data-highlighted:text-[var(--text-primary)]"
                              >
                                <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                                  <Check className="h-3.5 w-3.5" />
                                </Select.ItemIndicator>
                                <Select.ItemText>
                                  {option.replace(/_/g, " ")}
                                </Select.ItemText>
                              </Select.Item>
                            ),
                          )}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Password
                  </label>
                  <input
                    value={teamMemberForm.password}
                    onChange={(event) =>
                      setTeamMemberForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    type="password"
                    placeholder={teamMemberToEdit ? "Optional" : "Required"}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Confirm Password
                  </label>
                  <input
                    value={teamMemberForm.confirmPassword}
                    onChange={(event) =>
                      setTeamMemberForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    type="password"
                    placeholder={teamMemberToEdit ? "Optional" : "Required"}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Workspace Assignment
                </p>

                {availableTeamWorkspaces.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    No workspaces available.
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-2 @3xl/app:grid-cols-2">
                    {availableTeamWorkspaces.map((workspace) => {
                      const checked = teamMemberForm.workspaceIds.includes(
                        workspace.id,
                      );

                      return (
                        <label
                          key={workspace.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:border-[var(--brand)]/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleTeamMemberWorkspace(workspace.id)
                            }
                            className="h-4 w-4 rounded border-[var(--border)] bg-[var(--surface-raised)]"
                          />
                          <span className="truncate">{workspace.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeTeamMemberModal}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveTeamMember()}
                  disabled={isTeamMembersMutating}
                  className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isTeamMembersMutating
                    ? "Saving..."
                    : teamMemberToEdit
                      ? "Save Changes"
                      : "Add Team Member"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* DELETE TEAM MEMBER MODAL */}
      <AnimatePresence>
        {teamMemberToDelete ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={() => {
              if (!isTeamMembersMutating) {
                setTeamMemberToDelete(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                      Delete Team Member
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!isTeamMembersMutating) {
                      setTeamMemberToDelete(null);
                    }
                  }}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Close delete team member modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-[var(--text-muted)]">
                Are you sure you want to delete
                <span className="font-semibold text-[var(--text-primary)]">
                  {" "}
                  {teamMemberToDelete.name}
                </span>
                ?
              </p>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isTeamMembersMutating) {
                      setTeamMemberToDelete(null);
                    }
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteTeamMemberConfirm()}
                  disabled={isTeamMembersMutating}
                  className="rounded-lg bg-red-500/90 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isTeamMembersMutating ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* CANCEL SUBSCRIPTION RENEWAL MODAL */}
      <Modal
        open={subscriptionToCancel !== null}
        onOpenChange={(open) => {
          if (!open && !isCancellingSubscription) {
            setSubscriptionToCancel(null);
          }
        }}
        title={`Cancel your ${subscriptionToCancel?.name ?? ""} plan?`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Cancelling stops your {subscriptionToCancel?.name} plan from
            renewing —{" "}
            {cancelNextBillingDate
              ? `it won't renew after ${formatBillingDate(cancelNextBillingDate)}`
              : "it won't renew for the next billing cycle"}
            . You&apos;ll keep full access to your {subscriptionToCancel?.name}{" "}
            features until then.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Want a different plan instead? Cancelling here is the first step —
            once cancelled, head to the{" "}
            <button
              type="button"
              onClick={() => router.push("/upgrade")}
              className="font-medium text-[var(--brand)] hover:underline"
            >
              upgrade page
            </button>{" "}
            to switch to a new plan.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setSubscriptionToCancel(null)}
              disabled={isCancellingSubscription}
            >
              Keep my plan
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmCancelSubscription()}
              disabled={isCancellingSubscription}
              className="gap-1.5"
            >
              {isCancellingSubscription ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              {isCancellingSubscription ? "Cancelling..." : "Cancel plan"}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
```

<sub>1959 lines</sub>


### Workspaces: service & modals
#### `services/Worskpaces.ts`

```ts
import api from "./api/api";
import {
  ActivateWorkspacePayload,
  ActivateWorkspaceResponse,
  CreateWorkspacePayload,
  createWorkspaceResponse,
  DeleteWorkspacePayload,
  DeleteWorkspaceResponse,
  GetAllWorkspacesResponse,
  UpdateWorkspacePayload,
  UpdateWorkspaceResponse,
} from "@/types/types";

const workspaceService = {
  createWorkspace: async (
    payload: CreateWorkspacePayload,
  ): Promise<createWorkspaceResponse> => {
    try {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("slug", payload.slug);
      formData.append("is_default", String(payload.is_default));

      if (payload.logo) {
        formData.append("logo", payload.logo);
      }

      const response = await api.post<createWorkspaceResponse>(
        "/workspace/store",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  activateWorkspace: async (
    payload: ActivateWorkspacePayload,
  ): Promise<ActivateWorkspaceResponse> => {
    try {
      const response = await api.post<ActivateWorkspaceResponse>(
        `/workspaces/${payload.id}`,
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAllWorkspaces: async (): Promise<GetAllWorkspacesResponse> => {
    try {
      const response = await api.get<GetAllWorkspacesResponse>("/workspace");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateWorkspace: async (
    payload: UpdateWorkspacePayload,
  ): Promise<UpdateWorkspaceResponse> => {
    try {
      const response = await api.post<UpdateWorkspaceResponse>(
        "/workspace/update",
        payload,
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteWorkspace: async (
    payload: DeleteWorkspacePayload,
  ): Promise<DeleteWorkspaceResponse> => {
    try {
      const response = await api.post<DeleteWorkspaceResponse>(
        "/workspace/delete",
        payload,
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default workspaceService;
```

<sub>98 lines</sub>

#### `components/modals/WorkspaceModal.tsx`

```tsx
"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import type { Workspace } from "@/stores/workspace-store";

export type WorkspaceFormValues = {
  name: string;
  isActive: boolean;
  logoFile: File | null;
};

type WorkspaceModalProps = {
  open: boolean;
  workspace: Workspace | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WorkspaceFormValues) => Promise<void>;
};

export function WorkspaceModal({
  open,
  workspace,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: WorkspaceModalProps) {
  const [name, setName] = React.useState("");
  const [isActive, setIsActive] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (open) {
      setName(workspace?.name ?? "");
      setIsActive(Boolean(workspace?.active));
      setLogoFile(null);
      setError(undefined);
    }
  }, [open, workspace]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Workspace name is required.");
      return;
    }

    setError(undefined);
    await onSubmit({ name: trimmedName, isActive, logoFile });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={workspace ? "Edit workspace" : "Add workspace"}
      subtitle={
        workspace
          ? "Update the workspace name and active state."
          : "Create a new workspace for your team."
      }
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : workspace
                ? "Save changes"
                : "Create workspace"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Workspace name"
          placeholder="e.g. Marketing"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) {
              setError(undefined);
            }
          }}
          error={error}
        />

        {!workspace ? (
          <div className="space-y-1.5">
            <label className="block font-display text-[13px] font-semibold tracking-[0.01em] text-[var(--text-secondary)]">
              Workspace image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                setLogoFile(event.target.files?.[0] ?? null);
              }}
              className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-muted)] file:mr-4 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--brand)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
            />
            <p className="text-xs text-[var(--text-muted)]">
              PNG, JPG, or GIF. This will be used as the workspace logo.
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Active workspace
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Make this workspace the selected workspace.
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </Modal>
  );
}
```

<sub>133 lines</sub>

#### `components/modals/ConfirmDeleteWorkspaceModal.tsx`

```tsx
"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Workspace } from "@/stores/workspace-store";

type ConfirmDeleteWorkspaceModalProps = {
  open: boolean;
  workspace: Workspace | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDeleteWorkspaceModal({
  open,
  workspace,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: ConfirmDeleteWorkspaceModalProps) {
  if (!workspace) {
    return null;
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Delete workspace"
      subtitle="This action permanently removes the workspace."
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete workspace"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <p className="text-sm text-[var(--text-muted)]">
            Are you sure you want to delete
            <span className="font-semibold text-[var(--text-primary)]">
              {" "}
              {workspace.name}
            </span>
            ?
          </p>
        </div>
      </div>
    </Modal>
  );
}
```

<sub>67 lines</sub>


### Team Members: service
#### `services/Teammember.ts`

```ts
import api from "./api/api";
import {
  AddTeamMemberPayload,
  AddTeamMemberResponse,
  DeleteTeamMemberPayload,
  DeleteTeamMemberResponse,
  GetAllTeamMembersResponse,
  UpdateTeamMemberPasswordPayload,
  UpdateTeamMemberPasswordResponse,
  UpdateTeamMemberPayload,
  UpdateTeamMemberResponse,
} from "@/types/types";

const teamMemberService = {
  addTeamMember: async (
    payload: AddTeamMemberPayload,
  ): Promise<AddTeamMemberResponse> => {
    try {
      const response = await api.post<AddTeamMemberResponse>(
        "/team/add",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAllTeamMembers: async (): Promise<GetAllTeamMembersResponse> => {
    try {
      const response = await api.get<GetAllTeamMembersResponse>("/team");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTeamMember: async (
    payload: UpdateTeamMemberPayload,
  ): Promise<UpdateTeamMemberResponse> => {
    try {
      const response = await api.post<UpdateTeamMemberResponse>(
        "/team/update",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTeamMemberPassword: async (
    payload: UpdateTeamMemberPasswordPayload,
  ): Promise<UpdateTeamMemberPasswordResponse> => {
    try {
      const response = await api.post<UpdateTeamMemberPasswordResponse>(
        "/team/update/password",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteTeamMember: async (
    payload: DeleteTeamMemberPayload,
  ): Promise<DeleteTeamMemberResponse> => {
    try {
      const response = await api.delete<DeleteTeamMemberResponse>(
        "/team/delete",
        {
          data: payload,
        },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default teamMemberService;
```

<sub>83 lines</sub>


### Subscriptions: service
#### `services/Subscriptions.ts`

```ts
import api from "./api/api";
import { whiteLabelAccessPath } from "@/lib/white-label-access";
import type { AddonAccessResponse } from "@/types/types";

export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  errors?: {
    [key: string]: string[];
  } | null;
}

const SubscriptionService = {
  /**
   * Cancels renewal of the user's current subscription. The user keeps access
   * until the period ends (Paddle stops the next billing cycle); this does not
   * refund or immediately revoke access. The backend talks to Paddle and
   * persists the cancelled state.
   */
  cancelSubscription: async (subscriptionId: string | number) => {
    try {
      const res = await api.post<CancelSubscriptionResponse>(
        "/cancle/subscription",
        { subscriptionId },
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Whether this account owns the White Label (`reseller_seats`) add-on,
   * answered by the backend rather than inferred from the session cookie.
   *
   * Used as the second gate on the Marketing Assets CTA and page — the cookie
   * read decides what to render immediately, this decides whether it was
   * right. Throws on failure so callers can tell "no" apart from "couldn't
   * ask" and keep showing the optimistic state instead of locking someone out
   * over a dropped request.
   */
  getWhiteLabelAccess: async (
    userId: number | string,
  ): Promise<AddonAccessResponse> => {
    const response = await api.get<AddonAccessResponse>(
      whiteLabelAccessPath(userId),
    );
    return response.data;
  },
};

export default SubscriptionService;
```

<sub>52 lines</sub>


---

## 10. Subscriptions: Upgrade / pricing page (Paddle)

**Flow:** plans (`professional | agency | reseller`, monthly/annual) and add-ons (Remove Branding lifetime, White Label Starter/Pro/Unlimited) map to Paddle price IDs in `lib/paddle-config.ts`. `openCheckout(plan)` calls `paddle.Checkout.open` with `customer.email` and `customData` (user id + email). Decision tree in `handleCardAction`: White Label one-time purchases go **straight to checkout**. Free users, or users whose plan is already cancelled, go **straight to checkout** for an upgrade or downgrade. Users on an **active paid plan** get a confirm modal (`pendingAction` = upgrade / downgrade / cancel). On confirm, the page **cancels the current subscription first** and then opens checkout for the new plan (cancel-only stops after the cancel). White Label owners see a CTA to the sales kit (`/marketing-assets`), checked through `useWhiteLabelAccess` (cookie first, then a server check).

#### `app/(dashboard)/upgrade/page.tsx`

```tsx
"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, FolderDown, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { PaddleContext } from "@/providers/PaddleProvider";
import { getPlanPriceId, type BillingPeriod } from "@/lib/paddle-config";
import { getActivePlan, PLAN_META, type PlanName } from "@/lib/plan";
import { getSessionUserFromCookie } from "@/lib/auth-session";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import SubscriptionService from "@/services/Subscriptions";
import { getNextBillingDate, formatBillingDate } from "@/lib/subscription";
import { WhiteLabelUpgradeModal } from "@/components/modals/WhiteLabelUpgradeModal";
import { useWhiteLabelAccess } from "@/components/marketing-assets/useWhiteLabelAccess";

type Feature = {
  label: string;
  // `false` renders the feature struck-through to show it's unlocked higher up.
  included: boolean;
};

type PlanCard = {
  name: string;
  planKey: PlanName;
  priceMonthly: number;
  // Pre-discount "was" price shown struck-through above the launch price.
  originalMonthly: number;
  description: string;
  features: Feature[];
  cta: string;
  variant: "ghost" | "brand" | "secondary";
  popular: boolean;
  isOneTime?: boolean;
  customCta?: string;
  /** Direct Paddle price ID override — used for one-time whitelabel purchases. */
  paddlePriceId?: string;
};

// Plan hierarchy — used to decide whether a card represents an upgrade,
// downgrade, or cancellation relative to the user's active plan.
const PLAN_RANK: Record<PlanName, number> = {
  free: 0,
  professional: 1,
  agency: 2,
  reseller: 3,
};

type PlanAction = "current" | "upgrade" | "downgrade" | "cancel";

function getPlanAction(cardPlan: PlanName, activePlan: PlanName): PlanAction {
  if (cardPlan === activePlan) return "current";
  // Moving to Free from any paid plan is a cancellation.
  if (cardPlan === "free") return "cancel";
  return PLAN_RANK[cardPlan] > PLAN_RANK[activePlan] ? "upgrade" : "downgrade";
}

// Annual billing applies a 20% discount on the monthly rate; the full year is
// charged up front but the card still frames the price per month.
// const ANNUAL_DISCOUNT = 0.2;

// Whole numbers render as "$29"; discounted prices keep two decimals ("$23.20").
const formatPrice = (value: number) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(2);

/**
 * AI Agent capabilities — Enterprise only. Listed on every card so lower
 * tiers can see exactly what they're missing (struck through there,
 * included on Enterprise).
 */
const AI_AGENT_FEATURE_LABELS = [
  "AI Agent — autonomous chat management",
  "AI auto-replies to viewer questions",
  "AI buying-intent detection & offer CTAs",
  "AI-generated live polls & quizzes",
  "AI chat analysis & host attention flags",
];

const aiAgentFeatures = (included: boolean): Feature[] =>
  AI_AGENT_FEATURE_LABELS.map((label) => ({ label, included }));

const PLANS: PlanCard[] = [
  // {
  //   name: "Free",
  //   planKey: "free",
  //   priceMonthly: 0,
  //   description: "Build and design in the studio — no live streaming.",
  //   features: [
  //     { label: "Full studio editor & layers", included: true },
  //     { label: "Import media from any URL", included: true },
  //     { label: "720p studio preview", included: true },
  //     { label: "30 FPS", included: true },
  //     { label: "2 GB file storage", included: true },
  //     { label: "Go live to streaming destinations", included: false },
  //     { label: "Interactive elements", included: false },
  //     { label: "Streams, broadcasts & analytics", included: false },
  //     { label: "Unlimited Workspaces", included: false },
  //     { label: "Unlimited Team members", included: false },
  //   ],
  //   cta: "Free plan",
  //   variant: "ghost",
  //   popular: false,
  // },
  {
    name: "Professional",
    planKey: "professional",
    priceMonthly: 12,
    originalMonthly: 19,
    description: "For creators ready to go live and grow.",
    features: [
      { label: "Everything in Free", included: true },
      { label: "Go live to unlimited streaming destinations", included: true },
      { label: "3 hr streaming limit per month", included: true },
      { label: "1080p output", included: true },
      { label: "60 FPS", included: true },
      { label: "25 GB file storage", included: true },
      { label: "1 on-screen guests", included: true },
      { label: "30 Interactive elements", included: true },
      { label: "Streams, broadcasts & analytics", included: true },
      { label: "Priority support", included: true },
      { label: "Access to all templates", included: false },
      { label: "Unlimited destinations", included: false },
      { label: "4K output", included: false },
      { label: "Team collaboration", included: false },
      { label: "Unlimited Workspaces", included: false },
      { label: "Unlimited Team members", included: false },
      ...aiAgentFeatures(false),
    ],
    cta: "Upgrade to Professional",
    variant: "brand",
    popular: false,
  },
  {
    name: "Agency",
    planKey: "agency",
    priceMonthly: 19,
    originalMonthly: 39,
    description: "Unlimited streaming for teams and organizations.",
    features: [
      { label: "Everything in Professional", included: true },
      { label: "Unlimited streaming destinations", included: true },
      { label: "10 hr streaming limit per month", included: true },
      { label: "4K output", included: true },
      { label: "60 FPS", included: true },
      { label: "100 GB file storage", included: true },
      { label: "3 on-screen guests", included: true },
      { label: "50 interactive elements", included: true },
      { label: "Team collaboration", included: true },
      { label: "Agency workspace & assets", included: true },
      { label: "Access to all templates", included: true },
      { label: "White-label reseller dashboard", included: false },
      { label: "Keep 100% of your proceeds", included: false },
      { label: "Unlimited Workspaces", included: false },
      { label: "Unlimited Team members", included: false },
      ...aiAgentFeatures(false),
    ],
    cta: "Upgrade to Agency",
    variant: "secondary",
    popular: false,
  },
  {
    name: "Enterprise",
    planKey: "reseller",
    priceMonthly: 39,
    originalMonthly: 79,
    description: "Resell Flowcasta under your own brand at scale.",
    features: [
      { label: "Everything in Agency", included: true },
      { label: "Unlimited destinations & interactive", included: true },
      { label: "25 hr streaming limit per month", included: true },
      { label: "4K output & analytics", included: true },
      { label: "60 FPS", included: true },
      { label: "250 GB file storage", included: true },
      { label: "20 on-screen guests", included: true },
      { label: "White-label reseller dashboard", included: true },
      { label: "Unlimited reseller accounts", included: true },
      { label: "Access to all templates", included: true },
      { label: "Keep 100% of your proceeds", included: true },
      { label: "Dedicated partner support", included: true },
      { label: "Unlimited Workspaces", included: true },
      { label: "Unlimited Team members", included: true },
      ...aiAgentFeatures(true),
    ],
    cta: "Upgrade to Enterprise",
    variant: "secondary",
    popular: true,
  },
];

const WHITELABEL_PLANS: PlanCard[] = [
  {
    name: "Starter",
    planKey: "whitelabel_starter" as PlanName,
    priceMonthly: 49,
    originalMonthly: 49,
    description: "100 Licenses",
    features: [
      { label: "Sell up to 100 customer accounts", included: true },
      { label: "Set monthly, yearly or one-time pricing", included: true },
      { label: "Your brand, logo and domain", included: true },
      { label: "Partners dashboard", included: true },
      { label: "Sales materials included", included: true },
      { label: "Customer support handled", included: true },
    ],
    cta: "Choose Starter",
    variant: "ghost",
    popular: false,
    isOneTime: true,
    paddlePriceId: getPlanPriceId("whitelabel_starter", "one-time"),
  },
  {
    name: "Pro",
    planKey: "whitelabel_pro" as PlanName,
    priceMonthly: 149,
    originalMonthly: 149,
    description: "300 Licenses",
    features: [
      { label: "Sell up to 300 customer accounts", included: true },
      { label: "Set your own pricing", included: true },
      {
        label: "Enough capacity for a serious reseller business",
        included: true,
      },
      { label: "Your brand, domain and customer relationship", included: true },
      { label: "Complete sales kit", included: true },
      { label: "Support handled behind your brand", included: true },
    ],
    cta: "Choose Pro",
    variant: "brand",
    popular: true,
    isOneTime: true,
    paddlePriceId: getPlanPriceId("whitelabel_pro", "one-time"),
  },
  {
    name: "Unlimited",
    planKey: "whitelabel_unlimited" as PlanName,
    priceMonthly: 249,
    originalMonthly: 249,
    description: "Unlimited Licenses",
    features: [
      { label: "Never count customer licenses again", included: true },
      { label: "Designed for subscriptions and agencies", included: true },
      { label: "Unlimited client-account potential", included: true },
      { label: "Keep 100% of revenue", included: true },
      { label: "White-label brand ownership", included: true },
      { label: "Support handled under your brand", included: true },
    ],
    cta: "Choose Unlimited",
    variant: "secondary",
    popular: false,
    isOneTime: true,
    paddlePriceId: getPlanPriceId("whitelabel_unlimited", "one-time"),
  },
];

function PricingCard({
  plan,
  period,
  action,
  paddleReady,
  expireNotice,
  onAction,
}: {
  plan: PlanCard;
  period: BillingPeriod;
  action: PlanAction;
  paddleReady: boolean;
  // Shown in place of the Free-card button when the active plan is already set
  // to expire (is_cancelled === 1).
  expireNotice: string | null;
  onAction: (plan: PlanCard, action: PlanAction) => void;
}) {
  const isCurrent = action === "current";
  const isCancel = action === "cancel";
  const isPaidChange = action === "upgrade" || action === "downgrade";
  // Only paid plan changes need Paddle; cancelling does not.
  const disabled = isCurrent || (isPaidChange && !paddleReady);

  const perMonth =
    period === "annually" ? plan.priceMonthly : plan.priceMonthly;

  // * (1 - ANNUAL_DISCOUNT)

  // Launch promo: strike out the original price when it's above the live price.
  const hasPromo = plan.originalMonthly > perMonth;

  const label = isCurrent
    ? plan.planKey === "free"
      ? "Free plan"
      : "Current plan"
    : isCancel
      ? "Cancel plan"
      : isPaidChange && !paddleReady
        ? "Loading payment provider..."
        : action === "downgrade"
          ? `Downgrade to ${plan.name}`
          : `Upgrade to ${plan.name}`;

  const buttonVariant = isCancel ? "destructive" : plan.variant;

  // Whitelabel plans with a Paddle price ID go through the normal checkout
  // flow. Plans with a customCta but NO paddlePriceId still open an
  // external link (backwards compat).
  const isWhitelabelCheckout = Boolean(plan.paddlePriceId);
  const buttonProps =
    plan.customCta && !isWhitelabelCheckout
      ? {
          onClick: () =>
            window.open(
              "https://livestreamingsalesagentsai.com/whitelabel/#plans",
              "_blank",
            ),
        }
      : {
          onClick: () => onAction(plan, action),
          disabled: isWhitelabelCheckout ? !paddleReady : disabled,
        };

  return (
    <Card
      className={`relative flex flex-col rounded-[var(--radius-xl)] p-6 ${
        plan.popular ? "border-[var(--brand)] ring-1 ring-[var(--brand)]" : ""
      }`}
    >
      {plan.popular ? (
        <Badge
          variant="brand"
          className="absolute -top-3 left-1/2 -translate-x-1/2 border-[var(--brand)] bg-[var(--brand)] px-4 py-1 text-xs text-white"
        >
          Most popular
        </Badge>
      ) : null}
      {isCurrent && !plan.isOneTime ? (
        <Badge
          variant="success"
          className="absolute -top-3 right-0 px-3 py-1 text-xs"
        >
          Active
        </Badge>
      ) : null}
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {plan.name}
        </h3>
        {/* Only Enterprise ships the AI Agent — call it out on the card. */}
        {plan.planKey === "reseller" ? (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-400">
            <Sparkles size={10} />
            AI-Agent Powered
          </span>
        ) : null}
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {plan.description}
        </p>
      </div>
      <div className="mb-1 flex items-end gap-2">
        {hasPromo && !plan.isOneTime ? (
          <span className="relative mb-1 text-lg font-semibold text-[var(--text-muted)] line-through">
            ${formatPrice(plan.originalMonthly)}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <sup className="ml-0.5 cursor-help rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white no-underline">
                    50%
                  </sup>
                </TooltipTrigger>
                <TooltipContent>
                  🎉 Launch Special – 50% Off for Early Adopters
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        ) : null}
        <span className="font-display text-3xl font-bold text-[var(--text-primary)]">
          ${formatPrice(perMonth)}
        </span>
        <span className="mb-1 text-xs text-[var(--text-muted)]">
          {plan.isOneTime ? "one-time*" : "/mo"}
        </span>
      </div>
      <div className="mb-6 min-h-[1.1rem] text-xs font-medium text-[var(--brand)]">
        {!plan.isOneTime && period === "annually" && plan.priceMonthly > 0
          ? `Billed annually`
          : plan.isOneTime
            ? "ONE-TIME LICENSE"
            : null}
      </div>
      <ul className="mb-8 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className={cn(
              "flex items-start gap-2 text-xs",
              feature.included
                ? "text-[var(--text-secondary)]"
                : "text-[var(--text-muted)] line-through",
            )}
          >
            {feature.included ? (
              <Check
                size={14}
                className="mt-0.5 shrink-0 text-[var(--brand)]"
              />
            ) : (
              <X
                size={14}
                className="mt-0.5 shrink-0 text-[var(--text-muted)]"
              />
            )}
            {feature.label}
          </li>
        ))}
      </ul>
      {isCancel && expireNotice ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-center text-xs text-[var(--text-secondary)]">
          {expireNotice}
        </p>
      ) : (
        <Button variant={buttonVariant} className="w-full" {...buttonProps}>
          {plan.customCta ? plan.customCta : label}
        </Button>
      )}
    </Card>
  );
}

/** Which pricing table the page is showing. */
type UpgradeTab = "app" | "whitelabel";

/**
 * Reads ?tab in a Suspense-isolated child, mirroring the settings page: keeping
 * useSearchParams out of the page body avoids a full refresh on tab switches.
 */
function UpgradeParamsReader({
  onChange,
}: {
  onChange: (tab: UpgradeTab) => void;
}) {
  const searchParams = useSearchParams();
  const tab: UpgradeTab =
    searchParams.get("tab") === "whitelabel" ? "whitelabel" : "app";

  React.useEffect(() => {
    onChange(tab);
  }, [tab, onChange]);

  return null;
}

export default function UpgradePage() {
  const [activeTab, setActiveTab] = React.useState<UpgradeTab>("app");
  const handleTabParam = React.useCallback(
    (tab: UpgradeTab) => setActiveTab(tab),
    [],
  );

  const router = useRouter();
  const { paddle, paddleReady } = React.useContext(PaddleContext);
  const [sessionUser] = React.useState(() => getSessionUserFromCookie());
  const [period, setPeriod] = React.useState<BillingPeriod>("annually");
  const activePlan = getActivePlan(sessionUser?.subscriptions);
  const activeSubscription = sessionUser?.subscriptions?.subscription;
  const activePlanLabel = PLAN_META[activePlan].label;
  const nextBillingDate = getNextBillingDate(activeSubscription);

  // The plan is already set to expire (renewal cancelled) when is_cancelled is 1.
  const isCancelled = activeSubscription?.is_cancelled === 1;
  const endDate = activeSubscription?.end_date
    ? new Date(activeSubscription.end_date)
    : null;
  const endDateValid = endDate && !Number.isNaN(endDate.getTime());
  const expireNotice =
    isCancelled && activePlan !== "free"
      ? `Your ${activePlanLabel} plan is set to expire${
          endDateValid ? ` on ${formatBillingDate(endDate)}` : ""
        }. Pay immediately to reset your billing cycle.`
      : null;

  /**
   * The White Label sales kit is part of the add-on, not of any subscription
   * tier, so it is gated on `reseller_seats` rather than on the plan rank.
   * The hook answers from the session cookie first, then from the backend's
   * own verification — so the CTA sells the add-on instead of 404-ing the
   * user, and a stale cookie stops mattering once the API replies.
   */
  const { hasAccess: canAccessMarketingAssets } = useWhiteLabelAccess();
  const [isWhiteLabelUpgradeOpen, setIsWhiteLabelUpgradeOpen] =
    React.useState(false);

  const openMarketingAssets = React.useCallback(() => {
    if (!canAccessMarketingAssets) {
      setIsWhiteLabelUpgradeOpen(true);
      return;
    }
    router.push("/marketing-assets");
  }, [canAccessMarketingAssets, router]);

  // Pending plan change awaiting confirmation in the modal.
  const [pendingPlan, setPendingPlan] = React.useState<PlanCard | null>(null);
  const [pendingAction, setPendingAction] = React.useState<PlanAction | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = React.useState(false);

  const openCheckout = React.useCallback(
    (plan: PlanCard) => {
      // Whitelabel plans carry their own one-time Paddle price ID;
      // regular subscriptions resolve via getPlanPriceId.
      const priceId =
        plan.paddlePriceId || getPlanPriceId(plan.planKey, period);

      if (!priceId) {
        toast.error("Price configuration not found for this plan.");
        return;
      }

      if (!paddle || !paddleReady) {
        toast.error("Payment provider not ready. Please try again shortly.");
        return;
      }

      try {
        // Close handled by Paddle's own overlay; pass customData.userId so the
        // backend webhook can attribute the payment to this user.
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: { email: sessionUser?.email ?? "" },
          customData: {
            userId: sessionUser?.id,
            email: sessionUser?.email,
          },
          settings: {
            theme: "dark",
            displayMode: "overlay",
            variant: "one-page",
          },
        });
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to start checkout."));
      }
    },
    [paddle, paddleReady, period, sessionUser],
  );

  const handleCardAction = React.useCallback(
    (plan: PlanCard, action: PlanAction) => {
      if (action === "current") return;

      // Whitelabel one-time purchases always go straight to checkout —
      // they're standalone products, not subscription switches.
      if (plan.paddlePriceId || plan.planKey.startsWith("whitelabel_")) {
        if (!plan.paddlePriceId) {
          toast.error(
            "Price configuration not found for this plan. Please contact support.",
          );
          return;
        }
        openCheckout(plan);
        return;
      }

      // Free users (no paid plan) and users whose plan is already set to expire
      // have nothing to confirm — paying simply starts/resets their billing
      // cycle, so go straight to checkout.
      if (
        (action === "upgrade" || action === "downgrade") &&
        (activePlan === "free" || isCancelled)
      ) {
        openCheckout(plan);
        return;
      }

      // Active paid plan: confirm the immediate switch (or the cancellation).
      setPendingPlan(plan);
      setPendingAction(action);
    },
    [activePlan, isCancelled, openCheckout],
  );

  const closeModal = React.useCallback(() => {
    if (isProcessing) return;
    setPendingPlan(null);
    setPendingAction(null);
  }, [isProcessing]);

  const confirmPlanChange = React.useCallback(async () => {
    if (!pendingAction) return;

    setIsProcessing(true);
    try {
      // Every plan change requires cancelling the current subscription first;
      // the new plan is then purchased via checkout. (Cancel-only stops here.)
      if (activeSubscription?.id != null) {
        await SubscriptionService.cancelSubscription(activeSubscription.id);
      }

      if (pendingAction === "cancel") {
        toast.success(
          "Your plan will not auto-renew. You keep access until the current period ends.",
        );
      } else if (pendingPlan) {
        // Current plan cancelled — open Paddle checkout for the new plan.
        openCheckout(pendingPlan);
      }

      setPendingPlan(null);
      setPendingAction(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to update your subscription."),
      );
    } finally {
      setIsProcessing(false);
    }
  }, [pendingAction, pendingPlan, activeSubscription, openCheckout]);

  const isCancelFlow = pendingAction === "cancel";
  const isDowngradeFlow = pendingAction === "downgrade";
  const renewalCopy = nextBillingDate
    ? `it won't renew after ${formatBillingDate(nextBillingDate)}`
    : "it won't renew at the end of the current billing cycle";

  return (
    <section className="px-6 pt-8 pb-10">
      <Suspense fallback={null}>
        <UpgradeParamsReader onChange={handleTabParam} />
      </Suspense>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as UpgradeTab)}
        className="mx-auto max-w-6xl"
      >
        <div className="flex flex-col items-start gap-8">
          <TabsList>
            <TabsTrigger value="app">Subscriptions</TabsTrigger>
            <TabsTrigger value="whitelabel">Whitelabel Plans</TabsTrigger>
          </TabsList>

          <div className="max-w-3xl text-left">
            <span className="overline">Pricing</span>
            <h1 className="mt-2 font-display text-2xl font-bold text-[var(--text-primary)]">
              Choose the plan that fits your stream
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Go live everywhere. Upgrade to unlock more destinations, higher
              quality, and advanced features.
            </p>
          </div>
        </div>

        <TabsContent value="app">
          <div className="mt-10 grid items-start gap-6 @2xl/app:grid-cols-2 @7xl/app:grid-cols-3">
            {PLANS.map((plan) => (
              <PricingCard
                key={plan.name}
                plan={plan}
                period={period}
                action={getPlanAction(plan.planKey, activePlan)}
                paddleReady={paddleReady}
                expireNotice={expireNotice}
                onAction={handleCardAction}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="whitelabel">
          {/* The sales kit that ships with a White Label licence. Gated on the
              `reseller_seats` add-on: owners go straight to the kit, everyone
              else gets the upgrade prompt. The backend will expose its own
              verification endpoint for this later — until then the gate is
              front-end only, and the proxy repeats it on /marketing-assets. */}
          <div className="mt-10 flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--brand-border)] bg-[var(--brand-muted)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--brand)]/15 text-[var(--brand)]">
                <FolderDown size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Marketing Assets
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Your complete White Label sales kit — guides, presentations,
                  email templates, brochures and brand assets, ready to send.
                </p>
              </div>
            </div>

            <Button
              variant="brand"
              className="shrink-0 gap-1.5"
              onClick={openMarketingAssets}
            >
              <FolderDown size={15} />
              {canAccessMarketingAssets
                ? "Open Marketing Assets"
                : "View Marketing Assets"}
            </Button>
          </div>

          <div className="mt-10 grid items-start gap-6 @2xl/app:grid-cols-2 @7xl/app:grid-cols-3">
            {WHITELABEL_PLANS.map((plan) => (
              <PricingCard
                key={plan.name}
                plan={plan}
                period={period}
                // Whitelabel plans just use upgrade action for display purposes
                action="upgrade"
                paddleReady={true}
                expireNotice={null}
                onAction={handleCardAction}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Shown when someone without the White Label add-on asks for the sales
          kit — it sells the add-on rather than bouncing them. */}
      <WhiteLabelUpgradeModal
        open={isWhiteLabelUpgradeOpen}
        onOpenChange={setIsWhiteLabelUpgradeOpen}
      />

      {/* Confirm plan change / cancellation */}
      <Modal
        open={pendingAction !== null && pendingAction !== "current"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        title={
          isCancelFlow
            ? `Cancel your ${activePlanLabel} plan?`
            : isDowngradeFlow
              ? `Downgrade to ${pendingPlan?.name ?? ""}?`
              : `Upgrade to ${pendingPlan?.name ?? ""}?`
        }
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {isCancelFlow ? (
              <>
                Cancelling stops your {activePlanLabel} plan from renewing —{" "}
                {renewalCopy}. You&apos;ll keep full access to your{" "}
                {activePlanLabel} features until then, after which your account
                moves to the Free plan.
              </>
            ) : isDowngradeFlow ? (
              <>
                To downgrade, we&apos;ll first{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  cancel your current {activePlanLabel} plan
                </span>
                , then take you to checkout for {pendingPlan?.name}. This takes
                effect{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  immediately
                </span>{" "}
                — we won&apos;t wait until{" "}
                {endDateValid
                  ? formatBillingDate(endDate)
                  : "your renewal date"}
                , and any {activePlanLabel}-only features and limits drop to the{" "}
                {pendingPlan?.name} tier right away.
              </>
            ) : (
              <>
                To upgrade, we&apos;ll first{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  cancel your current {activePlanLabel} plan
                </span>
                , then take you to checkout for {pendingPlan?.name}. Your new
                plan and higher limits unlock as soon as payment goes through,
                and your billing cycle starts fresh today.
              </>
            )}
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={closeModal}
              disabled={isProcessing}
            >
              Keep my plan
            </Button>
            <Button
              variant={isCancelFlow ? "destructive" : "brand"}
              onClick={() => void confirmPlanChange()}
              disabled={isProcessing}
              className="gap-1.5"
            >
              {isProcessing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              {isCancelFlow
                ? isProcessing
                  ? "Cancelling..."
                  : "Cancel plan"
                : isProcessing
                  ? "Cancelling current plan..."
                  : isDowngradeFlow
                    ? "Cancel & downgrade"
                    : "Cancel & upgrade"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
```

<sub>826 lines</sub>

#### `providers/PaddleProvider.tsx`

```tsx
"use client";

import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Paddle } from "@paddle/paddle-js";
import { initPaddle } from "@/lib/paddle";

interface PaddleContextType {
  paddle: Paddle | null;
  paddleReady: boolean;
}

export const PaddleContext = createContext<PaddleContextType>({
  paddle: null,
  paddleReady: false,
});

export function PaddleProvider({ children }: { children: ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    initPaddle()
      .then((instance) => {
        if (mounted && instance) {
          setPaddle(instance);
          setPaddleReady(true);
        }
      })
      .catch((error) => console.error("Failed to initialize Paddle:", error));

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PaddleContext.Provider value={{ paddle, paddleReady }}>
      {children}
    </PaddleContext.Provider>
  );
}
```

<sub>48 lines</sub>

#### `lib/paddle.ts`

```ts
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

// Boots Paddle.js with the public client token. The `environment` should be
// "sandbox" while testing and "production" once live price IDs are in place.
export async function initPaddle(): Promise<Paddle | undefined> {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!token) {
    console.warn("Paddle client token is not configured.");
    return undefined;
  }

  const environment =
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
      ? "production"
      : "sandbox";

  const paddle = await initializePaddle({
    environment,
    token,
    eventCallback: (data) => {
      console.log("Paddle event:", data);
      // Refresh the app when the checkout overlay closes so a completed
      // payment (new plan / add-on) is reflected immediately. Covers both the
      // /upgrade pricing cards and the studio remove-branding checkout.
      if (data?.name === "checkout.closed" && typeof window !== "undefined") {
        window.location.reload();
      }
    },
  });

  return paddle;
}
```

<sub>33 lines</sub>

#### `lib/paddle-config.ts`

```ts
import type { PlanName } from "@/lib/plan";

export type BillingPeriod = "monthly" | "annually" | "one-time";

// Maps Flowcasta plan keys (per billing period) to Paddle price IDs, supplied
// via env vars from the Paddle dashboard.
const PRICE_IDS: Record<string, Record<string, string>> = {
  free: { monthly: "", annually: "" },
  professional: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PROFESSIONAL_PLAN_MONTHLY ?? "",
    annually: process.env.NEXT_PUBLIC_PADDLE_PROFESSIONAL_PLAN_ANNUALLY ?? "",
  },
  agency: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_AGENCY_PLAN_MONTHLY ?? "",
    annually: process.env.NEXT_PUBLIC_PADDLE_AGENCY_PLAN_ANNUALLY ?? "",
  },
  reseller: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_RESELLER_PLAN_MONTHLY ?? "",
    annually: process.env.NEXT_PUBLIC_PADDLE_RESELLER_PLAN_ANNUALLY ?? "",
  },
  whitelabel_starter: {
    "one-time": process.env.NEXT_PUBLIC_PADDLE_WHITELABEL_STARTER ?? "",
  },
  whitelabel_pro: {
    "one-time": process.env.NEXT_PUBLIC_PADDLE_WHITELABEL_PRO ?? "",
  },
  whitelabel_unlimited: {
    "one-time": process.env.NEXT_PUBLIC_PADDLE_WHITELABEL_UNLIMITED ?? "",
  },
};

// One-time (lifetime) add-on that removes the Flowcasta studio/broadcast
// branding watermark.
export const REMOVE_BRANDING_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_REMOVE_BRANDING_LIFETIME ?? "";

export const PADDLE_CONFIG = { prices: PRICE_IDS };

// Resolves the Paddle price ID for a paid plan (free has no checkout).
export function getPlanPriceId(
  plan: string,
  period: string = "monthly",
): string | undefined {
  if (plan === "free") {
    return undefined;
  }
  return PRICE_IDS[plan]?.[period] || undefined;
}
```

<sub>48 lines</sub>

#### `components/marketing-assets/useWhiteLabelAccess.ts`

```ts
"use client";

import * as React from "react";

import { getSessionUserFromCookie } from "@/lib/auth-session";
import { hasWhiteLabel } from "@/lib/subscription";
import { getErrorMessage } from "@/lib/utils";
import SubscriptionService from "@/services/Subscriptions";

export interface WhiteLabelAccessState {
  /** "checking" until the backend answers — or fails to. */
  status: "checking" | "ready";
  /** What every gated affordance reads. */
  hasAccess: boolean;
  /** True once the backend, not the cookie, is what `hasAccess` reflects. */
  verified: boolean;
}

/**
 * Whether this account owns the White Label add-on, in one place, so the
 * upgrade CTA and the Marketing Assets page agree.
 *
 * Two gates, in order. The `authUser` cookie answers instantly and decides
 * what renders on the first frame — it is client-written, so it is a
 * rendering hint and nothing more. The backend then answers for real and
 * overrides it in both directions: it can lock out a forged cookie, and it can
 * let in a reseller whose cookie is simply stale after a purchase.
 *
 * If the backend cannot be reached, the cookie's answer stands. A dropped
 * request is not evidence that someone stopped paying, and the download route
 * refuses unverified requests on its own anyway — so a blip costs a paying
 * reseller nothing here.
 */
export function useWhiteLabelAccess(): WhiteLabelAccessState {
  const [sessionUser] = React.useState(() => getSessionUserFromCookie());
  const cookieAccess = hasWhiteLabel(sessionUser?.subscriptions);
  const userId = sessionUser?.id ?? null;

  // Signed out, or no id to ask about: the cookie is all there is, and that
  // is known at render — settling it here rather than in the effect avoids a
  // cascading render (see react.dev, "You Might Not Need an Effect").
  const [state, setState] = React.useState<WhiteLabelAccessState>(() => ({
    status: userId ? "checking" : "ready",
    hasAccess: cookieAccess,
    verified: false,
  }));

  React.useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    SubscriptionService.getWhiteLabelAccess(userId)
      .then((response) => {
        if (cancelled) return;
        setState({
          status: "ready",
          hasAccess: Boolean(response?.has_access),
          verified: true,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("[FlowCasta][WhiteLabel] ACCESS_CHECK_FAILED", {
          userId,
          error: getErrorMessage(error, "Unable to verify White Label access."),
        });
        // Unanswered, so the cookie's answer stands.
        setState({ status: "ready", hasAccess: cookieAccess, verified: false });
      });

    return () => {
      cancelled = true;
    };
  }, [cookieAccess, userId]);

  return state;
}
```

<sub>78 lines</sub>


---

## 11. White Label: configure, details ("Site" page) & runtime branding

**Adding a site (`ConfigureWhiteLabelModal`)**
1. Opened from Settings → Workspaces → *Configure White Label* (or from the workspace page). Requires `hasWhiteLabel`.
2. Reseller enters a **domain**, then brand name, logo, square logo icon, favicon, login carousel slides (image + optional kicker/title/description), default theme (`dark | light | user`), colours (primary, secondary, background, text, button, button text) with a live preview, and support/reply-to emails. Images upload through `UploadService.uploadImage`.
3. **New domain:** `POST /api/custom-domains` (Next route → Vercel adds the domain to the project) → `CustomDomainService.saveDomain({ domain, config })`.
   **Existing domain:** `CustomDomainService.updateConfig({ id, payload: { config } })`.
4. On success the parent redirects to `/workspaces/:workspaceId?dns=:domainId`, which opens the DNS records right away.

**Site details page (`/workspaces/[id]`)**
- Lists the workspace's domains (`getUserDomains` filtered by `workspace_id`). Each card shows status, SSL, a brand colour preview, a carousel count and the logo.
- **Verification:** for every non-active domain, it polls every **5 s**: `GET /api/custom-domains/:domain` (Vercel verification) + `GET /api/custom-domains/:domain/config` (DNS misconfiguration). Once both pass, it calls `PATCH /custom-domains/:id/verification` with `{ verified, configured, status: "active", ssl_status: "active", error: null }`.
- **DNS records** (`DnsDomainRecordModal`): A/CNAME and TXT verification records from Vercel, with copy buttons and a manual "Verify" action.
- **Edit** reopens `ConfigureWhiteLabelModal` pre-filled. **Delete** (`ConfirmDeleteDomainModal`) → `DELETE /api/custom-domains/:domain` (Vercel) **then** `CustomDomainService.deleteDomain(id)`.

**Runtime (the tenant's site)**
- `BrandProvider` calls `CustomDomainService.resolveDomain(window.location.hostname)` on every load. If a tenant owns the host, it applies the brand name, logo, favicon, carousel, default theme and **overrides the `--brand*` CSS variables inline**. On the product's own host it gets `null` and keeps stock branding.
- `BrandGate` renders children under a full-screen two-panel "curtain" (`var(--bg)` + spinner). The curtain slides open once `isBrandReady`, so tenants never see a flash of the stock brand.
- `config/brand.ts` holds the defaults (`DEFAULT_BRAND_COLORS`, `DEFAULT_LOGIN_CAROUSEL`, `normalizeCarousel`, `resolveSlideCopy`, the host helpers). **Update the defaults to the new product's brand.**

#### `services/CustomDomain.ts`

```ts
import api from "./api/api";

/** One slide on the sign-in carousel. `position` is 1-based and authoritative —
 * the array order a reseller saves may not survive the backend round-trip. */
export type LoginCarouselSlide = {
  url: string;
  position: number;
  /** Optional copy. Blank falls back to the stock wording for that position,
   * with `{brand}` resolved to the tenant's brand name. */
  kicker?: string | null;
  title?: string | null;
  description?: string | null;
};

export type CustomDomainConfig = {
  brand_name: string | null;
  logo_url: string | null;
  /** Square/short-form mark for the collapsed sidebar and tight headers. */
  logo_icon_url: string | null;
  favicon_url: string | null;
  login_carousel: LoginCarouselSlide[] | null;
  /** Appearance a first-time visitor gets. "user" leaves their own choice alone. */
  default_theme: "dark" | "light" | "user" | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  button_color: string;
  button_text_color: string;
  support_email: string | null;
  reply_to_email: string | null;
};

export type SaveCustomDomainPayload = {
  domain: string;
  config: CustomDomainConfig;
};

export type UpdateVerificationPayload = {
  verified: boolean;
  configured: boolean;
  status: "active" | "pending";
  ssl_status: "active" | "pending";
  error: string | null;
};

/** The shape /custom-domains/resolve answers with for a tenant host. */
export type ResolvedDomain = {
  domain: string;
  workspace_id: number;
  config: Partial<CustomDomainConfig> | null;
  workspace?: {
    id?: number;
    name?: string | null;
    slug?: string | null;
    logo?: string | null;
  } | null;
};

/**
 * A falsy `success` is the ordinary answer on the Flowcasta host — it means no
 * tenant owns this domain, so the app keeps its stock branding.
 */
type ResolveDomainResponse = {
  success: boolean;
  message?: string;
  domain?: string;
  data?: ResolvedDomain;
};

class CustomDomainService {
  async saveDomain(payload: SaveCustomDomainPayload) {
    const response = await api.post("/custom-domains", payload);
    return response.data;
  }

  // /custom-domains/{customDomain}/config
  async updateConfig({
    payload,
    id,
  }: {
    payload: { config: CustomDomainConfig };
    id: number | string;
  }) {
    const response = await api.patch(`/custom-domains/${id}/config`, payload);
    return response.data;
  }
  async updateVerification(
    id: number | string,
    payload: UpdateVerificationPayload,
  ) {
    const response = await api.patch(
      `/custom-domains/${id}/verification`,
      payload,
    );
    return response.data;
  }

  async getUserDomains() {
    const response = await api.get("/custom-domains");
    return response.data;
  }

  /** Removes the domain record from our backend. Callers must drop it from the
   * Vercel project first — see DELETE /api/custom-domains/[domain]. */
  async deleteDomain(id: number | string) {
    const response = await api.delete(`/custom-domains/${id}`);
    return response.data;
  }

  /**
   * Public brand lookup for the host the app is being served from. Runs on
   * every page load, before anyone signs in, so the host travels as a query
   * param rather than being inferred from the session.
   *
   * Returns null when no active tenant claims the host — the Flowcasta host
   * itself answers that way, which is how the app falls back to stock styling.
   */
  async resolveDomain(host?: string): Promise<ResolvedDomain | null> {
    const tenantHost =
      host ?? (typeof window !== "undefined" ? window.location.hostname : "");

    if (!tenantHost) return null;

    const response = await api.get<ResolveDomainResponse>(
      "/custom-domains/resolve",
      { params: { domain: tenantHost } },
    );

    const payload = response.data;
    if (!payload?.success || !payload.data) return null;
    return payload.data;
  }
}

export default new CustomDomainService();
```

<sub>136 lines</sub>

#### `config/brand.ts`

```ts
import type {
  CustomDomainConfig,
  LoginCarouselSlide,
} from "@/services/CustomDomain";

/**
 * Brand configuration resolved per request host.
 *
 * Flowcasta serves two kinds of host: the vendor host (`NEXT_PUBLIC_APP_HOST`,
 * plus localhost during development) and white-label tenant domains that
 * resellers point at us via CNAME. On a tenant host the workspace's saved
 * custom-domain config replaces the Flowcasta identity — colors, logo, favicon
 * and brand name — everywhere in the app.
 */
export type BrandConfig = {
  brand_name: string;
  logo_url: string | null;
  logo_icon_url: string | null;
  favicon_url: string | null;
  login_carousel: LoginCarouselSlide[] | null;
  default_theme: "dark" | "light" | "user" | null;
  primary_color: string;
  secondary_color: string;
  background_color: string | null;
  text_color: string | null;
  button_color: string | null;
  button_text_color: string | null;
  support_email: string | null;
  reply_to_email: string | null;
  hide_vendor_branding: boolean;
};

/**
 * Stock Flowcasta palette, lifted straight from the `:root` tokens in
 * globals.css. These seed the configure form, so a reseller who leaves the
 * pickers alone gets an app that looks exactly like Flowcasta rather than a
 * white page with dark text.
 */
export const DEFAULT_BRAND_COLORS = {
  primary_color: "#dd4c25", // --brand
  secondary_color: "#1c1c1a", // --surface-raised
  background_color: "#0a0a09", // --bg
  text_color: "#f2f2ef", // --text-primary
  button_color: "#dd4c25", // --brand
  button_text_color: "#ffffff",
} as const;

/**
 * The stock sign-in carousel. Resellers see these in the configure modal as the
 * starting point, so leaving the section alone keeps the Flowcasta imagery
 * rather than dropping the sign-in page to a blank panel.
 */
export const DEFAULT_LOGIN_CAROUSEL: LoginCarouselSlide[] = [
  {
    url: "/login/carousel_one.png",
    position: 1,
    kicker: "Live Studio Builder",
    title: "Design cinematic live shows, right in your browser.",
    description:
      "Layer cameras, chat overlays, countdowns, and lower thirds with one unified {brand} studio.",
  },
  {
    url: "/login/carousel_two.png",
    position: 2,
    kicker: "Performance Analytics",
    title: "Know what resonates across every platform.",
    description:
      "Track engagement, reach, and conversions while you stream. One dashboard for every channel.",
  },
  {
    url: "/login/carousel_three.png",
    position: 3,
    kicker: "Control Room",
    title: "Run the show with total confidence.",
    description:
      "Cue scenes, manage audio, and go live instantly with a studio built for teams and creators.",
  },
];

/**
 * Resolves `{brand}` in carousel copy. Stock wording mentions the product by
 * name, so a reseller who keeps the defaults gets their own name in the words
 * rather than ours.
 */
export function applyBrandToCopy(
  text: string | null | undefined,
  brandName: string,
): string | null {
  if (!text) return null;
  return text.replace(/\{brand\}/g, brandName);
}

/**
 * The copy a slide should show: whatever the reseller typed, else the stock
 * wording for that position. Positions beyond the defaults simply have none.
 */
export function resolveSlideCopy(
  slide: LoginCarouselSlide,
  index: number,
  brandName: string,
): { kicker: string | null; title: string | null; description: string | null } {
  const fallback = DEFAULT_LOGIN_CAROUSEL[index];

  return {
    kicker: applyBrandToCopy(slide.kicker || fallback?.kicker, brandName),
    title: applyBrandToCopy(slide.title || fallback?.title, brandName),
    description: applyBrandToCopy(
      slide.description || fallback?.description,
      brandName,
    ),
  };
}

/**
 * Keeps only usable slides and sorts them by the saved position, so the order a
 * reseller picked survives however the backend returns the array. Returns null
 * for an empty or absent list — the caller then falls back to the defaults.
 */
export function normalizeCarousel(
  slides: LoginCarouselSlide[] | null | undefined,
): LoginCarouselSlide[] | null {
  if (!Array.isArray(slides)) return null;

  const usable = slides
    .filter((slide) => Boolean(slide?.url))
    .map((slide, index) => ({
      ...slide,
      url: slide.url,
      position: Number.isFinite(slide.position) ? slide.position : index + 1,
    }))
    .sort((a, b) => a.position - b.position);

  return usable.length > 0 ? usable : null;
}

/** localStorage key prefix. Namespaced by host so two tenant domains open in
 * the same browser can't paint each other's brand before their fetch lands. */
export const BRAND_CONFIG_STORAGE_PREFIX = "flowcasta_brand_config";

export const DEFAULT_APP_HOST =
  normalizeHost(process.env.NEXT_PUBLIC_APP_HOST) || "studio.flowcasta.com";

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

/** The stock Flowcasta identity — mirrors the `--brand*` tokens in globals.css. */
export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  brand_name: "Flowcasta",
  logo_url: null,
  logo_icon_url: null,
  favicon_url: null,
  login_carousel: null,
  default_theme: null,
  primary_color: DEFAULT_BRAND_COLORS.primary_color,
  secondary_color: DEFAULT_BRAND_COLORS.secondary_color,
  background_color: DEFAULT_BRAND_COLORS.background_color,
  text_color: DEFAULT_BRAND_COLORS.text_color,
  button_color: DEFAULT_BRAND_COLORS.button_color,
  button_text_color: DEFAULT_BRAND_COLORS.button_text_color,
  support_email: null,
  reply_to_email: null,
  hide_vendor_branding: false,
};

/** Strips protocol, path and port, then lowercases. Every host comparison in
 * the app goes through this so `HTTPS://App.Flowcasta.com:443/x` still matches. */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
}

/** True for the vendor host and for local development, which always behaves as
 * the vendor host so `npm run dev` never renders a half-resolved tenant. */
export function isDefaultAppHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  return normalized === DEFAULT_APP_HOST || LOCAL_DEV_HOSTS.has(normalized);
}

/** True when nothing distinguishes the config from stock Flowcasta — used to
 * decide whether a tenant host has real branding worth painting early. */
export function isVendorBranding(config: BrandConfig): boolean {
  return (
    config.brand_name === DEFAULT_BRAND_CONFIG.brand_name &&
    !config.logo_url &&
    !config.logo_icon_url &&
    !config.favicon_url &&
    config.primary_color === DEFAULT_BRAND_CONFIG.primary_color
  );
}

/**
 * Overlays a saved custom-domain config onto a base brand. Strings fall back on
 * empty (`||`) while nullable assets keep an explicit `null` (`??`), so clearing
 * a logo in the configure modal actually clears it.
 */
export function mergeBrandConfig(
  base: BrandConfig,
  config: Partial<CustomDomainConfig> | null | undefined,
  brandName?: string | null,
): BrandConfig {
  if (!config) {
    return brandName ? { ...base, brand_name: brandName } : base;
  }

  return {
    brand_name: brandName || base.brand_name,
    logo_url: config.logo_url ?? base.logo_url,
    logo_icon_url: config.logo_icon_url ?? base.logo_icon_url,
    favicon_url: config.favicon_url ?? base.favicon_url,
    login_carousel:
      normalizeCarousel(config.login_carousel) ?? base.login_carousel,
    default_theme: config.default_theme ?? base.default_theme,
    primary_color: config.primary_color || base.primary_color,
    secondary_color: config.secondary_color || base.secondary_color,
    background_color: config.background_color ?? base.background_color,
    text_color: config.text_color ?? base.text_color,
    button_color: config.button_color ?? base.button_color,
    button_text_color: config.button_text_color ?? base.button_text_color,
    support_email: config.support_email ?? base.support_email,
    reply_to_email: config.reply_to_email ?? base.reply_to_email,
    hide_vendor_branding: base.hide_vendor_branding,
  };
}

// ── Color derivation ──────────────────────────────────────────────────────
// The design system exposes one brand hue as six tokens (`--brand`, plus hover,
// light, dim, muted and glow). A tenant only picks the base color, so the rest
// are derived here — that is what makes every existing `var(--brand-hover)` and
// `shadow-brand` in the app repaint without touching a single component.

type Rgb = { r: number; g: number; b: number };

/** Parses `#rgb` / `#rrggbb`. Returns null for anything else (including the
 * `var(--x)` values a config may legitimately carry). */
export function parseHexColor(hex: string | null | undefined): Rgb | null {
  if (!hex) return null;
  const value = hex.trim().replace(/^#/, "");

  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

const clampChannel = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((c) => clampChannel(c).toString(16).padStart(2, "0")).join("")}`;

/** Mixes toward black (negative amount) or white (positive), by ratio. */
function shade(rgb: Rgb, amount: number): Rgb {
  const target = amount < 0 ? 0 : 255;
  const ratio = Math.abs(amount);
  return {
    r: rgb.r + (target - rgb.r) * ratio,
    g: rgb.g + (target - rgb.g) * ratio,
    b: rgb.b + (target - rgb.b) * ratio,
  };
}

const rgba = ({ r, g, b }: Rgb, alpha: number) =>
  `rgba(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)}, ${alpha})`;

/**
 * The full `--brand*` token set for a primary color, matching the ratios the
 * stock palette uses (#dd4c25 → hover #c73f1c, light #f26640, dim #b83d1e).
 * Returns null when the color isn't a hex we can derive from, in which case the
 * caller should leave the stylesheet defaults alone.
 */
export function deriveBrandTokens(
  primaryColor: string | null | undefined,
): Record<string, string> | null {
  const rgb = parseHexColor(primaryColor);
  if (!rgb) return null;

  const hex = toHex(rgb);

  return {
    "--brand": hex,
    "--brand-hover": toHex(shade(rgb, -0.12)),
    "--brand-light": toHex(shade(rgb, 0.14)),
    "--brand-dim": toHex(shade(rgb, -0.2)),
    "--brand-muted": rgba(rgb, 0.14),
    "--brand-glow": rgba(rgb, 0.28),
    "--brand-glow-lg": rgba(rgb, 0.18),
    "--brand-wash": rgba(rgb, 0.08),
    "--brand-faint": rgba(rgb, 0.15),
    "--brand-border": rgba(rgb, 0.3),
    "--brand-border-strong": rgba(rgb, 0.4),
    "--gradient-brand": `linear-gradient(135deg, ${hex} 0%, ${toHex(shade(rgb, -0.2))} 100%)`,
    "--gradient-brand-glow": `linear-gradient(135deg, ${rgba(rgb, 0.9)} 0%, ${rgba(shade(rgb, -0.2), 0.7)} 100%)`,
  };
}
```

<sub>309 lines</sub>

#### `components/modals/ConfigureWhiteLabelModal.tsx`

```tsx
"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Globe,
  Images,
  Loader2,
  Mail,
  Palette,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Workspace } from "@/stores/workspace-store";
import { toast } from "@/lib/toast";
import CustomDomainService, {
  type CustomDomainConfig,
  type LoginCarouselSlide,
} from "@/services/CustomDomain";
import {
  applyBrandToCopy,
  DEFAULT_BRAND_COLORS,
  DEFAULT_BRAND_CONFIG,
  DEFAULT_LOGIN_CAROUSEL,
  resolveSlideCopy,
} from "@/config/brand";
import UploadService from "@/services/Upload";

/** "user" leaves each visitor's own theme choice alone. */
type ThemePreference = "dark" | "light" | "user";

const THEME_OPTIONS = [
  { value: "user", label: "Let users choose" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export type WhiteLabelFormValues = {
  id: number | string | null;
  customDomain: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  supportEmail: string;
  replyToEmail: string;
  defaultTheme: ThemePreference;
  logoUrl?: string;
  logoIconUrl?: string;
  faviconUrl?: string;
  loginCarousel?: LoginCarouselSlide[];
};

type ConfigureWhiteLabelModalProps = {
  open: boolean;
  workspace: Workspace | null;
  initialValues?: Partial<WhiteLabelFormValues> | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WhiteLabelFormValues) => Promise<void>;
  // isEditing: boolean;
};

const DEFAULTS: WhiteLabelFormValues = {
  id: 0,
  customDomain: "",
  brandName: "",
  primaryColor: DEFAULT_BRAND_COLORS.primary_color,
  secondaryColor: DEFAULT_BRAND_COLORS.secondary_color,
  backgroundColor: DEFAULT_BRAND_COLORS.background_color,
  textColor: DEFAULT_BRAND_COLORS.text_color,
  buttonColor: DEFAULT_BRAND_COLORS.button_color,
  buttonTextColor: DEFAULT_BRAND_COLORS.button_text_color,
  supportEmail: "",
  replyToEmail: "",
  defaultTheme: "user",
  logoUrl: "",
  logoIconUrl: "",
  faviconUrl: "",
  loginCarousel: DEFAULT_LOGIN_CAROUSEL,
};

const COLOR_FIELDS: Array<{
  field: keyof WhiteLabelFormValues;
  label: string;
}> = [
  { field: "primaryColor", label: "Primary Color" },
  { field: "secondaryColor", label: "Secondary Color" },
  { field: "backgroundColor", label: "Background Color" },
  { field: "textColor", label: "Text Color" },
  { field: "buttonColor", label: "Button Color" },
  { field: "buttonTextColor", label: "Button Text Color" },
];

type CarouselCopyField = "kicker" | "title" | "description";

const CAROUSEL_COPY_FIELDS: Array<{
  field: CarouselCopyField;
  label: string;
}> = [
  { field: "kicker", label: "Kicker" },
  { field: "title", label: "Headline" },
  { field: "description", label: "Description" },
];

/**
 * The stock wording for a slide, with `{brand}` resolved — shown as the input
 * placeholder so a reseller can see exactly what they'd get by leaving it blank.
 */
function defaultSlideCopy(index: number, brandName: string) {
  const slide = DEFAULT_LOGIN_CAROUSEL[index];
  const name = brandName.trim() || DEFAULT_BRAND_CONFIG.brand_name;

  return {
    kicker: applyBrandToCopy(slide?.kicker, name),
    title: applyBrandToCopy(slide?.title, name),
    description: applyBrandToCopy(slide?.description, name),
  };
}

/** Section heading used to keep the single-form layout scannable. */
function SectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
      <span className="text-[var(--brand)]">{icon}</span>
      <h3 className="font-display text-[13px] font-semibold tracking-[0.01em] text-[var(--text-primary)]">
        {title}
      </h3>
    </div>
  );
}

export function ConfigureWhiteLabelModal({
  open,
  workspace,
  initialValues,
  onOpenChange,
  onSubmit,
}: ConfigureWhiteLabelModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [domainError, setDomainError] = React.useState<string | null>(null);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoIconUploading, setLogoIconUploading] = React.useState(false);
  const [faviconUploading, setFaviconUploading] = React.useState(false);
  const [carouselUploadIndex, setCarouselUploadIndex] = React.useState<
    number | null
  >(null);
  const [values, setValues] = React.useState<WhiteLabelFormValues>(DEFAULTS);

  // An existing domain is already registered on the project — the host is
  // immutable from here, so only its branding stays editable.
  const isExistingDomain = Boolean(initialValues?.id);

  React.useEffect(() => {
    if (open && workspace) {
      setDomainError(null);
      setValues({
        ...DEFAULTS,
        ...Object.fromEntries(
          Object.entries(initialValues ?? {}).filter(
            ([, value]) =>
              value !== null && value !== undefined && value !== "",
          ),
        ),
        brandName: initialValues?.brandName || workspace.name,
      });
    }
  }, [open, workspace, initialValues]);

  const handleChange = (
    field: keyof WhiteLabelFormValues,
    value: string,
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (field === "customDomain") {
      setDomainError(null);
    }
  };

  type ImageField = "logoUrl" | "logoIconUrl" | "faviconUrl";

  const IMAGE_FIELD_LABEL: Record<ImageField, string> = {
    logoUrl: "logo",
    logoIconUrl: "logo icon",
    faviconUrl: "favicon",
  };

  const handleUpload = async (
    file: File,
    field: ImageField,
    setUploading: (uploading: boolean) => void,
  ) => {
    setUploading(true);
    try {
      const res = await UploadService.uploadImage(file);
      if (res.url) {
        handleChange(field, res.url);
      }
    } catch {
      toast.error(`Failed to upload ${IMAGE_FIELD_LABEL[field]}.`);
    } finally {
      setUploading(false);
    }
  };

  /** Replaces one carousel slide's image, keeping its saved position. */
  const handleCarouselUpload = async (file: File, index: number) => {
    setCarouselUploadIndex(index);
    try {
      const res = await UploadService.uploadImage(file);
      if (!res.url) return;

      setValues((prev) => {
        const slides = [...(prev.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL)];
        // Spread the existing slide so replacing the image keeps its copy.
        slides[index] = { ...slides[index], url: res.url, position: index + 1 };
        return { ...prev, loginCarousel: slides };
      });
    } catch {
      toast.error("Failed to upload carousel image.");
    } finally {
      setCarouselUploadIndex(null);
    }
  };

  /** Sets one copy field on a slide. Empty clears back to the stock wording. */
  const updateCarouselCopy = (
    index: number,
    field: CarouselCopyField,
    value: string,
  ) => {
    setValues((prev) => {
      const slides = [...(prev.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL)];
      slides[index] = { ...slides[index], [field]: value || null };
      return { ...prev, loginCarousel: slides };
    });
  };

  /** Exactly what the sign-in page will render for a slide: the reseller's own
   * wording, else the stock line with their brand name resolved. */
  const slidePreview = (index: number) => {
    const slides = values.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL;
    return resolveSlideCopy(
      slides[index] ?? { url: "", position: index + 1 },
      index,
      values.brandName.trim() || DEFAULT_BRAND_CONFIG.brand_name,
    );
  };

  /** Moves a slide up or down and renumbers positions to match. */
  const moveCarouselSlide = (index: number, direction: -1 | 1) => {
    setValues((prev) => {
      const slides = [...(prev.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL)];
      const target = index + direction;
      if (target < 0 || target >= slides.length) return prev;

      [slides[index], slides[target]] = [slides[target], slides[index]];

      return {
        ...prev,
        loginCarousel: slides.map((slide, i) => ({ ...slide, position: i + 1 })),
      };
    });
  };

  /**
   * Registers the host on the Vercel project so its DNS/verification records
   * exist. Only runs for domains we haven't added yet; returns false when the
   * caller should stop and surface `domainError`.
   */
  const registerDomainOnProject = async (domain: string) => {
    const res = await fetch("/api/custom-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });

    const data = await res.json();

    if (!res.ok) {
      setDomainError(
        data?.error ||
          "Failed to add domain. Make sure it is a valid Cloudflare-registered domain.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    const domain = values.customDomain.trim();

    if (!domain) {
      setDomainError("Please enter a domain.");
      return;
    }

    setIsSubmitting(true);
    setDomainError(null);

    // Carries the new record's id back to the caller, which uses it to open the
    // DNS instructions for the domain that was just created.
    let savedDomain: { data?: { id?: number | string } } | undefined;

    const config: CustomDomainConfig = {
      brand_name: values.brandName.trim() || null,
      logo_url: values.logoUrl || null,
      logo_icon_url: values.logoIconUrl || null,
      favicon_url: values.faviconUrl || null,
      login_carousel: values.loginCarousel?.length
        ? values.loginCarousel
        : null,
      default_theme: values.defaultTheme,
      primary_color: values.primaryColor,
      secondary_color: values.secondaryColor,
      background_color: values.backgroundColor,
      text_color: values.textColor,
      button_color: values.buttonColor,
      button_text_color: values.buttonTextColor,
      support_email: values.supportEmail.trim() || null,
      reply_to_email: values.replyToEmail.trim() || null,
    };

    try {
      // An existing domain is already on the Vercel project — re-registering it
      // would fail and, worse, POSTing again would duplicate the record. Only a
      // brand-new host takes the register-then-create path.
      if (isExistingDomain) {
        await CustomDomainService.updateConfig({
          payload: { config },
          id: values.id!,
        });
      } else {
        if (!(await registerDomainOnProject(domain))) return;
        savedDomain = await CustomDomainService.saveDomain({ domain, config });
      }

      // `||` not `??`: a new domain starts at id 0, which `??` would keep,
      // leaving the caller with no id to open the DNS records for.
      await onSubmit({
        ...values,
        id: values.id || savedDomain?.data?.id || null,
      });

      toast.success("White label settings saved!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save white label settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy =
    isSubmitting ||
    logoUploading ||
    logoIconUploading ||
    faviconUploading ||
    carouselUploadIndex !== null;

  const renderImageField = (
    field: ImageField,
    label: string,
    hint: string | null,
    uploading: boolean,
    setUploading: (uploading: boolean) => void,
    accept: string,
    previewClassName: string,
  ) => (
    <div>
      <label className="block font-display text-[13px] font-semibold tracking-[0.01em] text-[var(--text-secondary)]">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-4">
        {values[field] ? (
          <div
            className={`relative flex items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] ${previewClassName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={values[field]}
              alt={label}
              className="max-h-full max-w-full object-contain"
            />
            <button
              type="button"
              onClick={() => handleChange(field, "")}
              className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <input
              type="file"
              accept={accept}
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUpload(e.target.files[0], field, setUploading);
                }
              }}
              className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-muted)] file:mr-4 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--brand)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
            />
          </div>
        )}
        {uploading && (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" />
        )}
      </div>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );

  const footer = (
    <>
      <Button
        variant="ghost"
        onClick={() => onOpenChange(false)}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button variant="brand" onClick={handleSubmit} disabled={isBusy}>
        {isSubmitting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Saving…
          </>
        ) : (
          "Save White Label"
        )}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Configure White Label"
      subtitle={`Set up your custom branding for ${workspace?.name ?? "this workspace"}`}
      size="xl"
      footer={footer}
    >
      <div className="space-y-7">
        {/* Brand name & domain */}
        <div className="space-y-4">
          <SectionHeading
            icon={<Globe className="h-4 w-4" />}
            title="Brand Name & Domain"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Brand Name"
              placeholder="My Business Reviews"
              value={values.brandName}
              onChange={(e) => handleChange("brandName", e.target.value)}
            />

            <div>
              <Input
                label="Custom Domain"
                placeholder="e.g. app.mybusiness.com"
                value={values.customDomain}
                onChange={(e) => handleChange("customDomain", e.target.value)}
                disabled={isExistingDomain}
                error={domainError ?? undefined}
              />
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                {isExistingDomain
                  ? "The domain can't be changed. Add a new domain instead."
                  : "Enter only your custom host/domain. Do not include http:// or https://."}
              </p>
            </div>
          </div>

          {!isExistingDomain ? (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-300">
                  Cloudflare domains only
                </p>
                <p className="text-xs leading-relaxed text-amber-200/80">
                  Your domain <strong>must</strong> be registered and managed
                  through Cloudflare. Domains on other registrars or DNS
                  providers will not work with our white-label system. Make sure
                  your domain&apos;s nameservers point to Cloudflare before
                  saving.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Brand identity */}
        <div className="space-y-4">
          <SectionHeading
            icon={<Palette className="h-4 w-4" />}
            title="Brand Identity"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            {renderImageField(
              "logoUrl",
              "Logo (optional)",
              "Use a logo no larger than 612 × 408 pixels for best results.",
              logoUploading,
              setLogoUploading,
              "image/*",
              "h-16 w-24",
            )}
            {renderImageField(
              "logoIconUrl",
              "Logo Icon (optional)",
              "Square, short-form mark used where the full logo won't fit.",
              logoIconUploading,
              setLogoIconUploading,
              "image/*",
              "h-12 w-12",
            )}
            {renderImageField(
              "faviconUrl",
              "Favicon (optional)",
              null,
              faviconUploading,
              setFaviconUploading,
              "image/x-icon,image/png,image/jpeg,image/webp",
              "h-12 w-12",
            )}
          </div>

          <div className="max-w-xs">
            <label className="mb-1.5 block font-display text-[13px] font-semibold tracking-[0.01em] text-[var(--text-secondary)]">
              Default Appearance
            </label>
            <Select
              value={values.defaultTheme}
              onValueChange={(value) =>
                handleChange("defaultTheme", value as ThemePreference)
              }
              options={THEME_OPTIONS}
              contentClassName="z-[60]"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Applies to first-time visitors only — anyone who picks their own
              theme keeps it.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {COLOR_FIELDS.map(({ field, label }) => (
              <div key={field}>
                <Input
                  label={label}
                  type="color"
                  value={values[field] as string}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="h-10 cursor-pointer p-1"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {values[field] as string}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Sign-in carousel */}
        <div className="space-y-4">
          <SectionHeading
            icon={<Images className="h-4 w-4" />}
            title="Sign-in Carousel"
          />

          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            These images rotate behind your sign-in page. The defaults below are
            what your customers see today — replace any of them with your own,
            or reorder them. Leave them as they are to keep the stock imagery.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {(values.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL).map(
              (slide, index) => (
                <div
                  key={`${index}-${slide.url}`}
                  className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)]"
                >
                  <div className="relative aspect-video bg-[var(--surface)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.url}
                      alt={`Carousel slide ${index + 1}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Live preview: the same scrim and type scale the sign-in
                        panel uses, so what shows here is what ships. */}
                    <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(10,10,9,0.85)_0%,rgba(10,10,9,0.35)_45%,rgba(10,10,9,0.9)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      {slidePreview(index).kicker ? (
                        <p className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-white/60">
                          {slidePreview(index).kicker}
                        </p>
                      ) : null}
                      {slidePreview(index).title ? (
                        <p className="mt-0.5 line-clamp-2 font-display text-[11px] font-bold leading-tight text-white">
                          {slidePreview(index).title}
                        </p>
                      ) : null}
                      {slidePreview(index).description ? (
                        <p className="mt-1 line-clamp-2 text-[9px] leading-snug text-white/70">
                          {slidePreview(index).description}
                        </p>
                      ) : null}
                    </div>

                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {index + 1}
                    </span>
                    {carouselUploadIndex === index ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-1 border-t border-[var(--border)] px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveCarouselSlide(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move slide ${index + 1} earlier`}
                        className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCarouselSlide(index, 1)}
                        disabled={
                          index ===
                          (values.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL)
                            .length -
                            1
                        }
                        aria-label={`Move slide ${index + 1} later`}
                        className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowRight size={13} />
                      </button>
                    </div>

                    <label className="cursor-pointer text-[11px] font-semibold text-[var(--brand)] transition-opacity hover:opacity-80">
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={carouselUploadIndex !== null}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleCarouselUpload(e.target.files[0], index);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Blank fields keep the stock wording for that position. */}
                  <div className="space-y-2 border-t border-[var(--border)] p-2">
                    {CAROUSEL_COPY_FIELDS.map(({ field, label }) => (
                      <input
                        key={field}
                        value={slide[field] ?? ""}
                        placeholder={
                          defaultSlideCopy(index, values.brandName)[field] ??
                          label
                        }
                        onChange={(e) =>
                          updateCarouselCopy(index, field, e.target.value)
                        }
                        aria-label={`${label} for slide ${index + 1}`}
                        className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
                      />
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Custom email */}
        <div className="space-y-4">
          <SectionHeading
            icon={<Mail className="h-4 w-4" />}
            title="Custom Email"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Support Email (optional)"
              type="email"
              placeholder="support@your-domain.com"
              value={values.supportEmail}
              onChange={(e) => handleChange("supportEmail", e.target.value)}
            />
            <Input
              label="Reply-To Email (optional)"
              type="email"
              placeholder="reply@your-domain.com"
              value={values.replyToEmail}
              onChange={(e) => handleChange("replyToEmail", e.target.value)}
            />
          </div>

          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            These emails will be used when your white-label customers receive
            system notifications. Leave blank to use the workspace default.
          </p>
        </div>
      </div>
    </Modal>
  );
}
```

<sub>746 lines</sub>

#### `components/modals/WhiteLabelUpgradeModal.tsx`

```tsx
"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Lock } from "lucide-react";

type WhiteLabelUpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WhiteLabelUpgradeModal({
  open,
  onOpenChange,
}: WhiteLabelUpgradeModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Upgrade to White Label"
      size="md"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-raised)] ring-8 ring-[var(--surface-hover)]">
          <Lock className="h-6 w-6 text-[var(--brand)]" />
        </div>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Unlock the ability to use your own custom domains, branding colors, and remove vendor branding. Elevate your workspace and present it as your own application.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Link
            href="/upgrade?tab=whitelabel"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            <Button className="w-full bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]">
              View Upgrade Plans
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
```

<sub>53 lines</sub>

#### `app/(dashboard)/workspaces/[id]/page.tsx`

```tsx
"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  ExternalLink,
  Globe,
  ListTree,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  ConfigureWhiteLabelModal,
  type WhiteLabelFormValues,
} from "@/components/modals/ConfigureWhiteLabelModal";
import { WhiteLabelUpgradeModal } from "@/components/modals/WhiteLabelUpgradeModal";
import { DnsDomainRecordModal } from "@/components/modals/DnsDomainRecordModal";
import { ConfirmDeleteDomainModal } from "@/components/modals/ConfirmDeleteDomainModal";
import { Button } from "@/components/ui/Button";
import { getSessionUserFromCookie } from "@/lib/auth-session";
import { hasWhiteLabel } from "@/lib/subscription";
import {
  DEFAULT_BRAND_COLORS,
  DEFAULT_LOGIN_CAROUSEL,
  normalizeCarousel,
} from "@/config/brand";
import { toast } from "@/lib/toast";
import CustomDomainService, {
  type CustomDomainConfig,
} from "@/services/CustomDomain";

type DomainRecord = {
  id: number | string;
  workspace_id: number | string;
  domain: string;
  status?: string;
  verified?: boolean;
  configured?: boolean;
  ssl_status?: string;
  config?: Partial<CustomDomainConfig> | null;
  created_at?: string;
};

type LiveStatus = { verified: boolean; message: string };

/** How often unverified domains are re-checked while this page is open. */
const VERIFICATION_POLL_MS = 5000;

const SWATCHES: Array<{
  key: keyof CustomDomainConfig;
  label: string;
  fallback: string;
}> = [
  {
    key: "primary_color",
    label: "Primary",
    fallback: DEFAULT_BRAND_COLORS.primary_color,
  },
  {
    key: "secondary_color",
    label: "Secondary",
    fallback: DEFAULT_BRAND_COLORS.secondary_color,
  },
  {
    key: "button_color",
    label: "Button",
    fallback: DEFAULT_BRAND_COLORS.button_color,
  },
  {
    key: "background_color",
    label: "Background",
    fallback: DEFAULT_BRAND_COLORS.background_color,
  },
];

/**
 * Reads ?dns=<domain id> in a Suspense-isolated child. Set when a reseller is
 * sent here from the settings page right after saving a new domain, so the
 * records they still have to add are the first thing they see.
 */
function DnsParamReader({
  onChange,
}: {
  onChange: (domainId: string | null) => void;
}) {
  const searchParams = useSearchParams();
  const dnsParam = searchParams.get("dns");

  React.useEffect(() => {
    onChange(dnsParam);
  }, [dnsParam, onChange]);

  return null;
}

export default function WorkspaceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { workspaces } = useWorkspaceStore();
  const workspace = workspaces.find((w) => String(w.id) === id);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState(false);
  const [isDnsModalOpen, setIsDnsModalOpen] = React.useState(false);
  const [domainConfig, setDomainConfig] = React.useState<DomainRecord[]>([]);
  const [isLoadingDomain, setIsLoadingDomain] = React.useState(true);
  const [selectedDomain, setSelectedDomain] =
    React.useState<DomainRecord | null>(null);
  const [dnsDomain, setDnsDomain] = React.useState<DomainRecord | null>(null);
  const [verifyingId, setVerifyingId] = React.useState<number | string | null>(
    null,
  );
  const [liveStatus, setLiveStatus] = React.useState<
    Record<string, LiveStatus>
  >({});
  const [domainToDelete, setDomainToDelete] =
    React.useState<DomainRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [pendingDnsId, setPendingDnsId] = React.useState<string | null>(null);

  // Read by the poll so it always sees the latest records without the effect
  // re-subscribing every time a status message changes.
  const pendingDomainsRef = React.useRef<DomainRecord[]>([]);

  React.useEffect(() => {
    pendingDomainsRef.current = domainConfig.filter(
      (d) => d.status !== "active",
    );
  }, [domainConfig]);

  const user = getSessionUserFromCookie();
  const hasResellerSeats = hasWhiteLabel(user?.subscriptions);

  const loadDomains = React.useCallback(async (): Promise<DomainRecord[]> => {
    try {
      const res = await CustomDomainService.getUserDomains();
      if (res.success && Array.isArray(res.data)) {
        const workspaceDomains = res.data.filter(
          (d: DomainRecord) =>
            String(d.workspace_id) === id || d.workspace_id === Number(id),
        );
        setDomainConfig(workspaceDomains);
        return workspaceDomains;
      }
    } catch (err) {
      console.error("Failed to load workspace domain config", err);
    }

    return [];
  }, [id]);

  /** Opens the DNS instructions for a domain id, once it is in the list. */
  const openDnsForId = React.useCallback(
    (domainId: number | string, source: DomainRecord[]) => {
      const match = source.find((d) => String(d.id) === String(domainId));
      if (!match) return;

      setDnsDomain(match);
      setIsDnsModalOpen(true);
    },
    [],
  );

  React.useEffect(() => {
    if (!workspace) return;

    let cancelled = false;

    loadDomains().finally(() => {
      if (!cancelled) setIsLoadingDomain(false);
    });

    return () => {
      cancelled = true;
    };
  }, [workspace, loadDomains]);

  // The param is consumed once and stripped, so a refresh doesn't reopen the
  // modal the reseller just dismissed.
  React.useEffect(() => {
    if (!pendingDnsId || isLoadingDomain) return;

    openDnsForId(pendingDnsId, domainConfig);
    setPendingDnsId(null);
    router.replace(`/workspaces/${id}`, { scroll: false });
  }, [pendingDnsId, isLoadingDomain, domainConfig, openDnsForId, router, id]);

  const handleEditConfig = (domainData: DomainRecord) => {
    if (!hasResellerSeats) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setSelectedDomain(domainData);
    setIsModalOpen(true);
  };

  const handleShowDns = (domainData: DomainRecord) => {
    setDnsDomain(domainData);
    setIsDnsModalOpen(true);
  };

  const handleAddNewDomain = () => {
    if (!hasResellerSeats) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setSelectedDomain(null);
    setIsModalOpen(true);
  };

  /**
   * Asks Vercel whether the host's ownership challenge is satisfied and folds
   * the answer into the card's live status. A domain with no `verification`
   * records left to satisfy is verified.
   *
   * Shared by the manual button and the background poll, so both report the
   * same thing; it never touches `verifyingId` — that spinner belongs to the
   * explicit check.
   */
  const runVerificationCheck = React.useCallback(
    async (domainData: DomainRecord) => {
      try {
        // Vercel answers two separate questions: does the TXT record prove
        // ownership, and does the routing record actually point here. A domain
        // is only live when both agree, so both are asked before writing back.
        const [ownershipRes, configRes] = await Promise.all([
          fetch(`/api/custom-domains/${domainData.domain}`),
          fetch(`/api/custom-domains/${domainData.domain}/config`),
        ]);

        const ownership = await ownershipRes.json();

        if (!ownershipRes.ok || !ownership.success) {
          setLiveStatus((prev) => ({
            ...prev,
            [domainData.id]: {
              verified: false,
              message:
                ownership?.error || "Could not reach the domain provider.",
            },
          }));
          return;
        }

        const config = await configRes.json();

        const verified = Boolean(ownership.vercel?.verified);
        const pendingRecords = ownership.vercel?.verification?.length ?? 0;
        const configured =
          config?.ok && config.vercel
            ? !config.vercel.misconfigured
            : Boolean(domainData.configured);

        const isLive = verified && configured;

        setLiveStatus((prev) => ({
          ...prev,
          [domainData.id]: {
            verified: isLive,
            message: isLive
              ? "Domain is live — ownership verified and traffic is routing here."
              : verified
                ? "Ownership verified. Routing is still propagating — this is nearly done, give it a few more minutes."
                : pendingRecords > 0
                  ? "Waiting on the TXT record — open DNS Records to copy it. DNS changes take 30 minutes to 1 hour to propagate."
                  : "Not verified yet. DNS changes take 30 minutes to 1 hour to propagate — check again after that window.",
          },
        }));

        // The backend record is what the card renders, so only write when this
        // check actually disagrees with it — otherwise the poll would PATCH
        // every five seconds forever.
        const alreadyMatches =
          Boolean(domainData.verified) === verified &&
          Boolean(domainData.configured) === configured;

        if (alreadyMatches) return;

        const updated = await CustomDomainService.updateVerification(
          domainData.id,
          isLive
            ? {
                verified: true,
                configured: true,
                status: "active",
                ssl_status: "active",
                error: null,
              }
            : {
                verified,
                configured,
                status: "pending",
                ssl_status: "pending",
                error: "DNS record has not propagated yet.",
              },
        ).catch(() => null);

        // Take the record straight from the response: `status` is the backend's
        // own confirmation and the only thing the card should trust.
        if (updated?.data) {
          setDomainConfig((prev) =>
            prev.map((d) =>
              d.id === domainData.id ? { ...d, ...updated.data } : d,
            ),
          );
        }
      } catch {
        setLiveStatus((prev) => ({
          ...prev,
          [domainData.id]: {
            verified: false,
            message: "Network error — please try again.",
          },
        }));
      }
    },
    [],
  );

  const handleCheckVerification = async (domainData: DomainRecord) => {
    setVerifyingId(domainData.id);
    try {
      await runVerificationCheck(domainData);
    } finally {
      setVerifyingId(null);
    }
  };

  // Domains still waiting on DNS are re-checked in the background, so a
  // reseller who is sitting on this page watching for propagation sees the
  // badge flip on its own. Verified domains drop out, and the interval stops
  // entirely once none are left.
  const pendingDomainKey = domainConfig
    .filter((d) => d.status !== "active")
    .map((d) => d.id)
    .join(",");

  React.useEffect(() => {
    if (!pendingDomainKey) return;

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      // Skip if the previous round is still running: a slow provider must not
      // stack up requests every 5s.
      if (inFlight) return;
      inFlight = true;

      try {
        const pending = pendingDomainsRef.current;
        for (const domain of pending) {
          if (cancelled) return;
          await runVerificationCheck(domain);
        }
      } finally {
        inFlight = false;
      }
    };

    const interval = setInterval(tick, VERIFICATION_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pendingDomainKey, runVerificationCheck]);

  /**
   * Detach from Vercel first, then delete the record. Doing it in this order
   * means a failure at either step leaves the domain still listed and
   * retryable, instead of orphaning a host on the project.
   */
  const handleDeleteDomain = async () => {
    if (!domainToDelete) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/custom-domains/${domainToDelete.domain}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Could not remove the domain from Vercel.");
        return;
      }

      await CustomDomainService.deleteDomain(domainToDelete.id);

      setDomainConfig((prev) => prev.filter((d) => d.id !== domainToDelete.id));
      setLiveStatus((prev) => {
        const next = { ...prev };
        delete next[domainToDelete.id];
        return next;
      });

      toast.success(`${domainToDelete.domain} removed.`);
      setDomainToDelete(null);
    } catch {
      toast.error("Failed to remove the domain. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * After a save, land the reseller straight on the DNS instructions for the
   * domain they just configured — the records are the only thing left to do,
   * and a freshly added domain is useless until they are in place.
   */
  const handleWhiteLabelSubmit = async (values: WhiteLabelFormValues) => {
    const domains = await loadDomains();
    if (values.id) openDnsForId(values.id, domains);
  };

  if (!workspace) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        Workspace not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense fallback={null}>
        <DnsParamReader onChange={setPendingDnsId} />
      </Suspense>

      <WhiteLabelUpgradeModal
        open={isUpgradeModalOpen}
        onOpenChange={setIsUpgradeModalOpen}
      />
      <DnsDomainRecordModal
        open={isDnsModalOpen}
        domainData={dnsDomain}
        onOpenChange={setIsDnsModalOpen}
      />
      <ConfirmDeleteDomainModal
        open={Boolean(domainToDelete)}
        domain={domainToDelete?.domain ?? null}
        isSubmitting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDomainToDelete(null);
        }}
        onConfirm={handleDeleteDomain}
      />
      <ConfigureWhiteLabelModal
        open={isModalOpen}
        workspace={workspace}
        initialValues={
          selectedDomain
            ? {
                id: selectedDomain.id || null,
                customDomain: selectedDomain.domain || "",
                brandName: selectedDomain.config?.brand_name || workspace.name,
                primaryColor:
                  selectedDomain.config?.primary_color ||
                  DEFAULT_BRAND_COLORS.primary_color,
                secondaryColor:
                  selectedDomain.config?.secondary_color ||
                  DEFAULT_BRAND_COLORS.secondary_color,
                backgroundColor:
                  selectedDomain.config?.background_color ||
                  DEFAULT_BRAND_COLORS.background_color,
                textColor:
                  selectedDomain.config?.text_color ||
                  DEFAULT_BRAND_COLORS.text_color,
                buttonColor:
                  selectedDomain.config?.button_color ||
                  DEFAULT_BRAND_COLORS.button_color,
                buttonTextColor:
                  selectedDomain.config?.button_text_color ||
                  DEFAULT_BRAND_COLORS.button_text_color,
                supportEmail: selectedDomain.config?.support_email || "",
                replyToEmail: selectedDomain.config?.reply_to_email || "",
                logoUrl: selectedDomain.config?.logo_url || "",
                logoIconUrl: selectedDomain.config?.logo_icon_url || "",
                faviconUrl: selectedDomain.config?.favicon_url || "",
                loginCarousel:
                  normalizeCarousel(selectedDomain.config?.login_carousel) ??
                  DEFAULT_LOGIN_CAROUSEL,
                defaultTheme: selectedDomain.config?.default_theme || "user",
              }
            : null
        }
        onOpenChange={setIsModalOpen}
        onSubmit={handleWhiteLabelSubmit}
      />

      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/settings?tab=workspaces"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {workspace.name}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Workspace Details & White Label Configuration
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  White Label Branding
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Domains serving this workspace under your own brand.
                </p>
              </div>
              <Button size="sm" variant="brand" onClick={handleAddNewDomain}>
                <Plus className="h-3.5 w-3.5" />
                Add New Domain
              </Button>
            </div>

            {isLoadingDomain ? (
              <div className="text-sm text-[var(--text-muted)]">
                Loading domains...
              </div>
            ) : domainConfig.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
                <Globe className="mb-3 h-8 w-8 text-[var(--text-muted)] opacity-50" />
                <h3 className="mb-1 font-semibold text-[var(--text-primary)]">
                  No custom domains
                </h3>
                <p className="mb-4 text-sm text-[var(--text-muted)]">
                  Add a custom domain to fully white label your workspace.
                </p>
                <Button variant="brand" onClick={handleAddNewDomain}>
                  <Plus className="h-4 w-4" />
                  Add Custom Domain
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {domainConfig.map((domain) => {
                  const status = liveStatus[domain.id];
                  const isVerifying = verifyingId === domain.id;
                  // The record's own `status` is the backend's confirmation
                  // that ownership AND routing are settled. Vercel's `verified`
                  // covers ownership only, so a domain can read verified there
                  // while ours is still pending — the card follows ours.
                  const isLive = domain.status === "active";
                  const awaitingSync = Boolean(domain.verified) && !isLive;

                  return (
                    <div
                      key={domain.id}
                      className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                    >
                      {/* Identity */}
                      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
                        {/* Once a domain is verified it actually resolves, so
                            the name becomes the way in. Unverified hosts stay
                            plain text — linking to a domain that 404s reads as
                            a broken feature. */}
                        {isLive ? (
                          <a
                            href={`https://${domain.domain}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={`Open ${domain.domain}`}
                            className="group flex min-w-0 items-center gap-3"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] transition-colors group-hover:bg-[var(--brand-muted)]">
                              <Globe className="h-4 w-4 text-[var(--text-muted)] transition-colors group-hover:text-[var(--brand)]" />
                            </span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate font-semibold text-[var(--text-primary)] underline decoration-[var(--brand-border)] decoration-2 underline-offset-4 transition-colors group-hover:text-[var(--brand)] group-hover:decoration-[var(--brand)]">
                                {domain.domain}
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                SSL {domain.ssl_status || "pending"}
                              </p>
                            </div>
                          </a>
                        ) : (
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)]">
                              <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[var(--text-primary)]">
                                {domain.domain}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                SSL {domain.ssl_status || "pending"}
                              </p>
                            </div>
                          </div>
                        )}

                        {isLive ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        ) : awaitingSync ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-500">
                            <Clock className="h-3.5 w-3.5" />
                            Pending Sync
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-500">
                            <Clock className="h-3.5 w-3.5" />
                            Pending
                          </span>
                        )}
                      </div>

                      {/* Live verification result */}
                      {status ? (
                        <div className="px-5 pb-4">
                          <div
                            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                              status.verified
                                ? "border-green-500/30 bg-green-500/10 text-green-500"
                                : "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                            }`}
                          >
                            {status.verified ? (
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>{status.message}</span>
                          </div>
                        </div>
                      ) : null}

                      {/* Palette */}
                      <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--border)] px-5 py-4">
                        {SWATCHES.map(({ key, label, fallback }) => {
                          const raw = domain.config?.[key];
                          const value =
                            typeof raw === "string" && raw ? raw : fallback;
                          return (
                            <div key={key} className="min-w-[92px]">
                              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                {label}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                                <span
                                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--border-strong)]"
                                  style={{ backgroundColor: value }}
                                />
                                <span className="uppercase">{value}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-raised)] px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckVerification(domain)}
                            disabled={isVerifying}
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${isVerifying ? "animate-spin" : ""}`}
                            />
                            {isVerifying ? "Checking…" : "Check Verification"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowDns(domain)}
                          >
                            <ListTree className="h-3.5 w-3.5" />
                            DNS Records
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditConfig(domain)}
                            aria-label={`Edit ${domain.domain}`}
                            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDomainToDelete(domain)}
                            aria-label={`Remove ${domain.domain}`}
                            className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-[var(--text-primary)]">
              Workspace Info
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Workspace ID
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                  {workspace.id}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Status
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                  {workspace.active ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Members
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                  {workspace.members} Total
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Custom Domains
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                  {domainConfig.length}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
```

<sub>773 lines</sub>

#### `components/modals/DnsDomainRecordModal.tsx`

```tsx
"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Loader2, Copy, Check, RefreshCw, Clock } from "lucide-react";
import CustomDomainService from "@/services/CustomDomain";
import { toast } from "@/lib/toast";

/** The subset of the backend's domain record this modal needs. */
type DnsDomainRecord = {
  id: number | string;
  domain: string;
};

/** A pending ownership challenge, as Vercel returns it. */
type VercelVerification = {
  type: string;
  domain: string;
  value: string;
};

/** Vercel's recommended routing targets; IPv4 entries carry a list of values. */
type RecommendedRecord<T> = { rank: number; value: T };

type DnsDomainRecordModalProps = {
  open: boolean;
  domainData: DnsDomainRecord | null;
  onOpenChange: (open: boolean) => void;
};

/** One row of the Cloudflare-shaped table. */
type DnsRecordRow = {
  type: string;
  name: string;
  content: string;
};

/**
 * DNS propagation is the slow part of this flow and the most common support
 * question — resellers add the records, check immediately, see "Pending" and
 * assume something is broken. The copy says so in both blocks.
 */
const PROPAGATION_NOTICE =
  "DNS changes usually take 30 minutes to 1 hour to propagate. Add the record, then come back and check the status after that window.";

export function DnsDomainRecordModal({
  open,
  domainData,
  onOpenChange,
}: DnsDomainRecordModalProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [verificationRecords, setVerificationRecords] = React.useState<
    VercelVerification[]
  >([]);
  const [configRecords, setConfigRecords] = React.useState<{
    misconfigured: boolean;
    cnames: string[];
    aValues: string[];
  } | null>(null);
  const [verificationStatus, setVerificationStatus] = React.useState<
    "idle" | "unverified" | "verified"
  >("idle");
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const fetchRecords = React.useCallback(async () => {
    if (!domainData?.domain) return;
    setIsLoading(true);

    try {
      // 1. Fetch TXT Verification
      const resTxt = await fetch(`/api/custom-domains/${domainData.domain}`);
      const txtData = await resTxt.json();

      let isVerified = false;
      if (txtData.success && txtData.vercel) {
        if (!txtData.vercel.verified) {
          setVerificationRecords(txtData.vercel.verification || []);
          setVerificationStatus("unverified");
        } else {
          isVerified = true;
          setVerificationStatus("verified");
          setVerificationRecords([]);
        }
      }

      // 2. Fetch Config (CNAME/A)
      let isConfigured = false;
      const resConfig = await fetch(
        `/api/custom-domains/${domainData.domain}/config`,
      );
      const configData = await resConfig.json();

      if (configData.ok && configData.vercel) {
        setConfigRecords({
          misconfigured: configData.vercel.misconfigured,
          cnames:
            configData.vercel.recommendedCNAME?.map(
              (record: RecommendedRecord<string>) => record.value,
            ) || [],
          aValues:
            configData.vercel.recommendedIPv4
              ?.map((record: RecommendedRecord<string[]>) => record.value)
              .flat() || [],
        });
        isConfigured = !configData.vercel.misconfigured;
      }

      // 3. Patch backend state
      if (isVerified && isConfigured) {
        await CustomDomainService.updateVerification(domainData.id, {
          verified: true,
          configured: true,
          status: "active",
          ssl_status: "active",
          error: null,
        });
      } else {
        await CustomDomainService.updateVerification(domainData.id, {
          verified: isVerified,
          configured: isConfigured,
          status: "pending",
          ssl_status: "pending",
          error: "DNS record has not propagated yet.",
        });
      }
    } catch (err) {
      console.error("Failed to fetch DNS records", err);
      toast.error("Failed to fetch DNS records");
    } finally {
      setIsLoading(false);
    }
  }, [domainData]);

  React.useEffect(() => {
    if (open && domainData) {
      setVerificationRecords([]);
      setConfigRecords(null);
      setVerificationStatus("idle");
      fetchRecords();
    }
  }, [open, domainData, fetchRecords]);

  /** A copyable cell. Long values scroll rather than wrapping the row. */
  const renderValueCell = (value: string) => (
    <div className="flex items-center justify-between gap-2 overflow-hidden rounded bg-[var(--surface-hover)] px-2 py-1">
      <span className="truncate font-mono text-[11px]">{value}</span>
      <button
        onClick={() => copyToClipboard(value)}
        aria-label={`Copy ${value}`}
        className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        {copiedText === value ? (
          <Check size={13} className="text-green-500" />
        ) : (
          <Copy size={13} />
        )}
      </button>
    </div>
  );

  /**
   * The record laid out the way Cloudflare's own DNS table is, so a reseller can
   * read straight across from this modal into the form they're filling in.
   */
  const renderRecordTable = (rows: DnsRecordRow[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            <th className="pb-2 pr-3 font-semibold">Type</th>
            <th className="pb-2 pr-3 font-semibold">Name</th>
            <th className="pb-2 pr-3 font-semibold">Content</th>
            <th className="pb-2 pr-3 font-semibold">Proxy status</th>
            <th className="pb-2 font-semibold">TTL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.type}-${row.name}-${row.content}`}
              className="align-middle"
            >
              <td className="py-1.5 pr-3">{renderValueCell(row.type)}</td>
              <td className="py-1.5 pr-3">{renderValueCell(row.name)}</td>
              <td className="max-w-[220px] py-1.5 pr-3">
                {renderValueCell(row.content)}
              </td>
              <td className="py-1.5 pr-3">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-1 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                  DNS only
                </span>
              </td>
              <td className="whitespace-nowrap py-1.5 text-[var(--text-muted)]">
                Auto
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderNotice = (tone: "amber" | "blue") => (
    <div
      className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
        tone === "amber"
          ? "border-amber-500/25 bg-amber-500/5 text-amber-200/90"
          : "border-blue-500/25 bg-blue-500/5 text-blue-200/90"
      }`}
    >
      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{PROPAGATION_NOTICE}</span>
    </div>
  );

  const routingRows: DnsRecordRow[] = React.useMemo(() => {
    if (!configRecords) return [];

    if (configRecords.cnames.length > 0) {
      return [
        {
          type: "CNAME",
          name: domainData?.domain ?? "",
          content: configRecords.cnames[0],
        },
      ];
    }

    if (configRecords.aValues.length > 0) {
      return [
        {
          type: "A",
          name: domainData?.domain ?? "",
          content: configRecords.aValues[0],
        },
      ];
    }

    return [];
  }, [configRecords, domainData?.domain]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="DNS Records"
      subtitle={`Configure DNS settings for ${domainData?.domain || "your domain"}`}
      size="xxl"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            Add these records to your DNS provider (e.g. Cloudflare) to verify
            ownership and route traffic. Both records must be{" "}
            <strong className="text-[var(--text-secondary)]">DNS only</strong> —
            proxying them breaks verification.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecords}
            disabled={isLoading}
            className="shrink-0 gap-2"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        {isLoading && verificationStatus === "idle" ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* TXT Verification Required */}
            {verificationStatus === "unverified" &&
            verificationRecords.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-amber-500/20 bg-[var(--surface-raised)]">
                <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <h3 className="text-sm font-semibold text-amber-500">
                    1. Verify Domain Ownership
                  </h3>
                  <p className="mt-1 text-xs text-amber-500/80">
                    Add this TXT record to prove you own the domain.
                  </p>
                </div>
                <div className="p-4">
                  {renderNotice("amber")}
                  <div className="mt-4">
                    {renderRecordTable(
                      verificationRecords.map((record) => ({
                        type: record.type,
                        name: record.domain,
                        content: record.value,
                      })),
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* CNAME/A Records Configuration */}
            {configRecords && configRecords.misconfigured ? (
              <div className="overflow-hidden rounded-xl border border-blue-500/20 bg-[var(--surface-raised)]">
                <div className="border-b border-blue-500/20 bg-blue-500/10 px-4 py-3">
                  <h3 className="text-sm font-semibold text-blue-500">
                    {verificationStatus === "verified"
                      ? "2. Configure Routing"
                      : "Configure Routing (Required)"}
                  </h3>
                  <p className="mt-1 text-xs text-blue-500/80">
                    Add the following record to point your domain to our
                    servers.
                  </p>
                </div>
                <div className="p-4">
                  {routingRows.length > 0 ? (
                    <>
                      {renderRecordTable(routingRows)}
                      {renderNotice("blue")}
                    </>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">
                      No routing records available.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {verificationStatus === "verified" &&
            configRecords &&
            !configRecords.misconfigured ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 p-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold text-green-500">
                  Domain is fully configured!
                </h3>
                <p className="mt-1 text-sm text-green-500/80">
                  Your DNS records are correct and traffic is routing properly.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}
```

<sub>365 lines</sub>

#### `components/modals/ConfirmDeleteDomainModal.tsx`

```tsx
"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type ConfirmDeleteDomainModalProps = {
  open: boolean;
  domain: string | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDeleteDomainModal({
  open,
  domain,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: ConfirmDeleteDomainModalProps) {
  if (!domain) {
    return null;
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Remove custom domain"
      subtitle="This detaches the domain and deletes its branding."
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Removing…" : "Remove domain"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <p className="text-sm text-[var(--text-muted)]">
            Are you sure you want to remove
            <span className="font-semibold text-[var(--text-primary)]">
              {" "}
              {domain}
            </span>
            ?
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-200/80">
            The domain stops serving your white-label workspace immediately and
            its saved branding is deleted. You can add it again later, but it
            will need to be verified from scratch.
          </p>
        </div>
      </div>
    </Modal>
  );
}
```

<sub>76 lines</sub>


### Next API routes (server, talk to Vercel)
#### `app/api/custom-domains/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
// const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export async function POST(request: NextRequest) {
  try {
    // Make sure environment variables exist
    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      console.error("Missing Vercel environment variables");

      return NextResponse.json(
        {
          error: "Vercel configuration is missing",
        },
        { status: 500 },
      );
    }

    // Get request body
    const body = await request.json();

    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        {
          error: "Domain is required",
        },
        { status: 400 },
      );
    }

    // Clean domain
    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    if (!cleanDomain) {
      return NextResponse.json(
        {
          error: "Invalid domain",
        },
        { status: 400 },
      );
    }

    // Build Vercel API URL
    const url = new URL(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
    );

    // if (VERCEL_TEAM_ID) {
    //   url.searchParams.set("teamId", VERCEL_TEAM_ID);
    // }

    // Add domain to Vercel
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: cleanDomain,
      }),
      cache: "no-store",
    });

    const data = await response.json();

    // Vercel returned an error
    if (!response.ok) {
      console.error("Vercel API error:", data);

      return NextResponse.json(
        {
          error: data?.error?.message || "Could not add domain to Vercel",

          details: data,
        },
        {
          status: response.status,
        },
      );
    }

    // Success
    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      vercel: data,
    });
  } catch (error) {
    console.error("Custom domain error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}
```

<sub>109 lines</sub>

#### `app/api/custom-domains/[domain]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
// const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return NextResponse.json(
        {
          error: "Vercel configuration is missing",
        },
        { status: 500 },
      );
    }

    const { domain } = await params;

    const cleanDomain = decodeURIComponent(domain).trim().toLowerCase();

    const url = new URL(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(cleanDomain)}`,
    );

    // if (VERCEL_TEAM_ID) {
    //   url.searchParams.set("teamId", VERCEL_TEAM_ID);
    // }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error?.message || "Could not retrieve domain status",

          details: data,
        },
        {
          status: response.status,
        },
      );
    }

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      vercel: data,
    });
  } catch (error) {
    console.error("Domain status error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 },
    );
  }
}

/**
 * Detaches the domain from the Vercel project. Runs before the backend record
 * is deleted so we never orphan a host on the project — a host still attached
 * here would keep serving (and holding) the domain after the user removed it.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return NextResponse.json(
        {
          error: "Vercel configuration is missing",
        },
        { status: 500 },
      );
    }

    const { domain } = await params;

    const cleanDomain = decodeURIComponent(domain).trim().toLowerCase();

    const url = new URL(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(cleanDomain)}`,
    );

    // if (VERCEL_TEAM_ID) {
    //   url.searchParams.set("teamId", VERCEL_TEAM_ID);
    // }

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
      cache: "no-store",
    });

    // A 404 means the domain is already off the project — treat that as done
    // so a half-finished delete can always be retried to completion.
    if (!response.ok && response.status !== 404) {
      const data = await response.json().catch(() => null);

      return NextResponse.json(
        {
          error: data?.error?.message || "Could not remove domain from Vercel",

          details: data,
        },
        {
          status: response.status,
        },
      );
    }

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
    });
  } catch (error) {
    console.error("Domain delete error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
```

<sub>143 lines</sub>

#### `app/api/custom-domains/[domain]/config/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
// const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return NextResponse.json(
        { error: "Vercel configuration is missing" },
        { status: 500 },
      );
    }

    const { domain } = await params;

    const cleanDomain = decodeURIComponent(domain).trim().toLowerCase();

    const url = new URL(
      `https://api.vercel.com/v6/domains/${encodeURIComponent(
        cleanDomain,
      )}/config`,
    );

    // if (VERCEL_TEAM_ID) {
    //   url.searchParams.set("teamId", VERCEL_TEAM_ID);
    // }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(
      {
        status: response.status,
        ok: response.ok,
        vercel: data,
      },
      {
        status: response.status,
      },
    );
  } catch (error) {
    console.error("Vercel config error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
```

<sub>63 lines</sub>


### Runtime branding providers
#### `components/providers/BrandProvider.tsx`

```tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  BRAND_CONFIG_STORAGE_PREFIX,
  DEFAULT_BRAND_CONFIG,
  deriveBrandTokens,
  isDefaultAppHost,
  isVendorBranding,
  mergeBrandConfig,
  normalizeHost,
  type BrandConfig,
} from "@/config/brand";
import CustomDomainService from "@/services/CustomDomain";

type BrandContextValue = {
  brandConfig: BrandConfig;
  currentHost: string;
  /** The request host is not the Flowcasta app host — i.e. a reseller domain. */
  isCustomDomain: boolean;
  /** Brand resolution has settled. Always true immediately on the app host. */
  isBrandReady: boolean;
};

const BrandContext = React.createContext<BrandContextValue | undefined>(
  undefined,
);

const storageKey = (host: string) =>
  `${BRAND_CONFIG_STORAGE_PREFIX}:${host}`;

/** Last known brand for this exact host. Corrupt or absent entries degrade to
 * the Flowcasta defaults rather than throwing during bootstrap. */
function readStoredBrandConfig(host: string): BrandConfig {
  if (typeof window === "undefined") return DEFAULT_BRAND_CONFIG;

  try {
    const raw = window.localStorage.getItem(storageKey(host));
    if (!raw) return DEFAULT_BRAND_CONFIG;
    return { ...DEFAULT_BRAND_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BRAND_CONFIG;
  }
}

function writeStoredBrandConfig(host: string, config: BrandConfig) {
  try {
    window.localStorage.setItem(storageKey(host), JSON.stringify(config));
  } catch {
    // Private mode / quota — the brand still applies for this page view.
  }
}

/**
 * Paints the tenant palette onto `:root`. The app's whole design system reads
 * `var(--brand*)`, so overriding those inline restyles every button, ring,
 * badge and glow at once; removing them restores the stylesheet defaults.
 */
function applyBrandColors(config: BrandConfig) {
  const root = document.documentElement;
  const tokens = deriveBrandTokens(config.primary_color);

  if (tokens) {
    for (const [token, value] of Object.entries(tokens)) {
      root.style.setProperty(token, value);
    }
  }

  // Secondary and the surface/button overrides stay on their own namespace:
  // they are opt-in for components that want them, and must never silently
  // repaint the dark theme's surfaces.
  const optional: Array<[string, string | null]> = [
    ["--brand-secondary", config.secondary_color],
    ["--brand-background", config.background_color],
    ["--brand-text", config.text_color],
    ["--brand-button", config.button_color || config.primary_color],
    ["--brand-button-text", config.button_text_color],
  ];

  for (const [token, value] of optional) {
    if (value) root.style.setProperty(token, value);
  }
}

/** Clears every inline override so the stylesheet's Flowcasta palette wins. */
function clearBrandColors() {
  const root = document.documentElement;
  const tokens = [
    ...Object.keys(deriveBrandTokens(DEFAULT_BRAND_CONFIG.primary_color) ?? {}),
    "--brand-secondary",
    "--brand-background",
    "--brand-text",
    "--brand-button",
    "--brand-button-text",
  ];

  for (const token of tokens) {
    root.style.removeProperty(token);
  }
}

/** next-themes' own storage key. Its presence means the viewer has picked an
 * appearance themselves, which a tenant default must never override. */
const THEME_STORAGE_KEY = "theme";

/**
 * Applies the reseller's preferred appearance, but only for a viewer who has
 * not chosen one — "default" means the starting point, not a lock.
 */
function applyDefaultTheme(
  preference: BrandConfig["default_theme"],
  setTheme: (theme: string) => void,
) {
  if (preference !== "dark" && preference !== "light") return;

  try {
    if (window.localStorage.getItem(THEME_STORAGE_KEY)) return;
  } catch {
    // Storage blocked — treat it as no stored choice and apply the default.
  }

  setTheme(preference);
}

/** Browsers cache favicons hard, so a tenant switching logos needs the
 * cache-buster to actually see the new icon. */
function applyFavicon(faviconUrl: string | null) {
  const rawIconUrl = (faviconUrl || "/favicon.ico").trim();
  const iconUrl = `${rawIconUrl}${rawIconUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;

  const existing = Array.from(
    document.querySelectorAll('link[rel*="icon"]'),
  ) as HTMLLinkElement[];

  if (existing.length > 0) {
    existing.forEach((link) => {
      link.href = iconUrl;
    });
    return;
  }

  const link = document.createElement("link");
  link.rel = "icon";
  link.href = iconUrl;
  document.head.appendChild(link);
}

export function BrandProvider({
  children,
  initialConfig,
}: {
  children: React.ReactNode;
  initialConfig?: BrandConfig | null;
}) {
  const [brandConfig, setBrandConfig] = React.useState<BrandConfig>(
    initialConfig ?? DEFAULT_BRAND_CONFIG,
  );
  const [currentHost, setCurrentHost] = React.useState("");
  const [isBrandReady, setIsBrandReady] = React.useState(false);

  // Held in a ref so applying the tenant's default appearance doesn't make the
  // bootstrap effect depend on next-themes' identity and re-run.
  const { setTheme } = useTheme();
  const setThemeRef = React.useRef(setTheme);

  React.useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  React.useEffect(() => {
    let cancelled = false;

    const host = normalizeHost(window.location.host);
    const onDefaultHost = isDefaultAppHost(host);
    setCurrentHost(host);

    // The Flowcasta host never inherits a cached tenant brand. Tenant hosts
    // paint their last known brand straight away, so a reseller's customers
    // don't see a flash of Flowcasta identity while /resolve is in flight.
    const stored = onDefaultHost ? DEFAULT_BRAND_CONFIG : readStoredBrandConfig(host);
    if (!onDefaultHost && !isVendorBranding(stored)) {
      setBrandConfig(stored);
      applyBrandColors(stored);
      applyFavicon(stored.favicon_url);
    }

    /** Drops every override so the stylesheet's Flowcasta palette wins. */
    function applyDefaultBrand() {
      clearBrandColors();
      setBrandConfig(DEFAULT_BRAND_CONFIG);
      applyFavicon(null);
      if (!onDefaultHost) {
        try {
          window.localStorage.removeItem(storageKey(host));
        } catch {
          // Nothing cached to clear.
        }
      }
    }

    async function resolveBrand() {
      try {
        // Runs on every host: the backend answers "not found" for the Flowcasta
        // host, which is exactly the signal to keep the stock palette.
        const resolved = await CustomDomainService.resolveDomain(host);
        if (cancelled) return;

        if (!resolved) {
          applyDefaultBrand();
          return;
        }

        const merged = mergeBrandConfig(
          stored,
          resolved.config,
          resolved.config?.brand_name ?? resolved.workspace?.name ?? null,
        );

        setBrandConfig(merged);
        applyBrandColors(merged);
        applyFavicon(merged.favicon_url);
        applyDefaultTheme(merged.default_theme, setThemeRef.current);
        writeStoredBrandConfig(host, merged);
      } catch {
        // A 404 (no tenant for this host) and a genuine outage look the same
        // here. On the Flowcasta host, fall back to stock branding; on a tenant
        // host keep whatever is already painted rather than flashing to vendor
        // colors because one request failed.
        if (!cancelled && onDefaultHost) applyDefaultBrand();
      } finally {
        if (!cancelled) setIsBrandReady(true);
      }
    }

    // The Flowcasta host is never blocked on the lookup — it already looks right.
    if (onDefaultHost) setIsBrandReady(true);

    resolveBrand();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo<BrandContextValue>(
    () => ({
      brandConfig,
      currentHost,
      isCustomDomain: Boolean(currentHost) && !isDefaultAppHost(currentHost),
      isBrandReady,
    }),
    [brandConfig, currentHost, isBrandReady],
  );

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
}

export function useBrandConfig(): BrandContextValue {
  const context = React.useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrandConfig must be used within a BrandProvider");
  }
  return context;
}
```

<sub>267 lines</sub>

#### `components/providers/BrandGate.tsx`

```tsx
"use client";

import * as React from "react";
import { useBrandConfig } from "@/components/providers/BrandProvider";

/** Matches the panel transition below; the curtain unmounts just after it. */
const CURTAIN_MS = 420;

/**
 * Covers the app until the host's brand has resolved, then opens like a pair of
 * curtains.
 *
 * On a reseller domain the palette, logo and favicon only land once
 * `/custom-domains/resolve` answers, so without this the first paint is
 * Flowcasta's identity and the tenant's brand snaps in a moment later. The
 * children render underneath the whole time — the curtain hides the swap, it
 * doesn't delay the work.
 *
 * On the Flowcasta host `isBrandReady` is true synchronously, so the curtain
 * opens on the first frame and is never really seen.
 */
export function BrandGate({ children }: { children: React.ReactNode }) {
  const { isBrandReady } = useBrandConfig();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPresent, setIsPresent] = React.useState(true);

  React.useEffect(() => {
    if (!isBrandReady) return;

    // A frame of "closed" before flipping, so the browser has something to
    // transition from rather than painting the open state directly.
    const frame = requestAnimationFrame(() => setIsOpen(true));
    const timer = window.setTimeout(() => setIsPresent(false), CURTAIN_MS + 80);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [isBrandReady]);

  return (
    <>
      {children}

      {isPresent ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
        >
          <div
            className={`absolute inset-y-0 left-0 w-1/2 bg-[var(--bg)] transition-transform duration-[420ms] ease-[var(--ease-smooth)] motion-reduce:transition-none ${
              isOpen ? "-translate-x-full" : "translate-x-0"
            }`}
          />
          <div
            className={`absolute inset-y-0 right-0 w-1/2 bg-[var(--bg)] transition-transform duration-[420ms] ease-[var(--ease-smooth)] motion-reduce:transition-none ${
              isOpen ? "translate-x-full" : "translate-x-0"
            }`}
          />
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
              isOpen ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand)]" />
          </div>
        </div>
      ) : null}
    </>
  );
}
```

<sub>71 lines</sub>


---

## 12. Reseller console

**Flow:** gated to admins or the Enterprise (`reseller`) plan. Shows a locked state otherwise. `GET /reseller` returns `users` + `sumOfUsers`, `sumOfUsersToday`, `sumOfUsersThisWeek` (three stat cards). `AddResellerModal` handles add and edit (first/last/email/active toggle, password required on add, optional on edit through `/reseller/update/password`). Delete uses a confirm modal → `DELETE /reseller/delete` with a body.

#### `app/(dashboard)/resellers/layout.tsx`

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resellers",
  description: "Manage your reseller accounts and monitor growth",
  robots: { index: false, follow: false },
};

export default function ResellersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

<sub>15 lines</sub>

#### `app/(dashboard)/resellers/page.tsx`

```tsx
"use client";

import {
  AlertTriangle,
  Edit,
  Plus,
  Trash2,
  Users,
  UserPlus,
  TrendingUp,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  AddResellerModal,
  type ResellerFormValues,
} from "@/components/modals/AddResellerModal";
import resellerService from "@/services/Reseller";
import { getSessionUserFromCookie } from "@/lib/auth-session";
import type { User } from "@/types/types";

export default function ResellersPageContent() {
  const router = useRouter();
  const [sessionUser] = useState(() => getSessionUserFromCookie());
  const role = sessionUser?.role?.toLowerCase() || "";
  const isAdminRole = role === "admin" || role === "super_admin";
  const subscriptions = sessionUser?.subscriptions;
  // Enterprise (internal key `reseller`) only. The White Label add-on
  // (`reseller_seats`) buys custom domains and branding, not the reseller
  // console, so it deliberately does not open this page.
  const hasActiveResellerSubscription =
    subscriptions?.subscription?.name === "reseller";
  const canViewResellersPage = isAdminRole || hasActiveResellerSubscription;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [resellers, setResellers] = useState<User[]>([]);
  const [resellerToEdit, setResellerToEdit] = useState<User | null>(null);
  const [resellerToDelete, setResellerToDelete] = useState<User | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
  });

  useEffect(() => {
    if (!canViewResellersPage) {
      return;
    }

    void fetchResellers();
  }, [canViewResellersPage]);

  async function fetchResellers() {
    setIsLoading(true);

    try {
      const response = await resellerService.getAllResellers();
      setResellers(response.users ?? []);
      setStats({
        total: Number(response.sumOfUsers) || 0,
        today: Number(response.sumOfUsersToday) || 0,
        thisWeek: Number(response.sumOfUsersThisWeek) || 0,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load resellers right now.";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  function openAddResellerModal() {
    setResellerToEdit(null);
    setIsModalOpen(true);
  }

  function openEditResellerModal(reseller: User) {
    setResellerToEdit(reseller);
    setIsModalOpen(true);
  }

  async function handleResellerSubmit(values: ResellerFormValues) {
    setIsMutating(true);

    try {
      if (resellerToEdit) {
        await resellerService.updateReseller({
          id: resellerToEdit.id,
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          is_active: values.is_active,
        });

        if (values.password) {
          await resellerService.updateResellerPassword({
            id: resellerToEdit.id,
            password: values.password,
            password_confirmation: values.password_confirmation,
          });
        }

        toast.success("Reseller updated");
      } else {
        await resellerService.addReseller({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          password: values.password,
          is_active: values.is_active,
        });
        toast.success("Reseller added");
      }

      setIsModalOpen(false);
      setResellerToEdit(null);
      await fetchResellers();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save reseller right now.";

      toast.error(message);
    } finally {
      setIsMutating(false);
    }
  }

  function openDeleteResellerModal(reseller: User) {
    setResellerToDelete(reseller);
  }

  function closeDeleteResellerModal() {
    if (isMutating) {
      return;
    }

    setResellerToDelete(null);
  }

  async function confirmDeleteReseller() {
    if (!resellerToDelete) {
      return;
    }

    setIsMutating(true);

    try {
      await resellerService.deleteReseller({ id: resellerToDelete.id });
      toast.success("Reseller deleted");
      setResellerToDelete(null);
      await fetchResellers();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete reseller right now.";

      toast.error(message);
    } finally {
      setIsMutating(false);
    }
  }

  if (!canViewResellersPage) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-rose-500" />

            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>

              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">
                Reseller Access Required
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-muted)]">
                Reseller management is available to users with an active
                reseller subscription.
              </p>

              <div className="mt-6 flex flex-col gap-2 @2xl/app:flex-row @2xl/app:justify-center @2xl/app:gap-3">
                <button
                  onClick={() => {
                    router.push("/subscriptions");
                  }}
                  className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Upgrade Plan
                </button>
                <button
                  onClick={() => {
                    router.push("/home");
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="space-y-6 px-6 py-7">
        {/* Stats Section */}
        <div className="grid grid-cols-1 gap-4 @3xl/app:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 transition-all hover:border-[var(--border-hover)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Total Users
                </p>
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {stats.total}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Across all resellers
                </p>
              </div>
              <Users className="h-5 w-5 text-[var(--brand)]" />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 transition-all hover:border-[var(--border-hover)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  New Users Today
                </p>
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  +{stats.today}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Today&apos;s new users
                </p>
              </div>
              <UserPlus className="h-5 w-5 text-[var(--brand)]" />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 transition-all hover:border-[var(--border-hover)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  New Users This Week
                </p>
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  +{stats.thisWeek}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Includes today
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-[var(--brand)]" />
            </div>
          </div>
        </div>

        {/* Header with Action Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-md font-semibold text-[var(--text-primary)]">
              Resellers
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Manage your reseller accounts and monitor growth.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddResellerModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Reseller
          </button>
        </div>

        {/* Reseller Table */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--text-primary)]">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td
                      className="px-5 py-6 text-center text-[var(--text-muted)]"
                      colSpan={4}
                    >
                      Loading resellers...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && resellers.length === 0 ? (
                  <tr>
                    <td
                      className="px-5 py-6 text-center text-[var(--text-muted)]"
                      colSpan={4}
                    >
                      No resellers found.
                    </td>
                  </tr>
                ) : null}

                {!isLoading
                  ? resellers.map((reseller) => {
                      const resellerName =
                        reseller.name ||
                        `${reseller.first_name || ""} ${reseller.last_name || ""}`.trim() ||
                        "Reseller";
                      const isActive = Number(reseller.is_active) === 1;

                      return (
                        <tr
                          key={reseller.id}
                          className="transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          <td className="whitespace-nowrap px-5 py-4 font-medium">
                            {resellerName}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-[var(--text-muted)]">
                            {reseller.email}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isActive
                                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : "border border-red-500/30 bg-red-500/10 text-red-400"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() => openEditResellerModal(reseller)}
                                className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  openDeleteResellerModal(reseller)
                                }
                                className="text-red-400 transition-colors hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddResellerModal
        isOpen={isModalOpen}
        isSubmitting={isMutating}
        resellerToEdit={resellerToEdit}
        onClose={() => {
          if (isMutating) {
            return;
          }

          setResellerToEdit(null);
          setIsModalOpen(false);
        }}
        onSubmit={handleResellerSubmit}
      />

      {resellerToDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={closeDeleteResellerModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-reseller-title"
            className="relative w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeDeleteResellerModal}
              disabled={isMutating}
              className="absolute right-3 top-3 rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close delete confirmation"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>

            <h3
              id="delete-reseller-title"
              className="font-display text-lg font-semibold text-[var(--text-primary)]"
            >
              Delete reseller?
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              This action cannot be undone. Are you sure you want to delete this
              reseller?
            </p>
            <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)]">
              {resellerToDelete.name || resellerToDelete.email}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteResellerModal}
                disabled={isMutating}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteReseller()}
                disabled={isMutating}
                className="rounded-lg bg-red-500/90 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMutating ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
```

<sub>473 lines</sub>

#### `components/modals/AddResellerModal.tsx`

```tsx
"use client";

import * as Select from "@radix-ui/react-select";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Eye, EyeOff, X } from "lucide-react";
import { useState, useMemo } from "react";
import type { User } from "@/types/types";

type AddResellerModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  resellerToEdit: User | null;
  onClose: () => void;
  onSubmit: (values: ResellerFormValues) => Promise<void>;
};

export type ResellerFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  is_active: boolean;
};

function getStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  return checks.filter(Boolean).length;
}

function strengthColor(strength: number, index: number) {
  if (index >= strength) {
    return "bg-[var(--border)]";
  }
  if (strength <= 1) {
    return "bg-red-500";
  }
  if (strength === 2) {
    return "bg-orange-400";
  }
  if (strength === 3) {
    return "bg-yellow-400";
  }
  return "bg-[var(--brand)]";
}

export function AddResellerModal({
  isOpen,
  isSubmitting,
  resellerToEdit,
  onClose,
  onSubmit,
}: AddResellerModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const passwordMismatch =
    confirmPassword.length > 0 && confirmPassword !== password;

  const handleSubmit = async () => {
    const firstNameTrimmed = firstName.trim();
    const lastNameTrimmed = lastName.trim();
    const emailTrimmed = email.trim();

    if (!firstNameTrimmed || !lastNameTrimmed || !emailTrimmed) {
      return;
    }

    if (!resellerToEdit && (!password || !confirmPassword)) {
      return;
    }

    await onSubmit({
      first_name: firstNameTrimmed,
      last_name: lastNameTrimmed,
      email: emailTrimmed,
      password,
      password_confirmation: confirmPassword,
      is_active: isActive,
    });

    // Reset form
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setIsActive(true);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      if (resellerToEdit) {
        setFirstName(resellerToEdit.first_name);
        setLastName(resellerToEdit.last_name);
        setEmail(resellerToEdit.email);
        setIsActive(resellerToEdit.is_active === 1);
      } else {
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setIsActive(true);
      }
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={() => handleOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  {resellerToEdit ? "Edit Reseller" : "Add Reseller"}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {resellerToEdit
                    ? "Update reseller details and status."
                    : "Add a new reseller to your account."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                aria-label="Close reseller modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  First Name
                </label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  Last Name
                </label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              {!resellerToEdit ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type={showPassword ? "text" : "password"}
                        placeholder="Required"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {[0, 1, 2, 3].map((index) => (
                        <span
                          key={index}
                          className={`h-1 rounded-full ${strengthColor(strength, index)}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Required"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {passwordMismatch ? (
                      <p className="mt-1 text-xs text-red-400">
                        Passwords do not match.
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Password (Optional)
                  </label>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Leave blank to keep current password"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] bg-[var(--surface)]"
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Active Status
                </span>
              </label>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {isActive
                  ? "This reseller account is active."
                  : "This reseller account is inactive."}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : resellerToEdit
                    ? "Save Changes"
                    : "Add Reseller"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

<sub>348 lines</sub>

#### `services/Reseller.ts`

```ts
import api from "./api/api";
import {
  GetAllResellersResponse,
  AddResellerPayload,
  AddResellerResponse,
  UpdateResellerPayload,
  UpdateResellerResponse,
  UpdateResellerPasswordPayload,
  UpdateResellerPasswordResponse,
  DeleteResellerPayload,
  DeleteResellerResponse,
} from "@/types/types";

const resellerService = {
  getAllResellers: async (): Promise<GetAllResellersResponse> => {
    try {
      const response = await api.get<GetAllResellersResponse>("/reseller");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addReseller: async (
    payload: AddResellerPayload,
  ): Promise<AddResellerResponse> => {
    try {
      const response = await api.post<AddResellerResponse>(
        "/reseller/add",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateReseller: async (
    payload: UpdateResellerPayload,
  ): Promise<UpdateResellerResponse> => {
    try {
      const response = await api.post<UpdateResellerResponse>(
        "/reseller/update/details",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateResellerPassword: async (
    payload: UpdateResellerPasswordPayload,
  ): Promise<UpdateResellerPasswordResponse> => {
    try {
      const response = await api.post<UpdateResellerPasswordResponse>(
        "/reseller/update/password",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteReseller: async (
    payload: DeleteResellerPayload,
  ): Promise<DeleteResellerResponse> => {
    try {
      const response = await api.delete<DeleteResellerResponse>(
        "/reseller/delete",
        {
          data: payload,
        },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default resellerService;
```

<sub>83 lines</sub>


---

## 13. Agency resources

**Flow:** gated to admins or an active `agency`/`reseller` plan. It's a static resource catalogue (`agencyResources`: website template zip, business card, brochure, contract, proposal, invoice, Facebook ads, telemarketing script…) with a summary header (total resources, new items, category counts), banner cards with category/version badges, and Download / Preview actions. **Replace the URLs and assets with the new product's kit.** *(See quirk 2.)*

#### `app/(dashboard)/agency/page.tsx`

```tsx
"use client";

import {
  BookCheck,
  BookCopy,
  BookOpen,
  BriefcaseBusiness,
  ContactRound,
  Download,
  Globe,
  LayoutTemplate,
  Megaphone,
  Phone,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StaggerList } from "@/components/motion/StaggerList";
import { fadeInUp } from "@/lib/animations";
import { getSessionUserFromCookie } from "@/lib/auth-session";

type AgencyResource = {
  id: string;
  title: string;
  description: string;
  category: string;
  version: string;
  downloadUrl: string;
  previewUrl?: string;
  bannerImageUrl: string;
  isNew?: boolean;
  Icon: LucideIcon;
};

const agencyResources: AgencyResource[] = [
  {
    id: "agency-template",
    title: "Agency Website Template",
    description:
      "A conversion-first website starter with service blocks, case studies, and lead capture sections.",
    category: "Website Template",
    version: "v1.0.0",
    downloadUrl: "/agency/flowcasta_agency_template.zip",
    previewUrl: "https://flowcasta-agency-template.vercel.app/",
    bannerImageUrl: "/agency/flowcasta_agency_preview.png",
    isNew: true,
    Icon: LayoutTemplate,
  },
  {
    id: "business-card",
    title: "Business Card Kit",
    description:
      "Professional business card assets that are easy to brand and ready for print or digital use.",
    category: "Design",
    version: "v1.0.0",
    downloadUrl:
      "https://drive.google.com/file/d/1R0N3sukz1otekyQc5SJ84PrhLCvnugRR/view?usp=sharing",
    bannerImageUrl: "/agency/business_card_image.jpg",
    Icon: BriefcaseBusiness,
  },
  {
    id: "brochure-template",
    title: "Brochure Layout",
    description:
      "Clean brochure layouts for presenting service tiers, outcomes, and agency positioning.",
    category: "Design",
    version: "v1.0.0",
    downloadUrl:
      "https://drive.google.com/file/d/1I48PYqOBbGfCrMl7Jijohfapo6ugJvXs/view?usp=sharing",
    bannerImageUrl: "/agency/brochure_card_image.jpg",
    Icon: BookOpen,
  },
  {
    id: "invoice-template",
    title: "Invoice Template",
    description:
      "Structured invoice templates to help bill clearly, reduce delays, and keep records consistent.",
    category: "Business",
    version: "v1.0.0",
    downloadUrl:
      "https://drive.google.com/file/d/1-FG_zFdrqKVX0EnSkt7fPU2MuxQH20k_/view",
    bannerImageUrl: "/agency/invoice_card_image.jpg",
    Icon: BookCheck,
  },
  {
    id: "proposal-template",
    title: "Proposal Template",
    description:
      "Winning proposal structure with scope, timelines, deliverables, and value-first narrative.",
    category: "Business",
    version: "v1.0.0",
    downloadUrl:
      "https://docs.google.com/document/d/1m3f38zeR8X4wQ92-DCQlAip-FAiMsIB8RXiLy4SwBQo/edit?usp=sharing",
    bannerImageUrl: "/agency/proposal_card_image.jpg",
    Icon: BookCopy,
  },
  {
    id: "facebook-ads-template",
    title: "Facebook Ads Playbook",
    description:
      "Performance ad frameworks designed for faster launch cycles and more consistent outputs.",
    category: "Marketing",
    version: "v1.0.0",
    downloadUrl:
      "https://docs.google.com/document/d/1bKjPfI0iSNV1JO9B2Rrp2itEbp16H5bUdfdPRLkcZjo/edit?usp=sharing",
    bannerImageUrl: "/agency/facebook_ads_card_image.jpg",
    Icon: Megaphone,
  },
  {
    id: "contract-template",
    title: "Contract Boilerplate",
    description:
      "Agency contract language to define responsibilities, payment terms, and boundaries.",
    category: "Legal",
    version: "v1.0.0",
    downloadUrl:
      "https://docs.google.com/document/d/1mO0mp7EbL6-Mn4MKBp2JiBtdG-chOD4hrl86ULyvuhY/edit?usp=sharing",
    bannerImageUrl: "/agency/contract_card_image.jpg",
    Icon: ContactRound,
  },
  {
    id: "telemarketing-template",
    title: "Telemarketing Script",
    description:
      "Structured call script to qualify prospects, handle objections, and guide bookings.",
    category: "Sales",
    version: "v1.0.0",
    downloadUrl:
      "https://docs.google.com/document/d/1bVDvyLeu5aRzkBsGKKPk1ejZAzgquNCQvi1simfotjs/edit?usp=sharing",
    bannerImageUrl: "/agency/telemarketing_card_image.jpg",
    Icon: Phone,
  },
];

export default function AgencyPage() {
  const router = useRouter();
  const [sessionUser] = useState(() => getSessionUserFromCookie());
  const role = sessionUser?.role?.toLowerCase() || "";
  const isAdminRole = role === "admin" || role === "super_admin";
  const hasActiveAgencySubscription = Boolean(
    (sessionUser?.subscriptions?.subscription?.name === "agency" ||
      sessionUser?.subscriptions?.subscription?.name === "reseller") &&
    sessionUser?.subscriptions?.subscription?.status,
  );
  const canViewAgencyPage = isAdminRole || hasActiveAgencySubscription;

  const totalResources = useMemo(() => agencyResources.length, []);
  const newResources = useMemo(
    () => agencyResources.filter((resource) => resource.isNew).length,
    [],
  );
  const categoryCount = useMemo(
    () => new Set(agencyResources.map((resource) => resource.category)).size,
    [],
  );
  const categorySummary = useMemo(() => {
    const categories = Array.from(
      new Set(agencyResources.map((resource) => resource.category)),
    );
    return categories.slice(0, 3).join(" / ");
  }, []);

  if (!canViewAgencyPage) {
    return (
      <section className="px-6 pt-8 pb-10">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-xl overflow-hidden border-[var(--border)] bg-[var(--surface-raised)]">
            <div className="h-1 w-full bg-[var(--gradient-brand)]" />
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--brand-border)] bg-[var(--brand-muted)]">
                <ShieldAlert className="h-5 w-5 text-[var(--brand)]" />
              </div>
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">
                Agency Access Required
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
                Agency resources are available to users on an active agency
                subscription.
              </p>
              <div className="mt-6 flex flex-col gap-2 @2xl/app:flex-row @2xl/app:justify-center @2xl/app:gap-3">
                <Button
                  onClick={() => {
                    router.push("/subscriptions");
                  }}
                >
                  Upgrade Plan
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    router.push("/home");
                  }}
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 pt-8 pb-10">
      <div
        className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)]
       bg-[var(--gradient-hero)] p-6 @3xl/app:p-8"
      >
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--brand-glow)] blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-[rgba(59,130,246,0.18)] blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 @3xl/app:flex-row @3xl/app:items-end @3xl/app:justify-between">
          <div className="max-w-2xl">
            <span className="overline text-[var(--brand)]">Agency</span>
            <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text-primary)] @3xl/app:text-4xl">
              Agency Resources Vault
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Premium templates, playbooks, and client-ready assets to keep your
              agency moving fast.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" className="px-3 py-1 text-xs">
              {totalResources} resources
            </Badge>
            <Badge variant="pro" className="px-3 py-1 text-xs">
              Agency
            </Badge>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid gap-3 @3xl/app:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Categories
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {categoryCount}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {categorySummary} and more
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              New Drops
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {newResources}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Fresh assets added this month
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Ready to ship
            </p>
            <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-white">
              <Sparkles className="h-5 w-5 text-[var(--brand)]" />
              Client-ready
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Designed for fast handoff and edits
            </p>
          </div>
        </div>
      </div>

      <StaggerList className="mt-8 grid gap-5 @2xl/app:grid-cols-2 @7xl/app:grid-cols-3">
        {agencyResources.map((resource) => {
          const hasPreview = Boolean(resource.previewUrl);
          const localDownload = resource.downloadUrl.startsWith("/");

          return (
            <motion.div key={resource.id} variants={fadeInUp}>
              <Card
                hoverable
                className="group flex h-full flex-col overflow-hidden border-[var(--border)]"
              >
                <div className="relative aspect-video overflow-hidden border-b border-[var(--border)] bg-[var(--surface-raised)]">
                  <Image
                    src={resource.bannerImageUrl}
                    alt={resource.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,9,0.0)_0%,rgba(10,10,9,0.8)_100%)]" />

                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <Badge variant="brand" className="text-[10px]">
                      {resource.category}
                    </Badge>
                    {resource.isNew ? (
                      <Badge variant="success" className="text-[10px]">
                        New
                      </Badge>
                    ) : null}
                  </div>

                  <div className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-white/20 bg-black/30 backdrop-blur">
                    <resource.Icon className="h-4 w-4 text-white" />
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold leading-tight text-[var(--text-primary)]">
                      {resource.title}
                    </h3>
                    <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                      {resource.version}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-3 text-sm text-[var(--text-secondary)]">
                    {resource.description}
                  </p>

                  <div className="mt-5 flex gap-2">
                    {hasPreview ? (
                      <a
                        href={resource.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-overlay)]"
                      >
                        <Globe className="h-4 w-4" />
                        Preview
                      </a>
                    ) : null}
                    <a
                      href={resource.downloadUrl}
                      {...(localDownload
                        ? { download: true }
                        : { target: "_blank", rel: "noopener noreferrer" })}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--gradient-brand)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <Download className="h-4 w-4" />
                      {localDownload ? "Download" : "Open"}
                    </a>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </StaggerList>

      <div className="mt-10 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 @3xl/app:flex-row @3xl/app:items-center @3xl/app:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Need a custom asset pack?
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Reply to the agency onboarding email and our team will help you
            tailor resources to your niche.
          </p>
        </div>
        <div className="flex flex-col gap-2 @2xl/app:flex-row">
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-overlay)]"
          >
            Manage plan
          </Link>
          <a
            href="mailto:agency@flowcasta.com"
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Contact agency support
          </a>
        </div>
      </div>
    </section>
  );
}
```

<sub>388 lines</sub>


---

## 14. Admin console

**Flow**
- `/admin` → redirects to `/admin/user-management`. `(dashboard)/layout.tsx` wraps everything in `AdminDashboardShell` (sidebar: User Management, Statistics, Marketing + header).
- **User management:** paged `GET /admin?page=&search=` (debounced search), `UserStats` header, `UsersTable` with row actions: edit details, plan and add-ons (`EditUserModal` → `updateNewUserFromAdmin`, `updateAddons`, `updateUserPassword`), activate/deactivate, delete, add/update credits (`creditService.addCreditsForUsers` / `updateCreditForUsers`), and licence details. `AddUserModal` → `addNewUserFromAdmin` with plan and add-on selection.
- **Statistics:** `getAdminDashboardData()` → `StatisticsCards`.
- **Marketing:** `CreateCampaignForm` (recipient selection through `getAllUsers` / `searchAllUsers`, rich-text `MarketingEditor` on Quill) → `EmailMarketingService.createEmailCampaign` → `POST /user/sendCampaign`. `MarketingCampaignTable` lists `GET /all/email/campaign`.

#### `app/admin/page.tsx`

```tsx
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/user-management");
}
```

<sub>5 lines</sub>

#### `app/admin/loading.tsx`

```tsx
import { AdminPageSkeleton } from "@/components/ui/PageSkeletons";

export default function AdminLoading() {
  return <AdminPageSkeleton />;
}
```

<sub>5 lines</sub>

#### `app/admin/(dashboard)/layout.tsx`

```tsx
import type { ReactNode } from "react";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminDashboardLayout({ children }: AdminLayoutProps) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>;
}
```

<sub>10 lines</sub>

#### `app/admin/(dashboard)/loading.tsx`

```tsx
import { AdminPageSkeleton } from "@/components/ui/PageSkeletons";

export default function Loading() {
  return <AdminPageSkeleton />;
}
```

<sub>5 lines</sub>

#### `components/admin/admin-dashboard-shell.tsx`

```tsx
"use client";

import { type ReactNode, useState } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";

type AdminDashboardShellProps = {
  children: ReactNode;
};

export function AdminDashboardShell({ children }: AdminDashboardShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)]">
      <div className="hidden border-r border-[var(--border)] bg-[var(--bg-secondary)] md:block">
        <AdminSidebar />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden",
          isMobileNavOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsMobileNavOpen(false)}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[280px] border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-transform duration-200 md:hidden",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <AdminSidebar onNavigate={() => setIsMobileNavOpen(false)} />
      </div>

      <div className="flex w-full min-w-0 flex-col">
        <AdminHeader onOpenSidebar={() => setIsMobileNavOpen(true)} />
        <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

<sub>49 lines</sub>

#### `components/admin/admin-sidebar.tsx`

```tsx
"use client";

import { BarChart3, LogOut, Mail, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const adminNavItems: AdminNavItem[] = [
  {
    label: "User Management",
    href: "/admin/user-management",
    icon: Users,
  },
  {
    label: "Statistics",
    href: "/admin/statistics",
    icon: BarChart3,
  },
  {
    label: "Email Marketing",
    href: "/admin/marketing",
    icon: Mail,
  },
];

type AdminSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function AdminSidebar({ className, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-[280px] flex-col border-[var(--border)] bg-[var(--bg-secondary)]",
        className,
      )}
    >
      <div className="border-b border-[var(--border)] px-5 py-5">
        <p className="font-display text-xl font-semibold text-[var(--text-primary)]">
          Admin
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          ViralGenius Control Panel
        </p>
      </div>

      <nav className="flex flex-col space-y-1 p-3">
        {adminNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <span
                className={cn(
                  "flex items-center gap-4.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-[linear-gradient(90deg,var(--brand-muted),var(--brand-muted))] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--border)] p-3">
        <Link href="/home" onClick={onNavigate}>
          <span className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]">
            <LogOut className="h-4 w-4" />
            Logout
          </span>
        </Link>
      </div>
    </aside>
  );
}
```

<sub>89 lines</sub>

#### `components/admin/admin-header.tsx`

```tsx
"use client";

import { Menu } from "lucide-react";

type AdminHeaderProps = {
  onOpenSidebar: () => void;
};

export function AdminHeader({ onOpenSidebar }: AdminHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:hidden"
          aria-label="Open admin navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Admin Dashboard
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-dark-bg px-3 py-2 text-xs text-text-secondary">
          <Languages className="h-3.5 w-3.5" />
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="bg-transparent text-xs text-text-primary outline-none"
            aria-label="Select language"
          >
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </label> */}

        {/* <Button
          variant="secondary"
          onClick={() => setIsDark((current) => !current)}
          className="px-3"
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {isDark ? "Dark" : "Light"}
        </Button> */}
      </div>
    </header>
  );
}
```

<sub>52 lines</sub>


### User management
#### `app/admin/(dashboard)/user-management/page.tsx`

```tsx
"use client";

import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { AddUserModal } from "@/components/admin/user-management/add-user-modal";
import { UserStats } from "@/components/admin/user-management/user-stats";
import { UsersTable } from "@/components/admin/user-management/users-table";
import { Button } from "@/components/ui/Button";
import adminService from "@/services/Admin";
import type { User } from "@/types/types";

export default function AdminUserManagementPage() {
  const requestIdRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total_users: 0,
    users_today: 0,
    users_this_week: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const isSearching = useMemo(
    () => debouncedSearchQuery.trim().length > 0,
    [debouncedSearchQuery],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    async function loadData() {
      setIsLoading(true);
      try {
        if (debouncedSearchQuery.trim()) {
          const matchedUsers = await adminService.searchAllUsers(
            debouncedSearchQuery.trim(),
          );

          if (requestId !== requestIdRef.current) {
            return;
          }

          setUsers(matchedUsers);
          setLastPage(1);
          setTotalUsers(matchedUsers.length);
          return;
        }

        const [dashboardData, usersPageData] = await Promise.all([
          adminService.getAdminDashboardData(),
          adminService.getAllUsers(currentPage),
        ]);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setStats(dashboardData.stats);

        if (Array.isArray(usersPageData)) {
          setUsers(usersPageData);
          setTotalUsers(usersPageData.length);
          setLastPage(1);
          return;
        }

        setUsers(usersPageData.data ?? []);
        setTotalUsers(usersPageData.total ?? 0);
        setLastPage(usersPageData.last_page ?? 1);
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load user management data.";
        toast.error(message);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
  }, [currentPage, debouncedSearchQuery, refreshNonce]);

  async function refreshUsers() {
    setRefreshNonce((prev) => prev + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          User Management
        </h1>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      <UserStats stats={stats} />

      <div className="relative flex-1 md:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search users by name, email, or role..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] py-2.5 pl-8 pr-3 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
        />
      </div>

      <UsersTable
        users={users}
        isLoading={isLoading}
        searchQuery={debouncedSearchQuery}
        currentPage={currentPage}
        lastPage={lastPage}
        total={totalUsers}
        onPageChange={setCurrentPage}
        onUsersChanged={refreshUsers}
      />

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={refreshUsers}
      />

      {isSearching ? (
        <p className="text-xs text-[var(--text-muted)]">
          Showing matching users. Pagination is disabled while search is active.
        </p>
      ) : null}
    </div>
  );
}
```

<sub>164 lines</sub>

#### `components/admin/user-management/user-stats.tsx`

```tsx
import { TrendingUp, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";

type UserStatsProps = {
  stats: {
    total_users: number;
    users_this_week: number;
    users_today: number;
  };
};

export function UserStats({ stats }: UserStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">Total Users</p>
          <Users className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
          {stats.total_users.toLocaleString()}
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            Users This Week
          </p>
          <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
          {stats.users_this_week.toLocaleString()}
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">Users Today</p>
          <UserPlus className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
          {stats.users_today.toLocaleString()}
        </p>
      </Card>
    </div>
  );
}
```

<sub>48 lines</sub>

#### `components/admin/user-management/users-table.tsx`

```tsx
"use client";

import { Eye, MoreHorizontal, Pencil, Trash2, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { AddCreditsModal } from "@/components/admin/user-management/add-credits-modal";
import { EditUserModal } from "@/components/admin/user-management/edit-user-modal";
import { LicenseDetailsModal } from "@/components/admin/user-management/license-details-modal";
import { UpdateCreditsModal } from "@/components/admin/user-management/update-credits-modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import adminService from "@/services/Admin";
import creditService from "@/services/Credits";
import { isValidAddon } from "@/lib/subscription";
import type { User } from "@/types/types";

type UsersTableProps = {
  users: User[];
  isLoading: boolean;
  searchQuery: string;
  currentPage: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onUsersChanged: () => Promise<void>;
};

type SubscriptionDisplay = {
  key: string;
  label: string;
  // Secondary line: billing type for the plan / remove-branding, seat count for
  // reseller seats.
  detail: string | null;
  status: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toReadableLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getUserDisplayName(user: User): string {
  const fallback = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return user.name || fallback || user.email;
}

function getUserCreditBalance(user: User): number {
  return Number(user.token_balance ?? user.credit_balance ?? user.tokens ?? 0);
}

// Reads the current AllUserSubscriptionsNew shape: a `subscription`
// (SubscriptionDataNew) object on paid accounts (or a `plan` string on free
// accounts), plus an `addons` (AddOns) map.
function getSubscriptions(user: User): SubscriptionDisplay[] {
  if (!isRecord(user.subscriptions)) {
    return [];
  }

  const record = user.subscriptions as Record<string, unknown>;
  const values: SubscriptionDisplay[] = [];

  // Base plan — a SubscriptionDataNew object on paid accounts, else the "free"
  // plan string. The plan's billing type (monthly/yearly/lifetime) is the
  // secondary detail.
  const subscription = isRecord(record.subscription)
    ? record.subscription
    : null;
  const planName =
    subscription && typeof subscription.name === "string" && subscription.name
      ? subscription.name
      : typeof record.plan === "string" && record.plan
        ? record.plan
        : "free";
  const billingType =
    subscription && typeof subscription.type === "string"
      ? subscription.type
      : null;

  values.push({
    key: "plan",
    label: `${toReadableLabel(planName)} Plan`,
    detail: billingType ? toReadableLabel(billingType) : null,
    status: subscription ? Boolean(subscription.status) : false,
  });

  // Add-ons (AddOns) — only real Flowcasta add-ons (remove_branding) are shown;
  // legacy ViralGenius package flags (viralgenius_*, reseller, reseller_seats,
  // ...) are filtered out. Free accounts send an empty array, which isRecord
  // rejects.
  const addons = record.addons;
  if (isRecord(addons)) {
    Object.entries(addons).forEach(([key, value]) => {
      if (!isValidAddon(key) || !isRecord(value)) {
        return;
      }

      const detail =
        typeof value.type === "string" && value.type
          ? toReadableLabel(value.type)
          : null;

      values.push({
        key,
        label: toReadableLabel(key),
        detail,
        status: Boolean(value.status),
      });
    });
  }

  return values;
}

export function UsersTable({
  users,
  isLoading,
  searchQuery,
  currentPage,
  lastPage,
  total,
  onPageChange,
  onUsersChanged,
}: UsersTableProps) {
  const [isMutating, setIsMutating] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [addCreditUser, setAddCreditUser] = useState<User | null>(null);
  const [updateCreditUser, setUpdateCreditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [subscriptionsUser, setSubscriptionsUser] = useState<User | null>(null);
  const [licenseUser, setLicenseUser] = useState<User | null>(null);

  const isSearching = searchQuery.trim().length > 0;

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const fullName = getUserDisplayName(user).toLowerCase();
      const email = (user.email ?? "").toLowerCase();
      const role = (user.role ?? "").toLowerCase();
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        role.includes(query)
      );
    });
  }, [searchQuery, users]);

  async function handleToggleActivation(user: User) {
    setIsMutating(true);
    try {
      if (Number(user.is_active) === 1) {
        const response = await adminService.deactivateUser(user.id);
        toast.success(response.message || "User deactivated.");
      } else {
        const response = await adminService.activateUser(user.id);
        toast.success(response.message || "User activated.");
      }
      await onUsersChanged();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update user activation state.";
      toast.error(message);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUser) {
      return;
    }

    setIsMutating(true);
    try {
      const response = await adminService.deleteUser(deleteUser.id);
      toast.success(response.message || "User deleted.");
      setDeleteUser(null);
      await onUsersChanged();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete user.";
      toast.error(message);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleAddCredits(amount: number) {
    if (!addCreditUser) {
      return;
    }

    setIsMutating(true);
    try {
      const response = await creditService.addCreditsForUsers({
        user_id: addCreditUser.id,
        amount,
      });
      toast.success(response.message || "Credits added.");
      setAddCreditUser(null);
      await onUsersChanged();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to add credits.";
      toast.error(message);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleUpdateCredits(amount: number) {
    if (!updateCreditUser) {
      return;
    }

    setIsMutating(true);
    try {
      const response = await creditService.updateCreditForUsers({
        user_id: updateCreditUser.id,
        amount,
      });
      toast.success(response.message || "Credits updated.");
      setUpdateCreditUser(null);
      await onUsersChanged();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update credits.";
      toast.error(message);
    } finally {
      setIsMutating(false);
    }
  }

  function handleAccessAsUser(user: User) {
    toast.success(`Access as ${getUserDisplayName(user)} is coming soon.`);
  }

  return (
    <>
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-primary)]">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Credit Balance</th>
                <th className="px-4 py-3 font-medium">Subscriptions</th>
                <th className="px-4 py-3 font-medium">License</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-[var(--text-secondary)]"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : null}

              {!isLoading && filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-[var(--text-secondary)]"
                  >
                    No users found.
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? filteredUsers.map((user) => {
                    const subscriptions = getSubscriptions(user);
                    const activeCount = subscriptions.filter(
                      (s) => s.status,
                    ).length;
                    const isActive = Number(user.is_active) === 1;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-[var(--surface-overlay)]"
                      >
                        <td className="px-4 py-4 flex flex-col gap-1">
                          {getUserDisplayName(user)}
                          <span className="text-[11px] text-[var(--text-muted)]">
                            Joined:{" "}
                            {new Date(user.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getUserCreditBalance(user)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--text-primary)]"
                            onClick={() => setSubscriptionsUser(user)}
                          >
                            {activeCount} active
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {user.license_key ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-[var(--text-secondary)]">
                                {user.license_key}
                              </span>
                              <button
                                type="button"
                                onClick={() => setLicenseUser(user)}
                                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--text-primary)]"
                                aria-label={`View license for ${getUserDisplayName(user)}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleAccessAsUser(user)}
                              className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              aria-label={`Access as ${getUserDisplayName(user)}`}
                            >
                              <UserCog className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditUser(user)}
                              className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              aria-label={`Edit ${getUserDisplayName(user)}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {/* Admin accounts cannot be deleted from the panel
                                to prevent removing an administrator. */}
                            {user.role !== "admin" ? (
                              <button
                                type="button"
                                onClick={() => setDeleteUser(user)}
                                className="rounded-lg border border-[var(--danger-muted)] p-2 text-[var(--danger)] hover:bg-[var(--danger-muted)]"
                                aria-label={`Delete ${getUserDisplayName(user)}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}

                            <details className="relative">
                              <summary className="list-none rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                <MoreHorizontal className="h-4 w-4" />
                              </summary>
                              <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] p-1 shadow-[var(--shadow-lg)]">
                                <button
                                  type="button"
                                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                                  onClick={() =>
                                    void handleToggleActivation(user)
                                  }
                                >
                                  {isActive ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                                  onClick={() => setAddCreditUser(user)}
                                >
                                  Add Credits
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                                  onClick={() => setUpdateCreditUser(user)}
                                >
                                  Update Credits
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                                  onClick={() => setSubscriptionsUser(user)}
                                >
                                  View Subscriptions
                                </button>
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>

        {!isSearching && lastPage > 1 ? (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
            <p className="mr-2 text-xs text-[var(--text-muted)]">
              Total: {total}
            </p>
            <Button
              variant="secondary"
              disabled={currentPage <= 1 || isMutating}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-[var(--text-secondary)]">
              Page {currentPage} of {lastPage}
            </span>
            <Button
              variant="secondary"
              disabled={currentPage >= lastPage || isMutating}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      <EditUserModal
        isOpen={Boolean(editUser)}
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={onUsersChanged}
      />

      <AddCreditsModal
        isOpen={Boolean(addCreditUser)}
        user={addCreditUser}
        isSubmitting={isMutating}
        onClose={() => setAddCreditUser(null)}
        onSubmit={handleAddCredits}
      />

      <UpdateCreditsModal
        isOpen={Boolean(updateCreditUser)}
        user={updateCreditUser}
        isSubmitting={isMutating}
        onClose={() => setUpdateCreditUser(null)}
        onSubmit={handleUpdateCredits}
      />

      <LicenseDetailsModal
        isOpen={Boolean(licenseUser)}
        user={licenseUser}
        onClose={() => setLicenseUser(null)}
      />

      {deleteUser ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-[425px] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Delete User
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete {getUserDisplayName(deleteUser)}?
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteUser(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleDeleteUser()}
                disabled={isMutating}
              >
                {isMutating ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {subscriptionsUser ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <Card className="max-h-[90vh] w-full max-w-[425px] overflow-y-auto p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Subscriptions
              </h3>
              <button
                type="button"
                onClick={() => setSubscriptionsUser(null)}
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Close subscriptions dialog"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="grid grid-cols-12 border-b border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <p className="col-span-6">Plan</p>
                <p className="col-span-3">Details</p>
                <p className="col-span-3 text-right">Status</p>
              </div>
              <div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                {getSubscriptions(subscriptionsUser).map((item) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-12 items-center px-3 py-2.5"
                  >
                    <p className="col-span-6 text-sm text-[var(--text-secondary)]">
                      {item.label}
                    </p>
                    <p className="col-span-3 text-sm text-[var(--text-primary)]">
                      {item.detail ?? "-"}
                    </p>
                    <div className="col-span-3 flex justify-end">
                      <span
                        className={
                          item.status
                            ? "rounded-full border border-[var(--success-muted)] bg-[var(--success-muted)] px-2 py-0.5 text-[11px] text-[var(--success)]"
                            : "rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
                        }
                      >
                        {item.status ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
```

<sub>572 lines</sub>

#### `components/admin/user-management/add-user-modal.tsx`

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import adminService from "@/services/Admin";
import type { AddNewUserFromAdminPayload, AddOns } from "@/types/types";

type AddUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

type Plan = AddNewUserFromAdminPayload["plan"];
type BillingType = AddNewUserFromAdminPayload["billing_type"];

const planOptions: Array<{ value: Plan; label: string }> = [
  { value: "free", label: "Free" },
  { value: "professional", label: "Professional" },
  { value: "agency", label: "Agency" },
  { value: "reseller", label: "Reseller" },
];

const billingOptions: Array<{ value: BillingType; label: string }> = [
  { value: "lifetime", label: "Lifetime" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

type AddonsState = {
  remove_branding: { enabled: boolean; type: BillingType };
  reseller_seats: { enabled: boolean; limit: number };
};

function createDefaultAddons(): AddonsState {
  return {
    remove_branding: { enabled: false, type: "lifetime" },
    reseller_seats: { enabled: false, limit: 1 },
  };
}

function buildAddonsPayload(state: AddonsState): AddOns | null {
  const addons: Record<string, unknown> = {};

  if (state.remove_branding.enabled) {
    addons.remove_branding = {
      status: true,
      type: state.remove_branding.type,
    };
  }

  if (state.reseller_seats.enabled) {
    addons.reseller_seats = {
      status: true,
      limit: state.reseller_seats.limit,
    };
  }

  return Object.keys(addons).length > 0 ? (addons as AddOns) : null;
}

export function AddUserModal({
  isOpen,
  onClose,
  onCreated,
}: AddUserModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "subscriptions">(
    "details",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [isActive, setIsActive] = useState(true);

  const [plan, setPlan] = useState<Plan>("free");
  const [billingType, setBillingType] = useState<BillingType>("lifetime");
  const [addons, setAddons] = useState<AddonsState>(createDefaultAddons());

  if (!isOpen) {
    return null;
  }

  function resetForm() {
    setActiveTab("details");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setRole("member");
    setIsActive(true);
    setPlan("free");
    setBillingType("lifetime");
    setAddons(createDefaultAddons());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast.error("Please complete all required details.");
      return;
    }

    const payload: AddNewUserFromAdminPayload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      password,
      role,
      is_active: isActive,
      plan,
      billing_type: billingType,
      addons: buildAddonsPayload(addons),
    };

    setIsSubmitting(true);
    try {
      const response = await adminService.addNewUserFromAdmin(payload);
      toast.success(response.message || "User created.");
      await onCreated();
      resetForm();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create user.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
      <Card className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
              Add User Account
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Create a new user account
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isSubmitting) {
                return;
              }
              resetForm();
              onClose();
            }}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close add account modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`rounded-lg px-3 py-2.5 text-base font-medium ${
              activeTab === "details"
                ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("subscriptions")}
            className={`rounded-lg px-3 py-2.5 text-base font-medium ${
              activeTab === "subscriptions"
                ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Subscription
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {activeTab === "details" ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    First Name
                  </label>
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Last Name
                  </label>
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="support">Support</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Status
                  </label>
                  <select
                    value={isActive ? "active" : "inactive"}
                    onChange={(event) =>
                      setIsActive(event.target.value === "active")
                    }
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "subscriptions" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Plan
                  </label>
                  <select
                    value={plan}
                    onChange={(event) => setPlan(event.target.value as Plan)}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                  >
                    {planOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Billing Type
                  </label>
                  <select
                    value={billingType}
                    onChange={(event) =>
                      setBillingType(event.target.value as BillingType)
                    }
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                  >
                    {billingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Add-ons
                </p>
                <AddonsEditor value={addons} onChange={setAddons} />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function AddonsEditor({
  value,
  onChange,
}: {
  value: AddonsState;
  onChange: (next: AddonsState) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Remove Branding */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-medium text-[var(--text-primary)]">
              Remove Branding
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Hide platform branding for this account
            </p>
          </div>
          <Toggle
            checked={value.remove_branding.enabled}
            onChange={(enabled) =>
              onChange({
                ...value,
                remove_branding: { ...value.remove_branding, enabled },
              })
            }
            label="Toggle remove branding"
          />
        </div>

        {value.remove_branding.enabled ? (
          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Type
            </label>
            <select
              value={value.remove_branding.type}
              onChange={(event) =>
                onChange({
                  ...value,
                  remove_branding: {
                    ...value.remove_branding,
                    type: event.target.value as BillingType,
                  },
                })
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
            >
              {billingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Reseller Seats */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-medium text-[var(--text-primary)]">
              Reseller Seats
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Allow this account to create sub-accounts
            </p>
          </div>
          <Toggle
            checked={value.reseller_seats.enabled}
            onChange={(enabled) =>
              onChange({
                ...value,
                reseller_seats: { ...value.reseller_seats, enabled },
              })
            }
            label="Toggle reseller seats"
          />
        </div>

        {value.reseller_seats.enabled ? (
          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Seat Limit
            </label>
            <input
              type="number"
              min={1}
              value={value.reseller_seats.limit}
              onChange={(event) =>
                onChange({
                  ...value,
                  reseller_seats: {
                    ...value.reseller_seats,
                    limit: Math.max(Number(event.target.value) || 0, 0),
                  },
                })
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[var(--brand)]" : "bg-[var(--border)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export type { AddonsState };
export { createDefaultAddons, buildAddonsPayload };
```

<sub>490 lines</sub>

#### `components/admin/user-management/edit-user-modal.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import adminService from "@/services/Admin";
import {
  AddonsEditor,
  createDefaultAddons,
  type AddonsState,
} from "@/components/admin/user-management/add-user-modal";
import type {
  UpdateNewUserFromAdminPayload,
  UpdateAddonsPayload,
  User,
} from "@/types/types";

type EditUserModalProps = {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
};

type Plan = UpdateNewUserFromAdminPayload["plan"];
type BillingType = UpdateNewUserFromAdminPayload["billing_type"];

type EditTab = "details" | "subscriptions" | "addons" | "password";

const planOptions: Array<{ value: Plan; label: string }> = [
  { value: "free", label: "Free" },
  { value: "professional", label: "Professional" },
  { value: "agency", label: "Agency" },
  { value: "reseller", label: "Reseller" },
];

const billingOptions: Array<{ value: BillingType; label: string }> = [
  { value: "lifetime", label: "Lifetime" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePlan(value: unknown): Plan {
  return value === "professional" || value === "agency" || value === "reseller"
    ? value
    : "free";
}

function normalizeBilling(value: unknown): BillingType {
  return value === "monthly" || value === "yearly" ? value : "lifetime";
}

function readSubscription(user: User): { plan: Plan; billingType: BillingType } {
  const subs: Record<string, unknown> = isRecord(user.subscriptions)
    ? (user.subscriptions as Record<string, unknown>)
    : {};
  const subscription = isRecord(subs.subscription) ? subs.subscription : null;

  return {
    plan: normalizePlan(subscription?.name ?? subs.plan),
    billingType: normalizeBilling(subscription?.type),
  };
}

function readAddons(user: User): AddonsState {
  const defaults = createDefaultAddons();
  const subs: Record<string, unknown> = isRecord(user.subscriptions)
    ? (user.subscriptions as Record<string, unknown>)
    : {};
  const addons = isRecord(subs.addons) ? subs.addons : {};

  const removeBranding = isRecord(addons.remove_branding)
    ? addons.remove_branding
    : null;
  const resellerSeats = isRecord(addons.reseller_seats)
    ? addons.reseller_seats
    : null;

  return {
    remove_branding: {
      enabled: Boolean(removeBranding?.status),
      type: normalizeBilling(removeBranding?.type) || defaults.remove_branding.type,
    },
    reseller_seats: {
      enabled: Boolean(resellerSeats?.status),
      limit:
        typeof resellerSeats?.limit === "number" && resellerSeats.limit > 0
          ? resellerSeats.limit
          : defaults.reseller_seats.limit,
    },
  };
}

export function EditUserModal({
  isOpen,
  user,
  onClose,
  onUpdated,
}: EditUserModalProps) {
  const [activeTab, setActiveTab] = useState<EditTab>("details");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [isActive, setIsActive] = useState(true);

  const [plan, setPlan] = useState<Plan>("free");
  const [billingType, setBillingType] = useState<BillingType>("lifetime");
  const [addons, setAddons] = useState<AddonsState>(createDefaultAddons());

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const fullName = useMemo(() => {
    if (!user) {
      return "";
    }

    const fallback = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return user.name || fallback || user.email;
  }, [user]);

  useEffect(() => {
    if (!user || !isOpen) {
      return;
    }

    setActiveTab("details");
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setEmail(user.email ?? "");
    setRole(user.role ?? "member");
    setIsActive(Number(user.is_active) === 1);
    setPassword("");
    setPasswordConfirmation("");

    const { plan: nextPlan, billingType: nextBilling } = readSubscription(user);
    setPlan(nextPlan);
    setBillingType(nextBilling);
    setAddons(readAddons(user));
  }, [isOpen, user]);

  if (!isOpen || !user) {
    return null;
  }

  async function submitUserDetails(successMessage: string) {
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateNewUserFromAdminPayload = {
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        role,
        is_active: isActive,
        plan,
        billing_type: billingType,
        // add-ons are managed in their own tab via updateAddons
        addons: null,
      };

      const response = await adminService.updateNewUserFromAdmin(payload);
      toast.success(response.message || successMessage);
      await onUpdated();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update user.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitUserDetails("User details updated.");
  }

  async function handleSubscriptionsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitUserDetails("User subscription updated.");
  }

  async function handleAddonsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateAddonsPayload = {
        user_id: user.id,
        addons: {
          remove_branding: {
            status: addons.remove_branding.enabled,
            type: addons.remove_branding.type,
          },
          reseller_seats: {
            status: addons.reseller_seats.enabled,
            limit: addons.reseller_seats.limit,
          },
        },
      };

      const response = await adminService.updateAddons(payload);
      toast.success(response.message || "Add-ons updated.");
      await onUpdated();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update add-ons.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (!password || !passwordConfirmation) {
      toast.error("Please provide password and confirmation.");
      return;
    }

    if (password !== passwordConfirmation) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminService.updateUserPassword({
        user_id: user.id,
        password,
        password_confirmation: passwordConfirmation,
      });

      toast.success(response.message || "Password updated.");
      setPassword("");
      setPasswordConfirmation("");
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update user password.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
      <Card className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
              Edit User Account
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {fullName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close edit user modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          {(
            [
              ["details", "Details"],
              ["subscriptions", "Subscription"],
              ["addons", "Add-ons"],
              ["password", "Password"],
            ] as Array<[EditTab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-2 py-2.5 text-sm font-medium ${
                activeTab === key
                  ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "details" ? (
          <form className="mt-4 space-y-4" onSubmit={handleDetailsSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  First Name
                </label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Last Name
                </label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Status
                </label>
                <select
                  value={isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setIsActive(event.target.value === "active")
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        ) : null}

        {activeTab === "subscriptions" ? (
          <form className="mt-4 space-y-4" onSubmit={handleSubscriptionsSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Plan
                </label>
                <select
                  value={plan}
                  onChange={(event) => setPlan(event.target.value as Plan)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                >
                  {planOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Billing Type
                </label>
                <select
                  value={billingType}
                  onChange={(event) =>
                    setBillingType(event.target.value as BillingType)
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                >
                  {billingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Subscription"}
              </Button>
            </div>
          </form>
        ) : null}

        {activeTab === "addons" ? (
          <form className="mt-4 space-y-4" onSubmit={handleAddonsSubmit}>
            <AddonsEditor value={addons} onChange={setAddons} />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Add-ons"}
              </Button>
            </div>
          </form>
        ) : null}

        {activeTab === "password" ? (
          <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
            />
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              placeholder="Confirm password"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Update Password"}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
```

<sub>489 lines</sub>

#### `components/admin/user-management/license-details-modal.tsx`

```tsx
"use client";

import { Ticket, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { User } from "@/types/types";

type LicenseDetailsModalProps = {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
};

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-right text-sm font-medium text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

export function LicenseDetailsModal({
  isOpen,
  user,
  onClose,
}: LicenseDetailsModalProps) {
  if (!isOpen || !user) {
    return null;
  }

  const license = user.appsumo_license ?? null;
  const isActive = license?.status?.toLowerCase() === "active";

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <Card
        className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto p-0"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Ticket header */}
        <div className="flex items-center justify-between gap-2 border-b border-dashed border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-[var(--brand-muted)] p-2 text-[var(--brand)]">
              <Ticket className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                AppSumo License
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {user.name || user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close license dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!license ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--text-secondary)]">
            No AppSumo license is attached to this user.
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  License Key
                </p>
                <p className="font-mono text-sm text-[var(--text-primary)]">
                  {license.license_key}
                </p>
              </div>
              <span
                className={
                  isActive
                    ? "rounded-full border border-[var(--success-muted)] bg-[var(--success-muted)] px-2.5 py-0.5 text-[11px] text-[var(--success)]"
                    : "rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)]"
                }
              >
                {license.status}
              </span>
            </div>

            <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <Row label="Ticket ID" value={`#${license.id}`} />
              <Row label="Tier" value={`Tier ${license.tier}`} />
              <Row label="Event" value={license.event} />
              <Row label="Last Event" value={license.last_event ?? "—"} />
              <Row
                label="Activated"
                value={license.activated ? "Yes" : "No"}
              />
              <Row
                label="Test License"
                value={license.is_test ? "Yes" : "No"}
              />
              <Row
                label="Prev Key"
                value={license.prev_license_key ?? "—"}
              />
              <Row
                label="Activated At"
                value={formatDate(license.activated_at)}
              />
              <Row
                label="Deactivated At"
                value={formatDate(license.deactivated_at)}
              />
              <Row
                label="Upgraded At"
                value={formatDate(license.upgraded_at)}
              />
              <Row
                label="Downgraded At"
                value={formatDate(license.downgraded_at)}
              />
            </div>

            <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
              Synced from AppSumo · {formatDate(license.activated_at)}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
```

<sub>158 lines</sub>

#### `components/admin/user-management/add-credits-modal.tsx`

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { User } from "@/types/types";

type AddCreditsModalProps = {
  isOpen: boolean;
  user: User | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
};

export function AddCreditsModal({
  isOpen,
  user,
  isSubmitting = false,
  onClose,
  onSubmit,
}: AddCreditsModalProps) {
  const [amount, setAmount] = useState("100");

  if (!isOpen || !user) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    await onSubmit(parsed);
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-[425px] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
              Add Credits
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close add credits modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              Credit amount
            </label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Add Credits"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
```

<sub>87 lines</sub>

#### `components/admin/user-management/update-credits-modal.tsx`

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { User } from "@/types/types";

type UpdateCreditsModalProps = {
  isOpen: boolean;
  user: User | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
};

export function UpdateCreditsModal({
  isOpen,
  user,
  isSubmitting = false,
  onClose,
  onSubmit,
}: UpdateCreditsModalProps) {
  const [amount, setAmount] = useState("0");

  if (!isOpen || !user) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }
    await onSubmit(parsed);
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-[425px] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
              Update Credits
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close update credits modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-secondary)]">
              New credit balance
            </label>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-base text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Update Credits"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
```

<sub>87 lines</sub>


### Statistics
#### `app/admin/(dashboard)/statistics/page.tsx`

```tsx
import { StatisticsCards } from "@/components/admin/statistics/statistics-cards";

export default function AdminStatisticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Statistics
        </h1>
      </div>

      <StatisticsCards />
    </div>
  );
}
```

<sub>15 lines</sub>

#### `components/admin/statistics/statistics-cards.tsx`

```tsx
import { Activity, BarChart3, CalendarDays, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";

type StatisticCard = {
  label: string;
  value: number;
  hint: string;
};

const cards: StatisticCard[] = [
  { label: "Total Users", value: 12450, hint: "All registered accounts" },
  { label: "Users This Month", value: 1210, hint: "New this month" },
  { label: "Users This Week", value: 312, hint: "New this week" },
  { label: "Users Today", value: 48, hint: "Joined in last 24h" },
  { label: "Logged in Today", value: 2270, hint: "Unique active users" },
  { label: "Logged in This Week", value: 6890, hint: "Weekly active users" },
  { label: "Logged in This Month", value: 10320, hint: "Monthly active users" },
];

function getIcon(label: string) {
  if (label.includes("Logged")) {
    return Activity;
  }
  if (label.includes("Week") || label.includes("Month")) {
    return CalendarDays;
  }
  if (label.includes("Total")) {
    return Users;
  }
  return BarChart3;
}

export function StatisticsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = getIcon(card.label);

        return (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-[var(--text-secondary)]">
                {card.label}
              </p>
              <Icon className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
              {card.value.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{card.hint}</p>
          </Card>
        );
      })}
    </div>
  );
}
```

<sub>56 lines</sub>


### Email marketing
#### `app/admin/(dashboard)/marketing/page.tsx`

```tsx
"use client";

import { useState } from "react";
import CreateCampaignForm from "@/components/admin/marketing/create-campaign-form";
import MarketingCampaignTable from "@/components/admin/marketing/marketing-campaign-table";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<
    "all-campaigns" | "create-campaign"
  >("all-campaigns");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)] md:text-2xl">
          Email Marketing
        </h1>
      </div>

      <div className="space-y-4">
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("all-campaigns")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              activeTab === "all-campaigns"
                ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            All Email Campaigns
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create-campaign")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              activeTab === "create-campaign"
                ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            Create Email Campaign
          </button>
        </div>

        {activeTab === "all-campaigns" ? (
          <Card className="p-5">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Campaign History
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                View and monitor your past email marketing campaigns.
              </p>
            </div>
            <MarketingCampaignTable />
          </Card>
        ) : null}

        {activeTab === "create-campaign" ? <CreateCampaignForm /> : null}
      </div>
    </div>
  );
}
```

<sub>68 lines</sub>

#### `components/admin/marketing/create-campaign-form.tsx`

```tsx
"use client";

import dynamic from "next/dynamic";
import {
  Eye,
  Edit3,
  FileText,
  Loader2,
  Search,
  Send,
  Upload,
  User,
  Users,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getErrorMessage } from "@/lib/utils";
import adminService from "@/services/Admin";
import EmailMarketingService from "@/services/EmailMarketing";
import type {
  createEmailCampaignPayload,
  User as UserType,
} from "@/types/types";

const MarketingEditor = dynamic(
  async () => (await import("./marketing-editor")).default,
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
    ),
  },
);

type CampaignType = "individual" | "bulk" | "bulk_import";

type FormState = {
  name: string;
  subject: string;
  type: CampaignType;
  recipient: string;
  file: File | null;
  content: string;
};

const initialFormState: FormState = {
  name: "",
  subject: "",
  type: "individual",
  recipient: "",
  file: null,
  content: "",
};

function userDisplayName(user: UserType) {
  const fallback = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return user.name || fallback || user.email;
}

export default function CreateCampaignForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [totalSubscribers, setTotalSubscribers] = useState(0);

  const [recipientCurrentPage, setRecipientCurrentPage] = useState(1);
  const [recipientTotalPages, setRecipientTotalPages] = useState(1);
  const [recipientTotalResults, setRecipientTotalResults] = useState(0);

  const inputContainerRef = useRef<HTMLDivElement>(null);
  const recipientSearchDebounceRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const recipientSearchRequestIdRef = useRef(0);

  const isRecipientSearchMode = form.recipient.trim().length > 0;

  const htmlPreview = useMemo(() => {
    if (!form.content.trim()) {
      return "";
    }

    return form.content;
  }, [form.content]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function triggerRecipientSearch(searchTerm: string, page = 1) {
    if (recipientSearchDebounceRef.current) {
      clearTimeout(recipientSearchDebounceRef.current);
    }

    recipientSearchDebounceRef.current = setTimeout(() => {
      void fetchRecipientUsers(searchTerm, page);
    }, 300);
  }

  async function fetchRecipientUsers(searchTerm = "", page = 1) {
    const requestId = ++recipientSearchRequestIdRef.current;
    setIsLoadingUsers(true);

    if (searchTerm.trim()) {
      setUsers([]);
    }

    try {
      if (searchTerm.trim()) {
        const searchedUsers = await adminService.searchAllUsers(
          searchTerm.trim(),
        );

        if (requestId !== recipientSearchRequestIdRef.current) {
          return;
        }

        const query = searchTerm.toLowerCase();
        const filteredUsers = searchedUsers.filter((user) => {
          const name = userDisplayName(user).toLowerCase();
          return (
            name.includes(query) ||
            user.email.toLowerCase().includes(query) ||
            (user.role ?? "").toLowerCase().includes(query)
          );
        });

        setUsers(filteredUsers);
        setRecipientCurrentPage(1);
        setRecipientTotalPages(1);
        setRecipientTotalResults(filteredUsers.length);
        return;
      }

      const pagedUsers = await adminService.getAllUsers(page);

      if (requestId !== recipientSearchRequestIdRef.current) {
        return;
      }

      if (Array.isArray(pagedUsers)) {
        setUsers(pagedUsers);
        setRecipientCurrentPage(1);
        setRecipientTotalPages(1);
        setRecipientTotalResults(pagedUsers.length);
        setTotalSubscribers(pagedUsers.length);
      } else {
        setUsers(pagedUsers.data ?? []);
        setRecipientCurrentPage(pagedUsers.current_page || page);
        setRecipientTotalPages(pagedUsers.last_page || 1);
        setRecipientTotalResults(pagedUsers.total || 0);
        setTotalSubscribers(pagedUsers.total || 0);
      }
    } catch (error) {
      if (requestId !== recipientSearchRequestIdRef.current) {
        return;
      }

      toast.error(getErrorMessage(error, "Could not load users list."));
    } finally {
      if (requestId === recipientSearchRequestIdRef.current) {
        setIsLoadingUsers(false);
      }
    }
  }

  async function fetchAllUsersForBulk() {
    setIsLoadingUsers(true);
    try {
      const allUsers = await adminService.getAllUsers();
      const normalized = Array.isArray(allUsers) ? allUsers : allUsers.data;
      setUsers(normalized ?? []);
      setTotalSubscribers((normalized ?? []).length);
      setRecipientTotalResults((normalized ?? []).length);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load subscribers."));
    } finally {
      setIsLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (form.type === "bulk") {
      void fetchAllUsersForBulk();
    }
  }, [form.type]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputContainerRef.current &&
        !inputContainerRef.current.contains(event.target as Node)
      ) {
        setShowRecipientDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (recipientSearchDebounceRef.current) {
        clearTimeout(recipientSearchDebounceRef.current);
      }
    };
  }, []);

  function handleRecipientPageChange(nextPage: number) {
    if (isRecipientSearchMode || isLoadingUsers) {
      return;
    }

    if (nextPage < 1 || nextPage > recipientTotalPages) {
      return;
    }

    void fetchRecipientUsers("", nextPage);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    updateForm("file", file);
  }

  function resetForm() {
    setForm(initialFormState);
    setUsers([]);
    setTotalSubscribers(0);
    setRecipientCurrentPage(1);
    setRecipientTotalPages(1);
    setRecipientTotalResults(0);
    setShowRecipientDropdown(false);
    setActiveTab("edit");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }

    if (form.subject.trim().length < 5) {
      toast.error("Subject must be at least 5 characters.");
      return;
    }

    if (form.content.trim().length < 20) {
      toast.error("Campaign content is too short.");
      return;
    }

    if (form.type === "individual" && !form.recipient.trim()) {
      toast.error("Recipient email is required for individual campaigns.");
      return;
    }

    if (form.type === "bulk_import" && !form.file) {
      toast.error("Please upload a CSV or TXT file for bulk import.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: createEmailCampaignPayload = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        type: form.type,
        content: form.content,
      };

      if (form.type === "individual") {
        payload.recipient = form.recipient.trim();
        payload.bulk_recipients = form.recipient.trim()
          ? [form.recipient.trim()]
          : [];
      } else if (form.type === "bulk") {
        let recipients = users.map((item) => item.email).filter(Boolean);

        if (recipients.length === 0) {
          const dashboardData = await adminService.getAdminDashboardData();
          recipients = (dashboardData.users?.data ?? [])
            .map((item) => item.email)
            .filter(Boolean);
        }

        payload.bulk_recipients = recipients;
      } else if (form.type === "bulk_import" && form.file) {
        payload.file = form.file;
      }

      await EmailMarketingService.createEmailCampaign(payload);
      toast.success("Campaign sent successfully.");
      resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send campaign."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Create New Campaign
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Compose and send targeted email campaigns with rich content.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-[var(--text-secondary)]">Campaign Name</span>
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="e.g. Product Launch - April"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-[var(--text-secondary)]">Email Subject</span>
            <input
              value={form.subject}
              onChange={(event) => updateForm("subject", event.target.value)}
              placeholder="e.g. New release just dropped"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
            />
          </label>
        </div>

        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => updateForm("type", "individual")}
              className={`rounded-lg px-3 py-2 text-sm ${
                form.type === "individual"
                  ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                  : "border border-[var(--border)] text-[var(--text-secondary)]"
              }`}
            >
              <User className="mr-1 inline h-4 w-4" />
              Individual
            </button>
            <button
              type="button"
              onClick={() => updateForm("type", "bulk")}
              className={`rounded-lg px-3 py-2 text-sm ${
                form.type === "bulk"
                  ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                  : "border border-[var(--border)] text-[var(--text-secondary)]"
              }`}
            >
              <Users className="mr-1 inline h-4 w-4" />
              Bulk
            </button>
            <button
              type="button"
              onClick={() => updateForm("type", "bulk_import")}
              className={`rounded-lg px-3 py-2 text-sm ${
                form.type === "bulk_import"
                  ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                  : "border border-[var(--border)] text-[var(--text-secondary)]"
              }`}
            >
              <Upload className="mr-1 inline h-4 w-4" />
              Import CSV/TXT
            </button>
          </div>

          {form.type === "individual" ? (
            <div className="space-y-1.5">
              <label className="text-sm text-[var(--text-secondary)]">
                Recipient Email
              </label>
              <div className="relative" ref={inputContainerRef}>
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  value={form.recipient}
                  onFocus={() => {
                    setShowRecipientDropdown(true);
                    triggerRecipientSearch(form.recipient || "", 1);
                  }}
                  onChange={(event) => {
                    updateForm("recipient", event.target.value);
                    setShowRecipientDropdown(true);
                    triggerRecipientSearch(event.target.value || "", 1);
                  }}
                  placeholder="Search by name or email..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
                />

                {showRecipientDropdown ? (
                  <div className="absolute z-50 mt-1 max-h-[280px] w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-muted)]">
                      {isRecipientSearchMode ? (
                        <span>
                          Search results:{" "}
                          {recipientTotalResults.toLocaleString()}
                        </span>
                      ) : (
                        <>
                          <span>
                            Page {recipientCurrentPage} / {recipientTotalPages}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              className="px-2 py-1 text-xs"
                              disabled={
                                isLoadingUsers || recipientCurrentPage <= 1
                              }
                              onClick={() =>
                                handleRecipientPageChange(
                                  recipientCurrentPage - 1,
                                )
                              }
                            >
                              Prev
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="px-2 py-1 text-xs"
                              disabled={
                                isLoadingUsers ||
                                recipientCurrentPage >= recipientTotalPages
                              }
                              onClick={() =>
                                handleRecipientPageChange(
                                  recipientCurrentPage + 1,
                                )
                              }
                            >
                              Next
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center gap-2 p-4 text-sm text-[var(--text-secondary)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching users...
                      </div>
                    ) : users.length > 0 ? (
                      <ul className="py-1">
                        {users.map((user) => (
                          <li key={user.id}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[var(--surface-overlay)]"
                              onClick={() => {
                                updateForm("recipient", user.email);
                                setShowRecipientDropdown(false);
                              }}
                            >
                              <span className="truncate pr-2 text-sm text-[var(--text-primary)]">
                                {userDisplayName(user)}
                              </span>
                              <span className="truncate text-xs text-[var(--text-muted)]">
                                {user.email}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
                        No users found.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {form.type === "bulk_import" ? (
            <div className="space-y-1.5">
              <label className="text-sm text-[var(--text-secondary)]">
                Upload Recipient List
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-muted)] file:px-3 file:py-1.5 file:text-[var(--brand)]"
              />
              <p className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <FileText className="h-3 w-3" />
                Supported: CSV or TXT with one email per line.
              </p>
            </div>
          ) : null}

          {form.type === "bulk" ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-secondary)]">
              <Users className="mr-1 inline h-4 w-4" />
              This campaign will be sent to{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {isLoadingUsers
                  ? "calculating..."
                  : `${totalSubscribers.toLocaleString()} subscribers`}
              </span>
              .
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Email Content
            </p>
            <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  activeTab === "edit"
                    ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                <Edit3 className="mr-1 inline h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  activeTab === "preview"
                    ? "bg-[var(--brand-muted)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                <Eye className="mr-1 inline h-3.5 w-3.5" />
                Preview
              </button>
            </div>
          </div>

          {activeTab === "edit" ? (
            <MarketingEditor
              value={form.content}
              onChange={(value) => updateForm("content", value)}
            />
          ) : (
            <div className="min-h-[300px] rounded-xl border border-[var(--border)] bg-white p-6 text-black">
              {htmlPreview ? (
                <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
              ) : (
                <div className="py-10 text-center text-sm text-gray-500">
                  Nothing to preview yet.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="ghost" onClick={resetForm}>
            Discard
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Campaign
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

<sub>605 lines</sub>

#### `components/admin/marketing/marketing-editor.tsx`

```tsx
"use client";

import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface MarketingEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

let formatsRegistered = false;

type AttributorCtor = new (
  attrName: string,
  keyName: string,
  options: {
    scope: number;
    whitelist?: string[];
  },
) => object;

type ParchmentLike = {
  Attributor?: {
    Attribute?: AttributorCtor;
    Style?: AttributorCtor;
  };
  Scope: {
    INLINE: number;
    BLOCK: number;
  };
};

type ImageBlotInstance = {
  domNode: HTMLElement;
  format(name: string, value: unknown): void;
};

type ImageBlotCtor = {
  new (...args: unknown[]): ImageBlotInstance;
  create(value: string): HTMLElement;
};

function registerFormats() {
  if (formatsRegistered) {
    return;
  }
  formatsRegistered = true;

  const Parchment = Quill.import("parchment") as unknown as ParchmentLike;

  const AttributeAttributor = Parchment.Attributor?.Attribute;
  const StyleAttributor = Parchment.Attributor?.Style;

  if (!AttributeAttributor || !StyleAttributor) {
    return;
  }

  const WidthAttr = new AttributeAttributor("width", "width", {
    scope: Parchment.Scope.INLINE,
  });

  const ImageBlot = Quill.import("formats/image") as unknown as ImageBlotCtor;

  class CustomImage extends ImageBlot {
    static create(value: string) {
      const node = ImageBlot.create(value) as HTMLImageElement;
      node.style.maxWidth = "100%";
      node.style.height = "auto";
      node.style.cursor = "pointer";
      if (!node.getAttribute("width")) {
        node.setAttribute("width", "300");
      }
      return node;
    }

    static formats(node: HTMLElement) {
      return {
        width: node.getAttribute("width"),
        style: node.getAttribute("style"),
      };
    }

    format(name: string, value: unknown) {
      if (name === "width") {
        if (value) {
          this.domNode.setAttribute("width", String(value));
        } else {
          this.domNode.removeAttribute("width");
        }
      } else if (name === "style") {
        if (value) {
          this.domNode.setAttribute("style", String(value));
        } else {
          this.domNode.removeAttribute("style");
        }
      } else {
        super.format(name, value);
      }
    }
  }

  const AlignStyle = new StyleAttributor("align", "text-align", {
    scope: Parchment.Scope.BLOCK,
    whitelist: ["right", "center", "justify"],
  });
  const BackgroundStyle = new StyleAttributor(
    "background",
    "background-color",
    {
      scope: Parchment.Scope.INLINE,
    },
  );
  const ColorStyle = new StyleAttributor("color", "color", {
    scope: Parchment.Scope.INLINE,
  });
  const FontStyle = new StyleAttributor("font", "font-family", {
    scope: Parchment.Scope.INLINE,
    whitelist: ["sans-serif", "serif", "monospace"],
  });
  const SizeStyle = new StyleAttributor("size", "font-size", {
    scope: Parchment.Scope.INLINE,
    whitelist: ["10px", "13px", "18px", "32px"],
  });

  Quill.register("formats/width", WidthAttr, true);
  Quill.register("formats/image", CustomImage, true);
  Quill.register("formats/align", AlignStyle, true);
  Quill.register("formats/background", BackgroundStyle, true);
  Quill.register("formats/color", ColorStyle, true);
  Quill.register("formats/font", FontStyle, true);
  Quill.register("formats/size", SizeStyle, true);
}

function attachImageResizer(quill: Quill): () => void {
  const editorRoot = quill.root;
  const qlContainer = editorRoot.parentElement as HTMLElement;
  let overlay: HTMLDivElement | null = null;
  let activeImg: HTMLImageElement | null = null;
  let isDragging = false;

  if (getComputedStyle(qlContainer).position === "static") {
    qlContainer.style.position = "relative";
  }

  const layer = document.createElement("div");
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "1000",
  });
  qlContainer.appendChild(layer);

  function clearOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    activeImg = null;
  }

  function reposition() {
    if (!overlay || !activeImg) {
      return;
    }

    const imgRect = activeImg.getBoundingClientRect();
    const containerRect = qlContainer.getBoundingClientRect();

    Object.assign(overlay.style, {
      top: `${imgRect.top - containerRect.top + qlContainer.scrollTop}px`,
      left: `${imgRect.left - containerRect.left + qlContainer.scrollLeft}px`,
      width: `${imgRect.width}px`,
      height: `${imgRect.height}px`,
    });
  }

  function createOverlay(img: HTMLImageElement) {
    clearOverlay();
    activeImg = img;

    overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "absolute",
      border: "2px solid #3b82f6",
      pointerEvents: "none",
      boxSizing: "border-box",
    });

    const handle = document.createElement("div");
    Object.assign(handle.style, {
      position: "absolute",
      right: "-7px",
      bottom: "-7px",
      width: "14px",
      height: "14px",
      borderRadius: "9999px",
      backgroundColor: "#3b82f6",
      border: "2px solid #fff",
      cursor: "nwse-resize",
      pointerEvents: "all",
    });

    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!activeImg) {
        return;
      }

      isDragging = true;
      const startX = event.clientX;
      const startWidth = activeImg.clientWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!activeImg) {
          return;
        }

        moveEvent.preventDefault();
        const nextWidth = Math.max(
          80,
          startWidth + (moveEvent.clientX - startX),
        );
        activeImg.style.width = `${nextWidth}px`;
        activeImg.setAttribute("width", String(Math.round(nextWidth)));
        requestAnimationFrame(reposition);
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        quill.update("user");
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    overlay.appendChild(handle);
    layer.appendChild(overlay);
    requestAnimationFrame(reposition);
  }

  const onEditorMouseDown = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target?.tagName === "IMG") {
      createOverlay(target as HTMLImageElement);
      return;
    }

    if (!isDragging) {
      clearOverlay();
    }
  };

  editorRoot.addEventListener("mousedown", onEditorMouseDown);
  qlContainer.addEventListener("scroll", reposition);
  window.addEventListener("resize", reposition);

  return () => {
    editorRoot.removeEventListener("mousedown", onEditorMouseDown);
    qlContainer.removeEventListener("scroll", reposition);
    window.removeEventListener("resize", reposition);
    clearOverlay();
    layer.remove();
  };
}

export default function MarketingEditor({
  value,
  onChange,
  placeholder,
}: MarketingEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const valueRef = useRef(value);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (!quillRef.current) {
      registerFormats();

      const quill = new Quill(container, {
        theme: "snow",
        placeholder: placeholder || "Compose your campaign...",
        modules: {
          toolbar: {
            container: [
              [
                { font: ["sans-serif", "serif", "monospace"] },
                { size: ["10px", "13px", "18px", "32px"] },
              ],
              [{ header: [1, 2, 3, 4, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ color: [] }, { background: [] }],
              [{ align: [] }],
              ["image", "link", "clean"],
            ],
            handlers: {
              image: () => {
                setIsImageModalOpen(true);
              },
            },
          },
        },
      });

      quillRef.current = quill;

      if (value) {
        quill.clipboard.dangerouslyPasteHTML(value);
        valueRef.current = value;
      }
    }

    const quill = quillRef.current;

    const onTextChange = () => {
      const html = quill.root.innerHTML;
      if (html !== valueRef.current) {
        valueRef.current = html;
        onChange(html);
      }
    };

    quill.on("text-change", onTextChange);
    const cleanupResizer = attachImageResizer(quill);

    return () => {
      quill.off("text-change", onTextChange);
      cleanupResizer();
    };
  }, [onChange, placeholder, value]);

  useEffect(() => {
    if (
      quillRef.current &&
      value !== valueRef.current &&
      !quillRef.current.hasFocus()
    ) {
      quillRef.current.clipboard.dangerouslyPasteHTML(value);
      valueRef.current = value;
    }
  }, [value]);

  function handleInsertImage() {
    if (!imageUrl || !quillRef.current) {
      return;
    }

    const selection = quillRef.current.getSelection(true);
    const index = selection?.index ?? quillRef.current.getLength();
    quillRef.current.insertEmbed(index, "image", imageUrl);
    setImageUrl("");
    setIsImageModalOpen(false);
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <style>{`
          .ql-editor img { max-width: 100%; height: auto; cursor: pointer; display: inline-block; }
          .ql-container { min-height: 420px; border: none; }
          .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid var(--border); background: var(--surface-raised); }
        `}</style>
        <div ref={containerRef} />
      </div>

      {isImageModalOpen ? (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-[480px] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Insert Image URL
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Paste a direct image URL to embed it in your campaign.
            </p>

            <div className="mt-4 space-y-3">
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
              />

              {imageUrl ? (
                <div className="flex min-h-28 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-44 object-contain"
                    onError={(event) => {
                      (event.target as HTMLImageElement).style.display = "none";
                    }}
                    onLoad={(event) => {
                      (event.target as HTMLImageElement).style.display =
                        "block";
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsImageModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleInsertImage} disabled={!imageUrl.trim()}>
                Insert Image
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
```

<sub>436 lines</sub>

#### `components/admin/marketing/marketing-campaign-table.tsx`

```tsx
"use client";

import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import EmailMarketingService from "@/services/EmailMarketing";
import type { getEmailCampaignData } from "@/types/types";
import { getErrorMessage } from "@/lib/utils";

export default function MarketingCampaignTable() {
  const [rows, setRows] = useState<getEmailCampaignData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchCampaigns(showLoader = true) {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await EmailMarketingService.getEmailCampaigns();
      setRows(response.data ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to fetch campaigns."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchCampaigns();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text-secondary)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading campaigns...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          variant="secondary"
          disabled={isRefreshing}
          onClick={() => void fetchCampaigns(false)}
        >
          <RefreshCcw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-primary)]">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
              <tr>
                <th className="px-4 py-3 font-medium">Campaign Name</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Sent Count</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">
                  Date Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.length > 0 ? (
                rows.map((campaign) => {
                  const isCompleted =
                    campaign.status === "completed" ||
                    campaign.status === "Completed";
                  const typeVariant =
                    campaign.type === "bulk"
                      ? "warning"
                      : campaign.type === "bulk_import"
                        ? "brand"
                        : "default";

                  return (
                    <tr
                      key={campaign.id}
                      className="hover:bg-[var(--surface-overlay)]"
                    >
                      <td className="px-4 py-3 font-medium">{campaign.name}</td>
                      <td className="max-w-64 truncate px-4 py-3 text-[var(--text-secondary)]">
                        {campaign.subject}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={typeVariant} className="capitalize">
                          {campaign.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Number(campaign.sent || 0).toLocaleString()} /{" "}
                        {Number(campaign.total || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={isCompleted ? "success" : "warning"}
                          className={isCompleted ? "" : "capitalize"}
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="h-24 px-4 text-center text-[var(--text-secondary)]"
                  >
                    No campaigns found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

<sub>139 lines</sub>


### Admin services
#### `services/Admin.ts`

```ts
import api from "./api/api";
import {
  CreateUserPayload,
  CreateUserResponse,
  getAdminDashboardResponse,
  UpdateUserPayload,
  UpdateUserResponse,
  UpdateUserSubscriptionsPayload,
  updateUserPasswordPayload,
  User,
  // new admin types
  AddNewUserFromAdminPayload,
  AddNewUserFromAdminResponse,
  UpdateNewUserFromAdminPayload,
  UpdateNewUserFromAdminResponse,
  UpdateAddonsPayload,
  UpdateAddonsResponse,
} from "@/types/types";

const adminService = {
  getAllUsers: async (
    page?: number,
    search?: string,
  ): Promise<getAdminDashboardResponse["users"] | User[]> => {
    try {
      if (typeof page === "number") {
        const response = await api.get<getAdminDashboardResponse>("/admin", {
          params: {
            page,
            ...(search ? { search } : {}),
          },
        });

        return response.data.users;
      }

      const users: User[] = [];
      let currentPage = 1;
      let lastPage = 1;

      do {
        const response = await api.get<getAdminDashboardResponse>("/admin", {
          params: {
            page: currentPage,
            ...(search ? { search } : {}),
          },
        });

        const pageData = response.data.users;
        users.push(...(pageData?.data ?? []));
        lastPage = pageData?.last_page || currentPage;
        currentPage += 1;
      } while (currentPage <= lastPage);

      return users;
    } catch (error) {
      throw error;
    }
  },

  searchAllUsers: async (search: string): Promise<User[]> => {
    const users = await adminService.getAllUsers(undefined, search);
    return Array.isArray(users) ? users : users.data;
  },

  getAdminDashboardData: async (): Promise<getAdminDashboardResponse> => {
    try {
      const response = await api.get<getAdminDashboardResponse>("/admin");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createUser: async (
    payload: CreateUserPayload,
  ): Promise<CreateUserResponse> => {
    try {
      const response = await api.post<CreateUserResponse>(
        "/admin/users/add",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (
    payload: UpdateUserPayload,
  ): Promise<UpdateUserResponse> => {
    try {
      const response = await api.post<UpdateUserResponse>(
        "/admin/users/update/details",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteUser: async (
    user_id: number,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/admin/users/delete",
        { user_id },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  activateUser: async (
    id: number,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/activateUser",
        { id },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deactivateUser: async (
    id: number,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/deactivateUser",
        { id },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUserSubscriptions: async (
    payload: UpdateUserSubscriptionsPayload,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/admin/users/update/subscriptions",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUserPassword: async (
    payload: updateUserPasswordPayload,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/admin/users/update/password",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // New Admin Add, Update User Functions
  addNewUserFromAdmin: async (
    payload: AddNewUserFromAdminPayload,
  ): Promise<AddNewUserFromAdminResponse> => {
    try {
      const response = await api.post<AddNewUserFromAdminResponse>(
        "/admin/users/add",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateNewUserFromAdmin: async (
    payload: UpdateNewUserFromAdminPayload,
  ): Promise<UpdateNewUserFromAdminResponse> => {
    try {
      const response = await api.post<UpdateNewUserFromAdminResponse>(
        "/admin/users/update/details",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateAddons: async (
    payload: UpdateAddonsPayload,
  ): Promise<UpdateAddonsResponse> => {
    try {
      const response = await api.post<UpdateAddonsResponse>(
        "/admin/addon/update",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default adminService;
```

<sub>217 lines</sub>

#### `services/Credits.ts`

```ts
import api from "./api/api";
import { UserCreditsPayload, UserCreditsResponse } from "@/types/types";

const creditsService = {
  addCreditsForUsers: async (
    payload: UserCreditsPayload,
  ): Promise<UserCreditsResponse> => {
    try {
      const response = await api.post<UserCreditsResponse>(
        "/admin/users/credits/add",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateCreditForUsers: async (
    payload: UserCreditsPayload,
  ): Promise<UserCreditsResponse> => {
    try {
      const response = await api.post<UserCreditsResponse>(
        "/admin/users/credits/update",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default creditsService;
```

<sub>34 lines</sub>

#### `services/EmailMarketing.ts`

```ts
import api from "./api/api";
import {
  createEmailCampaignPayload,
  createEmailCampaignResponse,
  getEmailCampaignResponse,
} from "@/types/types";

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

const emailMarketingService = {
  createEmailCampaign: async (
    payload: createEmailCampaignPayload,
  ): Promise<createEmailCampaignResponse> => {
    try {
      if (payload.type === "bulk_import" && payload.file) {
        const formData = new FormData();
        formData.append("name", payload.name);
        formData.append("subject", payload.subject);
        formData.append("type", payload.type);
        formData.append("content", payload.content);
        formData.append("file", payload.file);

        if (payload.recipient) {
          formData.append("recipient", payload.recipient);
        }

        if (payload.bulk_recipients && payload.bulk_recipients.length > 0) {
          payload.bulk_recipients.forEach((item, index) => {
            formData.append(`bulk_recipients[${index}]`, item);
          });
        }

        const response = await api.post<createEmailCampaignResponse>(
          "/user/sendCampaign",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        return response.data;
      }

      const response = await api.post<createEmailCampaignResponse>(
        "/user/sendCampaign",
        payload,
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to create email campaign: ${resolveErrorMessage(error)}`,
      );
    }
  },

  getEmailCampaigns: async (): Promise<getEmailCampaignResponse> => {
    try {
      const response = await api.get<getEmailCampaignResponse>(
        "/all/email/campaign",
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch email campaigns: ${resolveErrorMessage(error)}`,
      );
    }
  },
};

export default emailMarketingService;
```

<sub>80 lines</sub>


---

## 15. Integrations (social media channels)

**Live catalogue**

| id | Name | Connect | Live chat |
|---|---|---|---|
| `youtube` | YouTube | OAuth | ✓ |
| `facebook` | Facebook | OAuth (+ manual stream key) | ✓ |
| `linkedin` | LinkedIn | OAuth | – |
| `twitch` | Twitch | OAuth | ✓ |
| `kick` | Kick | OAuth | ✓ |
| `instagram` | Instagram | OAuth (+ manual) | – |
| `tiktok` | TikTok | Manual (server URL + stream key) | – |

**Connect flow (OAuth)**
1. `/channels`: `ChannelsGrid` loads `GET /destinations` and counts connected accounts per platform. `ChannelCard` shows **Connect** (and/or **Manual**, depending on `useChannelConnectVisibility`) and **View connections**.
2. `ConnectChannelModal` → `get<Platform>OAuthUrl()` → `window.open(url)` in a **popup**. It polls `popup.closed` and listens for `message` events.
3. The provider redirects back through the backend to **`/integrations/:channel/select?workspace_id=…[&error=…]`**. That page shows success or error and, on close, `window.opener.postMessage({ type: "flowcasta:integration-connected", channel, workspaceId }, origin)`. On a plan-limit error it sends the opener to `/upgrade`.
4. The opener receives the message (or sees the popup close) → closes the modal → refreshes the destinations.
5. The same modal also has an inline **RTMP form** (name + RTMP URL + stream key). It validates all three and calls `POST /destinations` with `{ type, category, name, rtmp_url, stream_key }`, then routes to `/channels/:id`.

**Manual flow:** `ManualConnectModal` posts to `/destinations/<platform>/manual` with account name + stream URL/key (TikTok's payload is mapped specially).

**Channel details (`/channels/[channel]`):** lists connected accounts for that platform with avatar, handle and detail (`lib/destinations.ts`). Actions: update stream key (`UpdateStreamKeyModal`, manual destinations), delete (`DeleteChannelModal` first runs `findLinkedProjects` across all projects; if linked, `UnlinkRequiredModal` lists those projects and unlinks each before delete is allowed), and docs link.

#### `lib/constants.ts`

> EXCERPT: `ChannelItem` + `CHANNELS_LIST` only. Entries in comments are disabled platforms.

```ts
// EXCERPT of Flowcasta lib/constants.ts — only the Integrations catalogue.
// (The full file also holds studio/template/mock data that these pages do not use.)

export interface ChannelItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  isPro?: boolean;
  connectionMode?: "oauth" | "manual";
  destinationType?: string;
  category?: "streaming" | "storage";
  chatSupported?: boolean;
  docsUrl?: string | null;
}

export const CHANNELS_LIST: ChannelItem[] = [
  {
    id: "youtube",
    name: "YouTube",
    description: "2.5B+ monthly users - Video and live streaming",
    imageUrl: "/channels/youtube1.png",
    connectionMode: "oauth",
    destinationType: "youtube",
    category: "streaming",
    chatSupported: true,
    docsUrl: "https://developers.google.com/youtube/v3/live/getting-started",
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "3B+ monthly users - Pages, groups, and live",
    imageUrl: "/channels/facebook1.svg",
    connectionMode: "oauth",
    destinationType: "facebook",
    category: "streaming",
    chatSupported: true,
    docsUrl: "https://developers.facebook.com/docs/video-api/guides/publishing",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Professional audiences and events",
    imageUrl: "/channels/linkedin.svg",
    connectionMode: "oauth",
    destinationType: "linkedin",
    category: "streaming",
    chatSupported: false,
    docsUrl:
      "https://learn.microsoft.com/linkedin/marketing/community-management/shares/live-event-api",
  },
  {
    id: "twitch",
    name: "Twitch",
    description: "Gaming-first live community",
    imageUrl: "/channels/twitch_logo.png",
    connectionMode: "oauth",
    destinationType: "twitch",
    category: "streaming",
    chatSupported: true,
    docsUrl: "https://dev.twitch.tv/docs/video-broadcast/",
  },
  {
    id: "kick",
    name: "Kick",
    description: "Creator-focused live platform",
    imageUrl: "/channels/kick.jpeg",
    connectionMode: "oauth",
    destinationType: "kick",
    category: "streaming",
    chatSupported: true,
    docsUrl:
      "https://help.kick.com/en/articles/7066931-how-to-stream-on-kick-com",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Reels, stories, and live video",
    imageUrl: "/channels/rtmp-instagram-logo.png",
    connectionMode: "oauth",
    destinationType: "instagram",
    category: "streaming",
    chatSupported: false,
    docsUrl: "https://help.instagram.com/175149681586359",
  },
  // {
  //   id: "x",
  //   name: "X",
  //   description: "Real-time live conversation platform",
  //   imageUrl: "/channels/x.svg",
  //   connectionMode: "manual",
  //   destinationType: "x",
  //   category: "streaming",
  //   chatSupported: false,
  //   docsUrl:
  //     "https://help.twitter.com/en/using-twitter/how-to-use-live-producer",
  // },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Short-form and live discovery",
    imageUrl: "/channels/tiktok.png",
    connectionMode: "manual",
    destinationType: "tiktok",
    category: "streaming",
    chatSupported: false,
    docsUrl:
      "https://www.tiktok.com/creators/creator-portal/en-us/live-gifting-on-tiktok/getting-started-with-live/",
  },
  // {
  //   id: "rumble",
  //   name: "Rumble",
  //   description: "Independent creator video platform",
  //   imageUrl: "/channels/rumble.png",
  // },
  // {
  //   id: "trovo",
  //   name: "Trovo",
  //   description: "Gaming and esports streaming",
  //   imageUrl: "/channels/trovo.svg",
  //   connectionMode: "oauth",
  //   destinationType: "trovo",
  //   category: "streaming",
  //   chatSupported: true,
  //   docsUrl: "https://developer.trovo.live/docs/APIs.html",
  // },
  // {
  //   id: "rtmp",
  //   name: "Custom RTMP",
  //   description: "Connect any RTMP or RTMPS endpoint",
  //   imageUrl: null,
  //   connectionMode: "manual",
  //   destinationType: "rtmp",
  //   category: "streaming",
  //   chatSupported: false,
  //   docsUrl: null,
  // },
  // {
  //   id: "custom-rtmp",
  //   name: "Custom RTMP",
  //   description: "Connect any RTMP endpoint",
  //   imageUrl: null,
  //   isPro: true,
  // },
  // {
  //   id: "custom-srt",
  //   name: "Custom SRT",
  //   description: "Low-latency secure transport",
  //   imageUrl: null,
  //   isPro: true,
  // },
  // {
  //   id: "custom-whip",
  //   name: "Custom WHIP",
  //   description: "WebRTC ingest for pro setups",
  //   imageUrl: null,
  //   isPro: true,
  // },
  // {
  //   id: "custom-hls",
  //   name: "Custom HLS",
  //   description: "HTTP live streaming destinations",
  //   imageUrl: null,
  // },
  // {
  //   id: "mux",
  //   name: "Mux",
  //   description: "Developer video infrastructure",
  //   imageUrl: null,
  // },
  // {
  //   id: "substack",
  //   name: "Substack",
  //   description: "Newsletter audience streaming",
  //   imageUrl: null,
  // },
  // {
  //   id: "amazon-live",
  //   name: "Amazon Live",
  //   description: "Live commerce broadcasts",
  //   imageUrl: "/channels/amazon-live.png",
  // },
  // {
  //   id: "telegram",
  //   name: "Telegram",
  //   description: "Community video distribution",
  //   imageUrl: "/channels/rtmp-telegram-logo.png",
  // },
  // {
  //   id: "dlive",
  //   name: "DLive",
  //   description: "Blockchain live streaming platform",
  //   imageUrl: "/channels/dlive.png",
  // },
  // {
  //   id: "mixcloud",
  //   name: "Mixcloud",
  //   description: "Audio-first live and recorded sets",
  //   imageUrl: "/channels/mixcloud.webp",
  // },
  // {
  //   id: "dropbox",
  //   name: "Dropbox",
  //   description: "Cloud storage and sharing",
  //   imageUrl: "/channels/dropbox.png",
  //   connectionMode: "oauth",
  //   destinationType: "dropbox",
  //   category: "storage",
  //   chatSupported: false,
  //   docsUrl: "https://developers.dropbox.com/oauth-guide",
  // },
  // {
  //   id: "google_drive",
  //   name: "Google Drive",
  //   description: "Workspace file storage and sharing",
  //   imageUrl: "/channels/google-drive%20copy.png",
  //   connectionMode: "oauth",
  //   destinationType: "google_drive",
  //   category: "storage",
  //   chatSupported: false,
  //   docsUrl:
  //     "https://developers.google.com/workspace/drive/api/guides/about-sdk",
  // },
  // {
  //   id: "odysee",
  //   name: "Odysee",
  //   description: "Creator-first video platform",
  //   imageUrl: "/channels/odysee.svg",
  // },
  // {
  //   id: "pumpfun",
  //   name: "Pump.fun",
  //   description: "Community-first live launches",
  //   imageUrl: "/channels/pumpfun.png",
  // },
  // {
  //   id: "dailymotion",
  //   name: "Dailymotion",
  //   description: "Global video platform",
  //   imageUrl: null,
  // },
  // {
  //   id: "bilibili",
  //   name: "Bilibili",
  //   description: "Asia-focused creator platform",
  //   imageUrl: null,
  // },
  // {
  //   id: "afreeca",
  //   name: "AfreecaTV",
  //   description: "Korean live streaming network",
  //   imageUrl: null,
  // },
  // {
  //   id: "vimeo",
  //   name: "Vimeo",
  //   description: "Premium video hosting and live",
  //   imageUrl: "/channels/vimeo.png",
  // },
  // {
  //   id: "discord",
  //   name: "Discord Stage",
  //   description: "Community-first broadcasts",
  //   imageUrl: null,
  // },
  // {
  //   id: "reddit",
  //   name: "Reddit Live",
  //   description: "Live sessions with community threads",
  //   imageUrl: null,
  // },
  // {
  //   id: "snapchat",
  //   name: "Snapchat",
  //   description: "Stories and creator audience",
  //   imageUrl: null,
  // },
  // {
  //   id: "wechat",
  //   name: "WeChat Channels",
  //   description: "China social video ecosystem",
  //   imageUrl: null,
  // },
  // {
  //   id: "line",
  //   name: "LINE LIVE",
  //   description: "Asia messaging and live ecosystem",
  //   imageUrl: null,
  // },
  // {
  //   id: "vk",
  //   name: "VK",
  //   description: "Eastern Europe social platform",
  //   imageUrl: null,
  // },
  // {
  //   id: "ok",
  //   name: "Odnoklassniki",
  //   description: "Regional social broadcasting",
  //   imageUrl: null,
  // },
  // {
  //   id: "nimo",
  //   name: "Nimo TV",
  //   description: "Mobile-first gaming streams",
  //   imageUrl: null,
  // },
  // {
  //   id: "steam",
  //   name: "Steam",
  //   description: "Game store and community streams",
  //   imageUrl: null,
  // },
  // {
  //   id: "douyin",
  //   name: "Douyin",
  //   description: "China short-form and live",
  //   imageUrl: null,
  // },
  // {
  //   id: "kuaishou",
  //   name: "Kuaishou",
  //   description: "Short-form and social live",
  //   imageUrl: null,
  // },
  // {
  //   id: "naver",
  //   name: "Naver TV",
  //   description: "Korean media network",
  //   imageUrl: null,
  // },
];
```

<sub>332 lines</sub>

#### `services/Channels.ts`

```ts
import api from "./api/api";
import {
  getFacebookOAuthUrlResponse,
  getInstagramOauthUrlResponse,
  getLinkedInOauthUrlResponse,
  getYouTubeOAuthUrlResponse,
  getTwitchOAuthUrlResponse,
  getKickOAuthUrlResponse,
  getTrovoOAuthUrlResponse,
  getDropboxOAuthUrlResponse,
  getGoogleDriveOAuthUrlResponse,
  createDestinationPayload,
  createDestinationResponse,
  createManualYoutubeDestinationPayload,
  createManualInstagramDestinationPayload,
  createManualTikTokDestinationPayload,
  createManualFacebookDestinationPayload,
  createManualDestinationResponse,
  getDestinationsResponse,
  getDestinationResponse,
  updateDestinationPayload,
  updateDestinationResponse,
  deleteDestinationResponse,
  updateDestinationStreamKeyPayload,
  updateDestinationStreamKeyResponse,
} from "@/types/types";

const ChannelsService = {
  getFacebookOAuthUrl: async (): Promise<getFacebookOAuthUrlResponse> => {
    try {
      const response = await api.get("/destinations/oauth/facebook/redirect");
      return response.data;
    } catch (error) {
      console.error("Error fetching Facebook OAuth URL:", error);
      throw error;
    }
  },
  getInstagramOAuthUrl: async (): Promise<getInstagramOauthUrlResponse> => {
    try {
      const response = await api.get("/destinations/oauth/instagram/redirect");
      return response.data;
    } catch (error) {
      console.error("Error fetching Facebook OAuth URL:", error);
      throw error;
    }
  },
  getLinkedInOAuthUrl: async (): Promise<getLinkedInOauthUrlResponse> => {
    try {
      const response = await api.get("/destinations/oauth/linkedin/redirect");
      return response.data;
    } catch (error) {
      console.error("Error fetching Facebook OAuth URL:", error);
      throw error;
    }
  },
  getYouTubeOAuthUrl: async (): Promise<getYouTubeOAuthUrlResponse> => {
    try {
      const response = await api.get("/destinations/oauth/youtube/redirect");
      return response.data;
    } catch (error) {
      console.error("Error fetching YouTube OAuth URL:", error);
      throw error;
    }
  },
  getTwitchOAuthUrl: async (): Promise<getTwitchOAuthUrlResponse> => {
    try {
      const response = await api.get("/destinations/oauth/twitch/redirect");
      return response.data;
    } catch (error) {
      console.error("Error fetching Twitch OAuth URL:", error);
      throw error;
    }
  },
  getKickOAuthUrl: async (): Promise<getKickOAuthUrlResponse> => {
    try {
      const response = await api.get("/destinations/oauth/kick/redirect");
      return response.data;
    } catch (error) {
      console.error("Error fetching Kick OAuth URL:", error);
      throw error;
    }
  },
  getTrovoOAuthUrl: async (): Promise<getTrovoOAuthUrlResponse> => {
    try {
      const response = await api.get("/destinations/oauth/trovo/redirect");
      return response.data;
    } catch (error) {
      console.error("Error fetching Trovo OAuth URL:", error);
      throw error;
    }
  },
  getDropboxOAuthUrl: async (): Promise<getDropboxOAuthUrlResponse> => {
    try {
      const response = await api.get("/destinations/oauth/dropbox/redirect");
      return response.data;
    } catch (error) {
      console.error("Error fetching Dropbox OAuth URL:", error);
      throw error;
    }
  },
  getGoogleDriveOAuthUrl: async (): Promise<getGoogleDriveOAuthUrlResponse> => {
    try {
      const response = await api.get(
        "/destinations/oauth/google_drive/redirect",
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching Google Drive OAuth URL:", error);
      throw error;
    }
  },
  createDestination: async (
    payload: createDestinationPayload,
  ): Promise<createDestinationResponse> => {
    try {
      const response = await api.post("/destinations", payload);
      return response.data;
    } catch (error) {
      console.error("Error creating destination:", error);
      throw error;
    }
  },
  // Manually connect a destination using just an account name and stream key.
  // Each platform has its own endpoint; the response shape is shared.
  createManualYoutubeDestination: async (
    payload: createManualYoutubeDestinationPayload,
  ): Promise<createManualDestinationResponse> => {
    try {
      const response = await api.post("/destinations/youtube/manual", payload);
      return response.data;
    } catch (error) {
      console.error("Error creating manual YouTube destination:", error);
      throw error;
    }
  },
  createManualInstagramDestination: async (
    payload: createManualInstagramDestinationPayload,
  ): Promise<createManualDestinationResponse> => {
    try {
      const response = await api.post(
        "/destinations/instagram/manual",
        payload,
      );
      return response.data;
    } catch (error) {
      console.error("Error creating manual Instagram destination:", error);
      throw error;
    }
  },
  createManualTikTokDestination: async (
    payload: createManualTikTokDestinationPayload,
  ): Promise<createManualDestinationResponse> => {
    try {
      const response = await api.post("/destinations/tiktok/manual", payload);
      return response.data;
    } catch (error) {
      console.error("Error creating manual TikTok destination:", error);
      throw error;
    }
  },
  createManualFacebookDestination: async (
    payload: createManualFacebookDestinationPayload,
  ): Promise<createManualDestinationResponse> => {
    try {
      const response = await api.post("/destinations/facebook/manual", payload);
      return response.data;
    } catch (error) {
      console.error("Error creating manual Facebook destination:", error);
      throw error;
    }
  },
  getDestinations: async (type?: string): Promise<getDestinationsResponse> => {
    try {
      const response = await api.get("/destinations", {
        params: type ? { type } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching destinations:", error);
      throw error;
    }
  },
  getDestination: async (id: number): Promise<getDestinationResponse> => {
    try {
      const response = await api.get(`/destinations/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching destination with id ${id}:`, error);
      throw error;
    }
  },
  updateDestination: async (
    id: number,
    payload: updateDestinationPayload,
  ): Promise<updateDestinationResponse> => {
    try {
      const response = await api.patch(`/destinations/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error(`Error updating destination with id ${id}:`, error);
      throw error;
    }
  },
  updateDestinationStreamKey: async (
    id: number,
    payload: updateDestinationStreamKeyPayload,
  ): Promise<updateDestinationStreamKeyResponse> => {
    try {
      const response = await api.patch(
        `/destinations/manualupdate/${id}`,
        payload,
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error updating stream key for destination with id ${id}:`,
        error,
      );
      throw error;
    }
  },
  deleteDestination: async (id: number): Promise<deleteDestinationResponse> => {
    try {
      const response = await api.delete(`/destinations/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting destination with id ${id}:`, error);
      throw error;
    }
  },
};

export default ChannelsService;
```

<sub>233 lines</sub>

#### `lib/channelConnectAccess.ts`

```ts
"use client";

import * as React from "react";
import {
  getSessionUserFromCookie,
  SESSION_UPDATED_EVENT,
} from "@/lib/auth-session";

export type ConnectVisibility = {
  /** OAuth "Connect" flow (hidden for members). */
  showOAuth: boolean;
  /** Manual connect flow (hidden for reviewers). */
  showManual: boolean;
};

// Role rules for the channel connect buttons:
//  - reviewer → OAuth only (manual hidden)
//  - member   → manual only (OAuth hidden)
// - team_member → manual only (OAuth hidden)
//  - admin / support (and any other role) → both
export function getConnectVisibility(role?: string | null): ConnectVisibility {
  const normalized = (role ?? "").toLowerCase();
  return {
    showOAuth: normalized !== "member" && normalized !== "team_member",
    showManual: normalized !== "reviewer",
  };
}

// Per-platform overrides that apply to ALL roles (they supersede the role
// rules above). Use these to force a platform's connect options regardless of
// who is signed in — e.g. while a platform is pending approval.
const PLATFORM_CONNECT_OVERRIDES: Record<string, ConnectVisibility> = {
  // Manual connect disabled for now — OAuth only.
  facebook: { showOAuth: true, showManual: false },
  // Both flows available.
  instagram: { showOAuth: true, showManual: true },
  // Both flows available.
  youtube: { showOAuth: true, showManual: false },
  // Manual only, and deliberately for EVERY role — TikTok is manual-connect
  // for all user types, reviewers included (the role rules would otherwise
  // hide manual from them). Because an override is returned wholesale, role is
  // never consulted here; do not replace this with role rules.
  // `showOAuth: false` matters too: there is no TikTok OAuth integration, and
  // without it admins would get a Connect button that leads nowhere.
  tiktok: { showOAuth: false, showManual: true },
  // YouTube intentionally has no override — it follows the role rules
  // (member/team_member → manual only, reviewer → OAuth, admin → both).
};

// Resolve connect visibility for a specific channel: a per-platform override
// wins when present, otherwise the role rules apply.
export function getChannelConnectVisibility(
  channelId: string,
  role?: string | null,
): ConnectVisibility {
  return PLATFORM_CONNECT_OVERRIDES[channelId] ?? getConnectVisibility(role);
}

// Reads the session role from the cookie (client-side) and stays in sync with
// profile refreshes via SESSION_UPDATED_EVENT.
export function useConnectVisibility(): ConnectVisibility {
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const read = () => setRole(getSessionUserFromCookie()?.role ?? null);
    read();
    window.addEventListener(SESSION_UPDATED_EVENT, read);
    return () => window.removeEventListener(SESSION_UPDATED_EVENT, read);
  }, []);

  return getConnectVisibility(role);
}

// Like useConnectVisibility, but returns a resolver that applies per-platform
// overrides for a given channel id.
export function useChannelConnectVisibility(): (
  channelId: string,
) => ConnectVisibility {
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const read = () => setRole(getSessionUserFromCookie()?.role ?? null);
    read();
    window.addEventListener(SESSION_UPDATED_EVENT, read);
    return () => window.removeEventListener(SESSION_UPDATED_EVENT, read);
  }, []);

  return React.useCallback(
    (channelId: string) => getChannelConnectVisibility(channelId, role),
    [role],
  );
}
```

<sub>92 lines</sub>

#### `lib/destinations.ts`

```ts
import type { Destination } from "@/types/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Facebook destinations can be backed by a Page or a personal Profile. The API
 * marks this with `metadata.entity_type`; fall back to whichever object is
 * present. Returns null for non-facebook destinations.
 */
export function getFacebookEntityType(
  destination: Destination,
): "page" | "profile" | null {
  if (destination.type !== "facebook") {
    return null;
  }

  const metadata = destination.metadata;
  const entityType = metadata?.entity_type;
  if (entityType === "page" || entityType === "profile") {
    return entityType;
  }
  if (metadata?.page) return "page";
  if (metadata?.profile) return "profile";
  return null;
}

/**
 * Resolve the best avatar/thumbnail image for a destination from its
 * per-platform metadata. Returns null when no image is available.
 */
export function getDestinationImage(destination: Destination): string | null {
  const metadata = destination.metadata;
  if (!metadata) {
    return null;
  }

  switch (destination.type) {
    case "facebook": {
      const page = asRecord(metadata.page);
      const pageUrl = asString(asRecord(asRecord(page?.picture)?.data)?.url);
      if (pageUrl) return pageUrl;
      const profile = asRecord(metadata.profile);
      return asString(profile?.picture);
    }
    case "instagram": {
      const account = asRecord(metadata.instagram_account);
      return asString(account?.profile_picture_url);
    }
    case "linkedin": {
      const profile = asRecord(metadata.linkedin_profile);
      return asString(profile?.picture);
    }
    case "twitch": {
      const user = asRecord(metadata.user);
      return asString(user?.profile_image);
    }
    case "youtube": {
      const channel = asRecord(metadata.channel);
      return asString(channel?.thumbnail);
    }
    case "kick": {
      const channel = asRecord(metadata.channel);
      return asString(channel?.banner_picture);
    }
    default:
      return null;
  }
}

/** A platform handle (e.g. "@username") when available. */
export function getDestinationHandle(destination: Destination): string | null {
  const metadata = destination.metadata;
  if (!metadata) {
    return null;
  }

  switch (destination.type) {
    case "instagram": {
      const account = asRecord(metadata.instagram_account);
      const username = asString(account?.username);
      return username ? `@${username}` : null;
    }
    case "twitch": {
      const user = asRecord(metadata.user);
      const login = asString(user?.login);
      return login ? `@${login}` : null;
    }
    case "kick": {
      const channel = asRecord(metadata.channel);
      const slug = asString(channel?.slug) ?? asString(channel?.username);
      return slug ? `@${slug}` : null;
    }
    default:
      return null;
  }
}

/**
 * A short secondary line describing the destination — entity type for
 * facebook, follower/subscriber counts where the platform exposes them.
 */
export function getDestinationDetail(destination: Destination): string | null {
  const metadata = destination.metadata;
  if (!metadata) {
    return null;
  }

  switch (destination.type) {
    case "facebook": {
      const entity = getFacebookEntityType(destination);
      return entity === "page"
        ? "Facebook Page"
        : entity === "profile"
          ? "Facebook Profile"
          : null;
    }
    case "instagram": {
      const account = asRecord(metadata.instagram_account);
      const followers = account?.followers_count;
      return typeof followers === "number"
        ? `${followers.toLocaleString()} followers`
        : null;
    }
    case "youtube": {
      const channel = asRecord(metadata.channel);
      const statistics = asRecord(channel?.statistics);
      const subscribers = asString(statistics?.subscriberCount);
      return subscribers
        ? `${Number(subscribers).toLocaleString()} subscribers`
        : null;
    }
    case "linkedin": {
      const profile = asRecord(metadata.linkedin_profile);
      return asString(profile?.email);
    }
    default:
      return null;
  }
}
```

<sub>147 lines</sub>

#### `app/(dashboard)/channels/page.tsx`

```tsx
import type { Metadata } from "next";
import { ChannelsHeader } from "@/components/channels/ChannelsHeader";
import { ChannelsGrid } from "@/components/channels/ChannelsGrid";
import { CHANNELS_LIST } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Channels",
  description: "Connect Facebook, YouTube, Twitch and 30+ platforms",
  robots: { index: false, follow: false },
};

export default function ChannelsPage() {
  return (
    <section className="px-6 pt-8">
      <ChannelsHeader />
      <div className="mt-8">
        <ChannelsGrid channels={CHANNELS_LIST} />
      </div>
    </section>
  );
}
```

<sub>21 lines</sub>

#### `components/channels/ChannelsHeader.tsx`

```tsx
import { WatchDemoButton } from "@/components/demo/WatchDemoButton";

export function ChannelsHeader() {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4"
      data-tour="channels-header"
    >
      <div>
        <span className="overline">Channels</span>
        <p className="mt-1 text-display-sm text-[var(--text-primary)]">
          Connect once. Stream everywhere.
        </p>
      </div>

      {/* Sits opposite the heading — connecting a channel is the first thing
          on this page, and the demo is what shows how. */}
      <WatchDemoButton />
    </div>
  );
}
```

<sub>21 lines</sub>

#### `components/demo/WatchDemoButton.tsx`

> Flowcasta-specific demo video: swap the YouTube IDs for the new product's demo, or drop it.

```tsx
"use client";

import * as React from "react";
import { ExternalLink, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

/** The Flowcasta channel — where the demo and every other video lives. */
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@FlowCasta";

/**
 * The channel's uploads playlist.
 *
 * Every channel has one, and its id is the channel id with the "UC" prefix
 * swapped for "UU" (channel UCOttU_oRrbhRKWsZ-HbGNEw → playlist
 * UUOttU_oRrbhRKWsZ-HbGNEw). Embedding it means the player carries the whole
 * channel — new uploads appear on their own, with no API key, no key rotation
 * and no hardcoded list here to go stale.
 */
const YOUTUBE_UPLOADS_PLAYLIST_ID = "UUOttU_oRrbhRKWsZ-HbGNEw";

/** Opens on this video, with the rest of the channel queued behind it. */
const DEMO_VIDEO_ID = "PuEQ_XNKick";

const EMBED_SRC =
  `https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}` +
  `?list=${YOUTUBE_UPLOADS_PLAYLIST_ID}` +
  // rel=0 keeps the end screen on this channel rather than offering up
  // whatever YouTube thinks is related — often a competitor.
  `&rel=0&modestbranding=1&autoplay=1`;

interface WatchDemoButtonProps {
  /** Defaults to the quieter treatment, so it never competes with a primary CTA beside it. */
  variant?: "brand" | "secondary" | "ghost" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

/**
 * "Watch demo" — the button and its player together, so a surface that wants
 * one drops in a single element and owns no state of its own.
 *
 * The iframe is mounted only while the modal is open, which is what stops
 * playback on close: there is no player API call to keep in sync because there
 * is no player left to pause.
 */
export function WatchDemoButton({
  variant = "secondary",
  size = "md",
  className,
  label = "Watch demo",
}: WatchDemoButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn("gap-1.5", className)}
      >
        <PlayCircle size={15} />
        {label}
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="See Flowcasta in action"
        subtitle="Start with the walkthrough — the rest of our videos are queued up next."
        size="xxxl"
        showBrandGlow
      >
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-black">
            {open ? (
              <iframe
                src={EMBED_SRC}
                title="Flowcasta demo"
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : null}
          </div>

          <a
            href={YOUTUBE_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-[var(--brand)] transition hover:underline"
          >
            View all our videos on YouTube
            <ExternalLink size={12} />
          </a>
        </div>
      </Modal>
    </>
  );
}
```

<sub>106 lines</sub>

#### `components/channels/ChannelsGrid.tsx`

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { StaggerList } from "@/components/motion/StaggerList";
import { ChannelCard } from "@/components/channels/ChannelCard";
import { ConnectChannelModal } from "@/components/channels/ConnectChannelModal";
import {
  ManualConnectModal,
  isManualConnectSupported,
} from "@/components/channels/ManualConnectModal";
import { useChannelConnectVisibility } from "@/lib/channelConnectAccess";
import type { ChannelItem } from "@/lib/constants";
import ChannelsService from "@/services/Channels";
import type { Destination } from "@/types/types";

type DestinationRecord = Destination & Record<string, unknown>;

export function ChannelsGrid({ channels }: { channels: ChannelItem[] }) {
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(
    null,
  );
  const [manualChannel, setManualChannel] = useState<ChannelItem | null>(null);
  const [autoConnect, setAutoConnect] = useState(false);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const connectVisibilityFor = useChannelConnectVisibility();
  const router = useRouter();

  const loadDestinations = useCallback(() => {
    void ChannelsService.getDestinations().then((res) => {
      if (res.data) {
        setDestinations((res.data?.destinations ?? []) as DestinationRecord[]);
      }
    });
  }, []);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  const connectedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dest of destinations) {
      const platform = String(dest.type ?? "").toLowerCase();
      if (platform) {
        counts[platform] = (counts[platform] ?? 0) + 1;
      }
    }
    return counts;
  }, [destinations]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedChannel(null);
      setAutoConnect(false);
    }
  }, []);

  return (
    <>
      <StaggerList className="grid gap-4 @2xl/app:grid-cols-1 @3xl/app:grid-cols-2 @5xl/app:grid-cols-3 @7xl/app:grid-cols-4">
        {channels.map((channel, index) => {
          const { showOAuth, showManual } = connectVisibilityFor(channel.id);
          return (
            <motion.div key={channel.id} variants={fadeInUp}>
              <ChannelCard
                channel={channel}
                isTourAnchor={index === 0}
                connectedCount={
                  connectedCounts[channel.destinationType ?? channel.id] ?? 0
                }
                connectDisabled={!channel.connectionMode}
                connectLabel={
                  channel.connectionMode ? "Connect" : "Coming soon"
                }
                showConnect={
                  // Role rules only apply to manual-supported platforms
                  // (Facebook/YouTube/Instagram/TikTok); other channels always
                  // show OAuth.
                  isManualConnectSupported(channel.id) ? showOAuth : true
                }
                showManualConnect={
                  showManual &&
                  Boolean(channel.connectionMode) &&
                  isManualConnectSupported(channel.id)
                }
                onManualConnect={() => setManualChannel(channel)}
                onConnect={() => {
                  if (!channel.connectionMode) {
                    return;
                  }
                  setSelectedChannel(channel);
                  setAutoConnect(true);
                }}
                onViewConnections={() => router.push(`/channels/${channel.id}`)}
              />
            </motion.div>
          );
        })}
      </StaggerList>
      <ConnectChannelModal
        open={Boolean(selectedChannel)}
        onOpenChange={handleOpenChange}
        channel={selectedChannel}
        autoConnect={autoConnect}
      />
      <ManualConnectModal
        open={Boolean(manualChannel)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setManualChannel(null);
          }
        }}
        channel={manualChannel}
        onConnected={loadDestinations}
      />
    </>
  );
}
```

<sub>121 lines</sub>

#### `components/channels/ChannelCard.tsx`

```tsx
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ChannelItem } from "@/lib/constants";
import Image from "next/image";

export function ChannelCard({
  channel,
  connectedCount,
  onConnect,
  onViewConnections,
  onManualConnect,
  showManualConnect = false,
  showConnect = true,
  connectDisabled = false,
  connectLabel = "Connect",
  isTourAnchor = false,
}: {
  channel: ChannelItem;
  connectedCount?: number;
  onConnect: () => void;
  onViewConnections: () => void;
  onManualConnect?: () => void;
  showManualConnect?: boolean;
  showConnect?: boolean;
  connectDisabled?: boolean;
  connectLabel?: string;
  /** Marks this card (usually the first) as the page tour's anchor. */
  isTourAnchor?: boolean;
}) {
  return (
    <Card
      hoverable
      data-tour={isTourAnchor ? "channel-card" : undefined}
      className="relative flex flex-col items-center rounded-[var(--radius-xl)] p-6 text-center max-h-[300px] h-full"
    >
      {connectedCount !== undefined && connectedCount > 0 ? (
        <Badge
          variant="success"
          className="absolute right-3 top-3 px-1.5 py-0.5 text-[10px] leading-none"
        >
          connected ({connectedCount})
        </Badge>
      ) : channel.isPro ? (
        <Badge
          variant="brand"
          className="absolute right-3 top-3 px-1.5 py-0.5 text-[10px] leading-none"
        >
          Pro
        </Badge>
      ) : null}

      <div className="flex h-[50px] w-[80px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--brand)]">
        {channel.imageUrl ? (
          <Image
            src={channel.imageUrl}
            alt={`${channel.name} logo`}
            width={80}
            height={50}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span>{channel.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <p className="mt-4 font-display text-sm font-semibold text-[var(--text-primary)]">
        {channel.name}
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {channel.description}
      </p>

      <div className="mt-4 w-full space-y-2">
        {channel.isPro ? (
          <Button variant="secondary" className="w-full" disabled>
            Upgrade
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            {showManualConnect && onManualConnect ? (
              <Button
                type="button"
                variant="secondary"
                data-tour={isTourAnchor ? "channel-manual-connect" : undefined}
                className="min-w-0 flex-1 p-1"
                onClick={onManualConnect}
              >
                Manual connect
              </Button>
            ) : null}
            {showConnect ? (
              <Button
                type="button"
                variant="outline"
                data-tour={isTourAnchor ? "channel-connect" : undefined}
                className="min-w-0 flex-1 p-1"
                onClick={onConnect}
                disabled={connectDisabled}
              >
                {connectLabel}
              </Button>
            ) : null}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          data-tour={isTourAnchor ? "channel-view-connections" : undefined}
          className="w-full"
          onClick={onViewConnections}
        >
          View connections
        </Button>
      </div>
    </Card>
  );
}
```

<sub>117 lines</sub>

#### `components/channels/ConnectChannelModal.tsx`

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Info, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { ChannelItem } from "@/lib/constants";
import { getErrorMessage } from "@/lib/utils";
import ChannelsService from "@/services/Channels";

type ConnectChannelModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelItem | null;
  autoConnect?: boolean;
  onConnected?: () => void;
};

type OAuthHandler = () => Promise<{ url: string }>;

type ChannelFact = {
  label: string;
  value: string;
};

const OAUTH_HANDLERS: Record<string, OAuthHandler> = {
  facebook: ChannelsService.getFacebookOAuthUrl,
  instagram: ChannelsService.getInstagramOAuthUrl,
  linkedin: ChannelsService.getLinkedInOAuthUrl,
  youtube: ChannelsService.getYouTubeOAuthUrl,
  twitch: ChannelsService.getTwitchOAuthUrl,
  kick: ChannelsService.getKickOAuthUrl,
  trovo: ChannelsService.getTrovoOAuthUrl,
  dropbox: ChannelsService.getDropboxOAuthUrl,
  google_drive: ChannelsService.getGoogleDriveOAuthUrl,
};

const DEFAULT_FACTS: ChannelFact[] = [
  { label: "Auth", value: "Secure connection flow" },
  { label: "Accounts", value: "Connect multiple destinations" },
  { label: "Control", value: "Disconnect anytime from settings" },
];

const CHANNEL_FACTS: Record<string, ChannelFact[]> = {
  youtube: [
    { label: "Live", value: "Stream to YouTube Live" },
    {
      label: "Chat",
      value: "Sync live chat into your overlay via YouTube API",
    },
    { label: "Auth", value: "Google OAuth required" },
  ],
  facebook: [
    { label: "Reach", value: "Pages and profiles" },
    { label: "Chat", value: "Save Facebook comments in your overlay" },
    { label: "Auth", value: "Meta permissions required" },
  ],
  twitch: [
    { label: "Community", value: "Gaming-first audiences" },
    { label: "Chat", value: "Sync Twitch chat and moderation updates" },
    { label: "Auth", value: "Twitch OAuth required" },
  ],
  kick: [
    { label: "Live", value: "OAuth connect and stream straight to Kick" },
    { label: "Chat", value: "Save Kick chat events into your overlay" },
    { label: "Auth", value: "Kick OAuth required" },
  ],
  trovo: [
    { label: "Live", value: "OAuth connect and stream straight to Trovo" },
    { label: "Chat", value: "Save Trovo chat events into your overlay" },
    { label: "Auth", value: "Trovo OAuth required" },
  ],
  instagram: [
    { label: "Live", value: "Connect and stream to your global audience" },
    { label: "Control", value: "Start from Instagram Live Producer" },
    { label: "Auth", value: "Instagram Oauth Required" },
  ],
  tiktok: [
    { label: "Setup", value: "Paste TikTok RTMP URL and stream key" },
    { label: "Live", value: "Use your TikTok Live ingest details" },
    { label: "Mode", value: "Manual RTMP destination" },
  ],
  x: [
    { label: "Setup", value: "Paste X Live Producer RTMP URL and stream key" },
    { label: "Audience", value: "Reach live social audiences on X" },
    { label: "Mode", value: "Manual RTMP destination" },
  ],
  linkedin: [
    { label: "Live", value: "Broadcast the Co-operate experience" },
    { label: "Audience", value: "Professional live events" },
    { label: "Auth", value: "Linkedin Oauth Required" },
  ],
  rtmp: [
    { label: "Setup", value: "Use any RTMP or RTMPS ingest endpoint" },
    { label: "Mode", value: "Manual RTMP destination" },
    { label: "Flexibility", value: "Works with custom social endpoints" },
  ],
  dropbox: [
    { label: "Storage", value: "Import pre-recorded assets" },
    { label: "Auth", value: "Dropbox OAuth required" },
    { label: "Files", value: "Sync new uploads quickly" },
  ],
  google_drive: [
    { label: "Storage", value: "Import Drive folders" },
    { label: "Auth", value: "Google OAuth required" },
    { label: "Teams", value: "Share files across workspaces" },
  ],
};

type ManualFormState = {
  name: string;
  rtmpUrl: string;
  streamKey: string;
};

const buildInitialManualForm = (
  channel: ChannelItem | null,
): ManualFormState => ({
  name: channel ? `${channel.name} destination` : "",
  rtmpUrl: "",
  streamKey: "",
});

export function ConnectChannelModal({
  open,
  onOpenChange,
  channel,
  autoConnect = false,
  onConnected,
}: ConnectChannelModalProps) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState<ManualFormState>(() =>
    buildInitialManualForm(channel),
  );
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);
  const autoConnectRef = useRef<string | null>(null);

  const isOAuthChannel = channel ? Boolean(OAUTH_HANDLERS[channel.id]) : false;
  const isManualChannel = channel?.connectionMode === "manual";
  const isConnectable =
    Boolean(channel?.connectionMode) && (isOAuthChannel || isManualChannel);

  const facts = useMemo(() => {
    if (!channel) {
      return DEFAULT_FACTS;
    }
    return (
      CHANNEL_FACTS[channel.destinationType ?? channel.id] ?? DEFAULT_FACTS
    );
  }, [channel]);

  const cleanupPopup = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    setIsWaiting(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupPopup();
    };
  }, [cleanupPopup]);

  // Listen for the success signal posted by the /integrations/[channel]/select
  // callback page when the user clicks "Close window". Close the popup + modal
  // and refresh the whole page so the connected destination shows up.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data as { type?: string } | null;
      if (data?.type !== "flowcasta:integration-connected") {
        return;
      }

      cleanupPopup();
      onConnected?.();
      onOpenChange(false);
      window.location.reload();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [cleanupPopup, onConnected, onOpenChange]);

  const startPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }

    pollRef.current = window.setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        // Popup was closed (completed or cancelled). Stop the waiting state.
        // A successful connection is signalled separately via postMessage from
        // the /integrations/[channel]/select callback page.
        cleanupPopup();
      }
    }, 700);
  }, [cleanupPopup]);

  const handleOAuthConnect = useCallback(async () => {
    if (!channel) {
      return;
    }

    const handler = OAUTH_HANDLERS[channel.id];
    if (!handler) {
      setError("This channel is not available yet.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await handler();
      // NOTE: do not pass `noopener`/`noreferrer` here — the callback page needs
      // `window.opener` to signal back, and we need the handle to poll for close.
      const popup = window.open(
        response.url,
        "flowcasta-oauth",
        "width=520,height=720",
      );

      if (!popup) {
        setError("Popup blocked. Please allow popups and try again.");
        return;
      }

      popupRef.current = popup;
      setIsWaiting(true);
      startPolling();
    } catch (err) {
      console.error("Channel connect failed", err);
      setError(getErrorMessage(err, "Unable to start connection."));
    } finally {
      setIsConnecting(false);
    }
  }, [channel, startPolling]);

  const handleManualConnect = useCallback(async () => {
    if (!channel) {
      return;
    }

    const type = channel.destinationType ?? channel.id;
    const payload = {
      type,
      category: channel.category ?? "streaming",
      name: manualForm.name.trim(),
      rtmp_url: manualForm.rtmpUrl.trim(),
      stream_key: manualForm.streamKey.trim(),
    };

    if (!payload.name || !payload.rtmp_url || !payload.stream_key) {
      setError("Name, RTMP URL, and stream key are required.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await ChannelsService.createDestination(payload);
      onConnected?.();
      onOpenChange(false);
      router.push(`/channels/${channel.id}`);
    } catch (err) {
      console.error("Manual destination create failed", err);
      setError(getErrorMessage(err, "Unable to save destination."));
    } finally {
      setIsConnecting(false);
    }
  }, [channel, manualForm, onConnected, onOpenChange, router]);

  const handleConnect = useCallback(async () => {
    if (!channel?.connectionMode) {
      setError("This channel is not available yet.");
      return;
    }

    if (isOAuthChannel) {
      await handleOAuthConnect();
      return;
    }

    if (isManualChannel) {
      await handleManualConnect();
      return;
    }

    setError("This channel is not available yet.");
  }, [
    channel,
    handleManualConnect,
    handleOAuthConnect,
    isManualChannel,
    isOAuthChannel,
  ]);

  useEffect(() => {
    if (!open) {
      autoConnectRef.current = null;
      return;
    }

    if (
      autoConnect &&
      channel &&
      isOAuthChannel &&
      autoConnectRef.current !== channel.id &&
      !isConnecting &&
      !isWaiting
    ) {
      autoConnectRef.current = channel.id;
      void handleOAuthConnect();
    }
  }, [
    autoConnect,
    channel,
    handleOAuthConnect,
    isConnecting,
    isOAuthChannel,
    isWaiting,
    open,
  ]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        cleanupPopup();
        setError(null);
        setManualForm(buildInitialManualForm(channel));
      }
      onOpenChange(nextOpen);
    },
    [channel, cleanupPopup, onOpenChange],
  );

  if (!channel) {
    return null;
  }

  const badgeLabel = isOAuthChannel
    ? "OAuth"
    : isManualChannel
      ? "Manual RTMP"
      : "Coming soon";
  const buttonLabel = isOAuthChannel
    ? isConnecting
      ? "Opening..."
      : isWaiting
        ? "Waiting for authorization"
        : `Connect ${channel.name}`
    : isManualChannel
      ? isConnecting
        ? "Saving destination..."
        : `Save ${channel.name}`
      : "Coming soon";

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={`Connect ${channel.name}`}
      subtitle={
        isManualChannel
          ? "Save the ingest details from the platform and start streaming through FlowCasta."
          : "Authorize once and start streaming in minutes."
      }
      size="lg"
      showBrandGlow
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void handleConnect()}
          disabled={!isConnectable || isConnecting || isWaiting}
        >
          {buttonLabel}
        </Button>
        <Link
          href={`/channels/${channel.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          View all connections
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        {channel.docsUrl ? (
          <Link
            href={channel.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--brand)] hover:opacity-80"
          >
            Setup guide
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <Card className="flex flex-col items-center gap-4 border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface)]">
            {channel.imageUrl ? (
              <Image
                src={channel.imageUrl}
                alt={`${channel.name} logo`}
                width={80}
                height={80}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <span className="text-lg font-semibold text-[var(--brand)]">
                {channel.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {channel.name}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {channel.description}
            </p>
          </div>
          <Badge variant="brand" className="px-3 py-1 text-xs">
            {badgeLabel}
          </Badge>
          {channel.chatSupported ? (
            <Badge variant="success" className="px-3 py-1 text-xs">
              Chat sync
            </Badge>
          ) : null}
        </Card>

        <div className="space-y-4">
          {isManualChannel ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Destination details
              </p>
              <div className="mt-4 grid gap-3">
                <Input
                  label="Destination name"
                  value={manualForm.name}
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder={`${channel.name} destination`}
                />
                <Input
                  label="RTMP URL"
                  value={manualForm.rtmpUrl}
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      rtmpUrl: event.target.value,
                    }))
                  }
                  placeholder="rtmps://example.com/live"
                />
                <Input
                  label="Stream key"
                  value={manualForm.streamKey}
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      streamKey: event.target.value,
                    }))
                  }
                  placeholder="Paste the stream key from the platform"
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              What happens next
            </p>
            <div className="mt-3 grid gap-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {fact.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {fact.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">
                {isManualChannel
                  ? "Use the RTMP server URL and stream key exactly as provided by the platform."
                  : "We will keep this modal open while you complete the connection in a new window."}
              </p>
            </div>
            {error ? (
              <p className="mt-3 text-xs font-semibold text-[var(--danger)]">
                {error}
              </p>
            ) : null}
            {isWaiting ? (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Waiting for authorization. Close the popup once you finish.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

<sub>546 lines</sub>

#### `components/channels/ManualConnectModal.tsx`

```tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { BookOpen, Info, Link2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { ChannelItem } from "@/lib/constants";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import ChannelsService from "@/services/Channels";

const LEARNING_CENTER_URL =
  "https://www.flowcasta.com/learning-center/platforms";

export type ManualConnectConfig = {
  /** Label + placeholder for the account name field, worded per platform. */
  nameLabel: string;
  namePlaceholder: string;
  /** Guidance the user must follow before their manual account can stream. */
  instruction: string;
  /** Whether to surface the learning-center link for finding a stream key. */
  showLearningCenter: boolean;
  /**
   * Platforms that need the RTMP server URL alongside the key. TikTok issues a
   * per-session server URL, so unlike the others it cannot be hard-coded
   * backend-side and has to be collected here. Omitted for every platform
   * whose endpoint takes `{ name, stream_key }` alone.
   */
  serverUrlField?: {
    label: string;
    placeholder: string;
  };
};

// Facebook, Instagram, YouTube and TikTok support the manual-connect flow.
export const MANUAL_CONNECT_CONFIG: Record<string, ManualConnectConfig> = {
  facebook: {
    nameLabel: "Page / profile name",
    namePlaceholder: "e.g. My Facebook Page",
    instruction:
      "Please ensure your profile/page has at least 100 followers to proceed.",
    showLearningCenter: true,
  },
  instagram: {
    nameLabel: "Profile name",
    namePlaceholder: "e.g. my_instagram_handle",
    instruction:
      "Please ensure your Instagram account is a professional account before continuing.",
    showLearningCenter: true,
  },
  youtube: {
    nameLabel: "Channel name",
    namePlaceholder: "e.g. My YouTube Channel",
    instruction:
      "You'll need to request access for your stream key and wait up to 24 hours before you're able to stream.",
    showLearningCenter: true,
  },
  tiktok: {
    nameLabel: "Account name",
    namePlaceholder: "e.g. my_tiktok_handle",
    instruction:
      "TikTok LIVE requires 1,000+ followers. Copy the server URL and stream key from TikTok Live Studio.",
    showLearningCenter: true,
    serverUrlField: {
      label: "Server URL",
      placeholder: "rtmp://...",
    },
  },
};

export const isManualConnectSupported = (channelId?: string | null): boolean =>
  Boolean(channelId && channelId in MANUAL_CONNECT_CONFIG);

/**
 * Each platform has its own manual-connect endpoint. Most take
 * `{ name, stream_key }`; TikTok also needs `rtmp_url`, so the map accepts the
 * superset. `rtmp_url` stays *required* on the TikTok service payload — the
 * adapter below supplies it — rather than making a mandatory field look
 * optional on the service contract.
 */
const MANUAL_CONNECT_SERVICE: Record<
  string,
  (payload: {
    name: string;
    stream_key: string;
    rtmp_url?: string;
  }) => Promise<{ success: boolean; message: string }>
> = {
  facebook: ChannelsService.createManualFacebookDestination,
  instagram: ChannelsService.createManualInstagramDestination,
  youtube: ChannelsService.createManualYoutubeDestination,
  tiktok: ({ name, stream_key, rtmp_url }) =>
    ChannelsService.createManualTikTokDestination({
      name,
      stream_key,
      // Guarded by `serverUrlField` validation before the call is made.
      rtmp_url: rtmp_url ?? "",
    }),
};

type ManualConnectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelItem | null;
  onConnected?: () => void;
};

export function ManualConnectModal({
  open,
  onOpenChange,
  channel,
  onConnected,
}: ManualConnectModalProps) {
  const config = channel ? MANUAL_CONNECT_CONFIG[channel.id] : undefined;
  const [name, setName] = React.useState("");
  const [streamKey, setStreamKey] = React.useState("");
  const [serverUrl, setServerUrl] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setStreamKey("");
      setServerUrl("");
      setIsSaving(false);
    }
  }, [open]);

  if (!channel || !config) {
    return null;
  }

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedKey = streamKey.trim();

    if (!trimmedName) {
      toast.error(`Enter a ${config.nameLabel.toLowerCase()}.`);
      return;
    }
    if (!trimmedKey) {
      toast.error("Enter a stream key.");
      return;
    }

    const trimmedServerUrl = serverUrl.trim();
    if (config.serverUrlField && !trimmedServerUrl) {
      toast.error(`Enter a ${config.serverUrlField.label.toLowerCase()}.`);
      return;
    }

    const connect = MANUAL_CONNECT_SERVICE[channel.id];
    if (!connect) {
      toast.error("Manual connect is not available for this platform.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await connect({
        name: trimmedName,
        stream_key: trimmedKey,
        // Only sent by platforms that ask for it; the others' endpoints would
        // reject an unexpected field.
        ...(config.serverUrlField ? { rtmp_url: trimmedServerUrl } : {}),
      });

      if (response.success) {
        toast.success(
          response.message || `${channel.name} connected successfully`,
        );
        onConnected?.();
        onOpenChange(false);
        return;
      }

      toast.error(response.message || "Unable to connect destination.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to connect destination."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Manually connect ${channel.name}`}
      subtitle="Add your account details to start streaming through FlowCasta."
      size="md"
      showBrandGlow
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button variant="brand" onClick={handleSave} disabled={isSaving}>
            <Link2 size={14} />
            {isSaving ? "Connecting..." : `Connect ${channel.name}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Platform header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)]">
            {channel.imageUrl ? (
              <Image
                src={channel.imageUrl}
                alt={`${channel.name} logo`}
                width={28}
                height={28}
                className="h-6 w-6 object-contain"
              />
            ) : (
              <span className="text-sm font-semibold text-[var(--brand)]">
                {channel.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {channel.name}
            </p>
            <Badge variant="brand" className="mt-1 px-2 py-0.5 text-[10px]">
              Manual connect
            </Badge>
          </div>
        </div>

        {/* Per-platform instruction */}
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
          {config.showLearningCenter ? (
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
          )}
          <p className="text-xs text-[var(--text-secondary)]">
            {config.instruction}
          </p>
        </div>

        {/* Inputs */}
        <div className="grid gap-3">
          <Input
            label={config.nameLabel}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={config.namePlaceholder}
            autoComplete="off"
          />
          {/* Ordered server URL → key, matching how the platforms that need
              both present them. */}
          {config.serverUrlField ? (
            <Input
              label={config.serverUrlField.label}
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              placeholder={config.serverUrlField.placeholder}
              autoComplete="off"
            />
          ) : null}
          <Input
            label="Stream key"
            value={streamKey}
            onChange={(event) => setStreamKey(event.target.value)}
            placeholder="Paste the stream key from the platform"
            autoComplete="off"
          />
        </div>

        {/* Learning-center prompt (YouTube) */}
        {config.showLearningCenter ? (
          <button
            type="button"
            onClick={() =>
              window.open(LEARNING_CENTER_URL, "_blank", "noopener,noreferrer")
            }
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--brand)] hover:opacity-80"
          >
            <BookOpen size={14} />
            Learn how to get your stream key
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
```

<sub>298 lines</sub>

#### `app/integrations/[channel]/select/page.tsx`

```tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CHANNELS_LIST } from "@/lib/constants";

// Message the opener (the /channels page) listens for to close its modal and refresh.
const INTEGRATION_CONNECTED_MESSAGE = "flowcasta:integration-connected";

export default function IntegrationSelectPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const channelParam = params?.channel;
  const channelId = Array.isArray(channelParam)
    ? channelParam[0]
    : channelParam;
  const workspaceId = searchParams.get("workspace_id");
  const isErrorMsg = searchParams.get("error");

  const channel = React.useMemo(
    () => CHANNELS_LIST.find((item) => item.id === channelId) ?? null,
    [channelId],
  );

  const channelName =
    channel?.name ??
    (channelId
      ? channelId.charAt(0).toUpperCase() + channelId.slice(1)
      : "your account");

  const handleCloseWindow = React.useCallback(() => {
    // Tell the opener (main /channels window) we connected so it can close the
    // modal and refresh. Guarded against a missing/closed opener.
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: INTEGRATION_CONNECTED_MESSAGE,
            channel: channelId ?? null,
            workspaceId: workspaceId ?? null,
          },
          window.location.origin,
        );
      }
    } catch {
      // Cross-origin or detached opener — nothing we can do, just close.
    }

    window.close();
  }, [channelId, workspaceId]);

  const handleCloseWindowToUpgrade = React.useCallback(() => {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.location.href = `/upgrade`;
      }
    } catch {}

    window.close();
  }, []);
  if (isErrorMsg) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-4 py-10">
        <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-xl)]">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-500">
            <X className="size-9 text-red-200" />
          </div>
          <div className="mt-5 flex items-center justify-center gap-2">
            {channel?.imageUrl ? (
              <Image
                src={channel.imageUrl}
                alt={`${channelName} logo`}
                width={28}
                height={28}
                className="size-7 object-contain"
              />
            ) : null}
            <h1 className="font-display text-xl font-semibold text-[var(--text-primary)]">
              {channelName} Connection Failed
            </h1>
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            There was an error connecting your {channelName} account.{" "}
            {isErrorMsg} Click on the button below to close this window and
            return to FlowCasta to upgrade your account or try again.
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-7 w-full"
            onClick={handleCloseWindowToUpgrade}
          >
            Close window
          </Button>

          <p className="mt-4 text-xs text-[var(--text-muted)]">
            If this window does not close automatically, you can close it
            manually.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-4 py-10">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-xl)]">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--success-muted)]">
          <CheckCircle2 className="size-9 text-[var(--success)]" />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {channel?.imageUrl ? (
            <Image
              src={channel.imageUrl}
              alt={`${channelName} logo`}
              width={28}
              height={28}
              className="size-7 object-contain"
            />
          ) : null}
          <h1 className="font-display text-xl font-semibold text-[var(--text-primary)]">
            {channelName} connected
          </h1>
        </div>

        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Your {channelName} account was connected successfully. You can close
          this window and return to FlowCasta to start streaming.
        </p>

        <Button
          type="button"
          size="lg"
          className="mt-7 w-full"
          onClick={handleCloseWindow}
        >
          Close window
        </Button>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          If this window does not close automatically, you can close it
          manually.
        </p>
      </div>
    </main>
  );
}
```

<sub>152 lines</sub>

#### `app/(dashboard)/channels/[channel]/page.tsx`

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  KeyRound,
  Loader2,
  RefreshCcw,
  Trash,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toast } from "@/lib/toast";
import { getErrorMessage, getInitialsFromName } from "@/lib/utils";
import {
  getDestinationDetail,
  getDestinationHandle,
  getDestinationImage,
  getFacebookEntityType,
} from "@/lib/destinations";
import { ConnectChannelModal } from "@/components/channels/ConnectChannelModal";
import {
  ManualConnectModal,
  isManualConnectSupported,
} from "@/components/channels/ManualConnectModal";
import { useChannelConnectVisibility } from "@/lib/channelConnectAccess";
import {
  DeleteChannelModal,
  findLinkedProjects,
  type LinkedProject,
} from "@/components/channels/DeleteChannelModal";
import { UnlinkRequiredModal } from "@/components/channels/UnlinkRequiredModal";
import { UpdateStreamKeyModal } from "@/components/channels/UpdateStreamKeyModal";
import { CHANNELS_LIST } from "@/lib/constants";
import ChannelsService from "@/services/Channels";
import type { Destination } from "@/types/types";

type DestinationRecord = Destination & Record<string, unknown>;

type StatusBadge = {
  label: string;
  variant: "success" | "warning" | "danger" | "default";
};

const getStatusBadge = (destination: Destination): StatusBadge => {
  if (destination.needs_reconnection) {
    return { label: "Update stream key", variant: "warning" };
  }
  if (destination.is_valid) {
    return { label: "Connected", variant: "success" };
  }
  return { label: "Needs setup", variant: "danger" };
};

const formatAddedAt = (value: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
};

const matchesChannel = (
  destination: DestinationRecord,
  channelId: string,
  channelName?: string,
): boolean => {
  const type = String(destination.type ?? "").toLowerCase();
  if (type === channelId.toLowerCase()) {
    return true;
  }

  if (channelId === "rtmp" && type === "rtmp") {
    return true;
  }

  if (channelName && type === channelName.toLowerCase()) {
    return true;
  }

  const record = destination as Record<string, unknown>;
  const fallbackHaystack = [
    record.platform,
    record.provider,
    record.service,
    record.channel,
    record.destination,
    record.name,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return fallbackHaystack.some((value) =>
    value.includes(channelId.toLowerCase()),
  );
};

export default function ChannelConnectionsPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = Array.isArray(params.channel)
    ? params.channel[0]
    : params.channel;
  const channel = CHANNELS_LIST.find((item) => item.id === channelId);

  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const connectVisibilityFor = useChannelConnectVisibility();
  const { showOAuth, showManual } = connectVisibilityFor(channel?.id ?? "");
  // Role/override rules only apply to manual-supported platforms (Facebook/
  // YouTube/Instagram/TikTok); every other channel always shows the OAuth
  // connect button.
  const manualSupported = channel
    ? isManualConnectSupported(channel.id)
    : false;
  const oauthVisible = manualSupported ? showOAuth : true;
  const manualVisible = manualSupported && showManual;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingDestination, setDeletingDestination] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [linkedProjects, setLinkedProjects] = useState<LinkedProject[]>([]);
  const [blockedDestinationId, setBlockedDestinationId] = useState<
    number | null
  >(null);
  const [blockedDestinationName, setBlockedDestinationName] = useState("");
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [streamKeyModalOpen, setStreamKeyModalOpen] = useState(false);
  const [streamKeyDestination, setStreamKeyDestination] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Clicking delete first checks whether the destination is linked to any
  // project. If so, prompt to unlink first; otherwise open the confirm modal.
  const handleRequestDelete = useCallback(async (id: number, name: string) => {
    setCheckingId(String(id));
    try {
      const linked = await findLinkedProjects(id);
      if (linked.length > 0) {
        setLinkedProjects(linked);
        setBlockedDestinationId(id);
        setBlockedDestinationName(name);
        setUnlinkModalOpen(true);
        return;
      }
      setDeletingDestination({ id, name });
      setDeleteModalOpen(true);
    } catch {
      // Lookup failed — fall back to the confirm modal.
      setDeletingDestination({ id, name });
      setDeleteModalOpen(true);
    } finally {
      setCheckingId(null);
    }
  }, []);

  const loadDestinations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ChannelsService.getDestinations();
      if (response.data) {
        setDestinations(
          (response.data?.destinations ?? []) as DestinationRecord[],
        );
      }
    } catch (err) {
      console.error("Failed to load destinations", err);
      setError("Unable to load destinations right now.");
      const message = getErrorMessage(err);
      toast.error(`Failed to load destinations: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDestinations();
  }, [loadDestinations]);

  const displayedDestinations = useMemo(() => {
    const matching = destinations.filter((destination) =>
      channelId ? matchesChannel(destination, channelId, channel?.name) : true,
    );

    return matching as Destination[];
  }, [channel, channelId, destinations]);

  return (
    <section className="px-6 pt-8 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-9 p-0"
            onClick={() => router.push("/channels")}
          >
            <ArrowLeft size={16} />
          </Button>
          {channel?.imageUrl ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)]">
              <Image
                src={channel.imageUrl}
                alt={`${channel.name} logo`}
                width={32}
                height={32}
                className="h-7 w-7 object-contain"
              />
            </div>
          ) : null}
          <div>
            <span className="overline">Connections</span>
            <p className="mt-1 text-display-sm text-[var(--text-primary)]">
              {channel?.name ?? "Channel"} destinations
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Review connected accounts and manage destinations.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            data-tour="detail-stream-key-help"
            className="gap-1.5"
            onClick={() =>
              window.open(
                "https://www.flowcasta.com/support/platforms",
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <BookOpen size={16} />
            How to add a stream key
          </Button>
          {manualVisible ? (
            <Button
              type="button"
              variant="outline"
              data-tour="detail-manual-connect"
              onClick={() => setManualModalOpen(true)}
            >
              Manual connect
            </Button>
          ) : null}
          {oauthVisible ? (
            <Button
              type="button"
              variant="secondary"
              data-tour="detail-connect"
              onClick={() => {
                if (!channel?.connectionMode) {
                  return;
                }
                setIsModalOpen(true);
                setAutoConnect(true);
              }}
              disabled={!channel?.connectionMode}
            >
              {channel?.connectionMode ? "Connect channel" : "Coming soon"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-9 p-0"
            onClick={() => void loadDestinations()}
          >
            <RefreshCcw size={16} />
          </Button>
        </div>
      </div>
      <div className="mt-6" data-tour="detail-destinations">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Connected destinations
            </p>
            <Badge variant="brand">{displayedDestinations.length}</Badge>
          </div>
        </div>

        {isLoading ? (
          <Card className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">
            Loading destinations...
          </Card>
        ) : error ? (
          <Card className="px-5 py-10 text-center text-sm text-[var(--danger)]">
            {error}
          </Card>
        ) : displayedDestinations.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            {channel?.imageUrl ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)]">
                <Image
                  src={channel.imageUrl}
                  alt={`${channel.name} logo`}
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </div>
            ) : null}
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No {channel?.name ?? "channel"} destinations connected
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {channel?.connectionMode
                  ? `Connect your ${channel?.name ?? "channel"} account to start streaming to it.`
                  : `${channel?.name ?? "This channel"} connections are coming soon.`}
              </p>
            </div>
            {channel?.connectionMode ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {oauthVisible ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsModalOpen(true);
                      setAutoConnect(true);
                    }}
                  >
                    Connect {channel?.name}
                  </Button>
                ) : null}
                {manualVisible ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setManualModalOpen(true)}
                  >
                    Manual connect
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Card>
        ) : (
          <div className="grid gap-4 @2xl/app:grid-cols-2 @7xl/app:grid-cols-3">
            {displayedDestinations.map((destination) => {
              const platform = CHANNELS_LIST.find(
                (item) =>
                  item.destinationType === destination.type ||
                  item.id === destination.type,
              );
              const image = getDestinationImage(destination);
              const handle = getDestinationHandle(destination);
              const detail = getDestinationDetail(destination);
              const fbEntity = getFacebookEntityType(destination);
              const status = getStatusBadge(destination);
              // Stream key is irrelevant for OAuth-only platforms that don't
              // expose an RTMP stream key (LinkedIn). Instagram supports a
              // manually set stream key.
              const noStreamKeyPlatforms = new Set(["linkedin"]);
              const isStreaming =
                destination.category === "streaming" &&
                !noStreamKeyPlatforms.has(
                  String(destination.type ?? "").toLowerCase(),
                );
              const isChecking = checkingId === String(destination.id);
              const subtitle =
                [handle, detail].filter(Boolean).join(" · ") ||
                platform?.name ||
                destination.type;

              return (
                <Card
                  key={destination.id}
                  hoverable
                  className="flex flex-col gap-4 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar className="size-12 border border-[var(--border)]">
                        {image ? (
                          <AvatarImage src={image} alt={destination.name} />
                        ) : null}
                        <AvatarFallback>
                          {getInitialsFromName(destination.name, null)}
                        </AvatarFallback>
                      </Avatar>
                      {platform?.imageUrl ? (
                        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)]">
                          <Image
                            src={platform.imageUrl}
                            alt={platform.name}
                            width={14}
                            height={14}
                            className="size-3.5 object-contain"
                          />
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-semibold text-[var(--text-primary)]">
                          {destination.name}
                        </p>
                        {fbEntity ? (
                          <Badge variant="default" className="capitalize">
                            {fbEntity}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                        {subtitle}
                      </p>
                      <div className="mt-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
                    <span className="text-xs text-[var(--text-muted)]">
                      ID {destination.id} ·{" "}
                      {formatAddedAt(destination.created_at)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isStreaming ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          data-tour="detail-stream-key-update"
                          className="gap-1.5"
                          onClick={() => {
                            setStreamKeyDestination({
                              id: destination.id,
                              name: destination.name,
                            });
                            setStreamKeyModalOpen(true);
                          }}
                        >
                          <KeyRound size={14} />
                          Stream key
                        </Button>
                      ) : null}
                      {isChecking ? (
                        <Loader2
                          size={16}
                          className="animate-spin text-[var(--text-muted)]"
                        />
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-[var(--danger)] hover:text-[var(--danger-hover)]"
                          aria-label={`Delete ${destination.name}`}
                          onClick={() => {
                            if (checkingId) return;
                            void handleRequestDelete(
                              destination.id,
                              destination.name,
                            );
                          }}
                        >
                          <Trash size={15} />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <ConnectChannelModal
        open={isModalOpen}
        onOpenChange={(nextOpen) => {
          setIsModalOpen(nextOpen);
          if (!nextOpen) {
            setAutoConnect(false);
          }
        }}
        channel={channel ?? null}
        autoConnect={autoConnect}
        onConnected={() => void loadDestinations()}
      />
      <ManualConnectModal
        open={manualModalOpen}
        onOpenChange={setManualModalOpen}
        channel={channel ?? null}
        onConnected={() => void loadDestinations()}
      />
      <DeleteChannelModal
        open={deleteModalOpen}
        onOpenChange={(nextOpen) => {
          setDeleteModalOpen(nextOpen);
          if (!nextOpen) {
            setDeletingDestination(null);
          }
        }}
        destinationId={deletingDestination?.id ?? null}
        destinationName={deletingDestination?.name ?? ""}
        onDeleted={() => void loadDestinations()}
        onBlockedByProjects={(projects, name) => {
          setLinkedProjects(projects);
          setBlockedDestinationId(deletingDestination?.id ?? null);
          setBlockedDestinationName(name);
          setUnlinkModalOpen(true);
        }}
      />
      <UnlinkRequiredModal
        open={unlinkModalOpen}
        onOpenChange={(nextOpen) => {
          setUnlinkModalOpen(nextOpen);
          if (!nextOpen) {
            setLinkedProjects([]);
            setBlockedDestinationId(null);
            setBlockedDestinationName("");
          }
        }}
        destinationId={blockedDestinationId}
        destinationName={blockedDestinationName}
        projects={linkedProjects}
        onUnlinked={() => void loadDestinations()}
      />
      <UpdateStreamKeyModal
        open={streamKeyModalOpen}
        onOpenChange={(nextOpen) => {
          setStreamKeyModalOpen(nextOpen);
          if (!nextOpen) {
            setStreamKeyDestination(null);
          }
        }}
        destinationId={streamKeyDestination?.id ?? null}
        destinationName={streamKeyDestination?.name ?? ""}
        onUpdated={() => void loadDestinations()}
      />
    </section>
  );
}
```

<sub>558 lines</sub>

#### `components/channels/UpdateStreamKeyModal.tsx`

```tsx
"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import ChannelsService from "@/services/Channels";
import type { Destination } from "@/types/types";

export function UpdateStreamKeyModal({
  open,
  onOpenChange,
  destinationId,
  destinationName,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinationId: number | null;
  destinationName: string;
  onUpdated?: (destination: Destination) => void;
}) {
  const [streamKey, setStreamKey] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStreamKey("");
      setIsSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (destinationId === null) {
      return;
    }

    const trimmed = streamKey.trim();
    if (!trimmed) {
      toast.error("Enter a stream key.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await ChannelsService.updateDestinationStreamKey(
        destinationId,
        { stream_key: trimmed },
      );

      if (response.success) {
        toast.success(response.message || "Destination updated successfully");
        onUpdated?.(response.data);
        onOpenChange(false);
        return;
      }

      toast.error(response.message || "Unable to update stream key.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update stream key."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Update stream key"
      subtitle="Manually set the stream key used to broadcast to this destination."
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button variant="brand" onClick={handleSave} disabled={isSaving}>
            <KeyRound size={14} />
            {isSaving ? "Saving..." : "Save stream key"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">
          Updating the stream key for{" "}
          <span className="font-semibold">{destinationName}</span>.
        </p>
        <Input
          label="Stream key"
          value={streamKey}
          onChange={(event) => setStreamKey(event.target.value)}
          placeholder="live_1410336311_VfoQV3Ts66gbxyYvlyaxcVOfnhw91d"
          autoComplete="off"
        />
      </div>
    </Modal>
  );
}
```

<sub>108 lines</sub>

#### `components/channels/DeleteChannelModal.tsx`

```tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import ChannelsService from "@/services/Channels";
import ProjectService from "@/services/Projects";

export type LinkedProject = { id: number; name: string };

/**
 * Find the projects a destination is currently linked to. Uses the inline
 * `destinations` on each project when the list endpoint returns it, otherwise
 * falls back to per-project destination lookups.
 */
export async function findLinkedProjects(
  destinationId: number,
): Promise<LinkedProject[]> {
  const res = await ProjectService.getProjects();
  const projects = res.data?.projects ?? [];
  if (projects.length === 0) return [];

  const hasInline = projects.some((p) => Array.isArray(p.destinations));
  if (hasInline) {
    return projects
      .filter((p) => p.destinations?.some((d) => d.id === destinationId))
      .map((p) => ({ id: p.id, name: p.name }));
  }

  const results = await Promise.all(
    projects.map(async (p) => {
      try {
        const d = await ProjectService.getProjectDestinations(p.id);
        const linked = (d.data?.destinations ?? []).some(
          (dest) => dest.id === destinationId,
        );
        return linked ? { id: p.id, name: p.name } : null;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((p): p is LinkedProject => p !== null);
}

export function DeleteChannelModal({
  open,
  onOpenChange,
  destinationId,
  destinationName,
  onDeleted,
  onBlockedByProjects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinationId: number | null;
  destinationName: string;
  onDeleted?: () => void;
  /** Called when the destination can't be deleted because projects use it. */
  onBlockedByProjects?: (
    projects: LinkedProject[],
    destinationName: string,
  ) => void;
}) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setIsDeleting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (destinationId === null) {
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading("Disconnecting destination...");

    // On failure, surface a linked-projects prompt if the destination is in
    // use, otherwise show the error message.
    const resolveFailure = async (fallbackMessage: string) => {
      try {
        const linked = await findLinkedProjects(destinationId);
        if (linked.length > 0) {
          toast.dismiss(toastId);
          onBlockedByProjects?.(linked, destinationName);
          onOpenChange(false);
          return;
        }
      } catch {
        // Lookup failed — fall through to the generic error.
      }
      toast.dismiss(toastId);
      toast.error(fallbackMessage);
    };

    try {
      const res = await ChannelsService.deleteDestination(destinationId);
      if (res.success) {
        toast.dismiss(toastId);
        toast.success("Destination disconnected.");
        onDeleted?.();
        onOpenChange(false);
        return;
      }
      await resolveFailure(res.message || "Unable to disconnect destination.");
    } catch (error) {
      await resolveFailure(
        getErrorMessage(error, "Unable to disconnect destination."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Disconnect destination"
      subtitle="This will remove the connection immediately."
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--text-secondary)]">
        You are about to disconnect{" "}
        <span className="font-semibold">{destinationName}</span>. You can
        reconnect at any time.
      </p>
    </Modal>
  );
}
```

<sub>153 lines</sub>

#### `components/channels/UnlinkRequiredModal.tsx`

```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import ProjectService from "@/services/Projects";
import type { LinkedProject } from "@/components/channels/DeleteChannelModal";

/**
 * Shown when a destination can't be disconnected because it's still linked to
 * one or more projects. Lists those projects — each with a link to open it and
 * an "Unlink" button to detach the destination from that project directly.
 */
export function UnlinkRequiredModal({
  open,
  onOpenChange,
  destinationId,
  destinationName,
  projects,
  onUnlinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinationId: number | null;
  destinationName: string;
  projects: LinkedProject[];
  /** Called after a project is successfully unlinked from the destination. */
  onUnlinked?: (projectId: number) => void;
}) {
  // Local copy so unlinked projects drop out of the list immediately. Reset only
  // when the modal (re)opens, so a background re-render can't restore removed
  // rows.
  const [remaining, setRemaining] = React.useState<LinkedProject[]>(projects);
  const [unlinkingId, setUnlinkingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (open) {
      setRemaining(projects);
      setUnlinkingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUnlink = async (project: LinkedProject) => {
    if (destinationId === null) return;

    setUnlinkingId(project.id);
    try {
      const res = await ProjectService.unlinkProjectDestination(
        project.id,
        destinationId,
      );
      if (res.success) {
        toast.success(`Unlinked from "${project.name}".`);
        setRemaining((prev) => prev.filter((p) => p.id !== project.id));
        onUnlinked?.(project.id);
      } else {
        toast.error(res.message || "Unable to unlink destination.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to unlink destination."));
    } finally {
      setUnlinkingId(null);
    }
  };

  const allUnlinked = remaining.length === 0;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Unlink from projects first"
      subtitle="This destination is still in use."
      size="sm"
      footer={
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {allUnlinked ? "Done" : "Close"}
        </Button>
      }
    >
      <div className="space-y-3">
        {allUnlinked ? (
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-semibold">{destinationName}</span> has been
            unlinked from all projects. You can now disconnect it.
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-semibold">{destinationName}</span> is linked to
            the {remaining.length === 1 ? "project" : "projects"} below. Unlink{" "}
            {remaining.length === 1 ? "it" : "each one"} here, or open the project
            to manage its destinations.
          </p>
        )}

        <ul className="space-y-1.5">
          {remaining.map((project) => (
            <li key={project.id} className="flex items-center gap-2">
              <Link
                href={`/studio/${project.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <span className="truncate font-medium">{project.name}</span>
                <ExternalLink size={14} className="shrink-0" />
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleUnlink(project)}
                disabled={unlinkingId !== null || destinationId === null}
                className="shrink-0"
              >
                <Unlink size={14} />
                {unlinkingId === project.id ? "Unlinking..." : "Unlink"}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
```

<sub>127 lines</sub>


---

## 16. Legal pages (Privacy Policy · Terms of Service · Refund Policy)

These are **public** pages (no auth). In Flowcasta they live outside the `(dashboard)` group and are listed in `PUBLIC_PATHS` in `proxy.ts` (`/privacy-policy`, `/terms-of-service`, `/refund-policy`). Keep them public in the new app: OAuth providers (Google/YouTube, Meta, Twitch…) and Paddle review these URLs and must reach them signed out.

**Replication rule for legal copy:** the *structure* and most clauses carry over, because the new app uses the same company, backend, integrations and billing. The *product-specific facts* must be updated. Rebuild the shell UI with the new tokens like every other page.

**Strings to update for the new product**

| What | Flowcasta value | Where |
|---|---|---|
| Product name | "Flowcasta" (Privacy ×8, Terms ×11, Refund ×17, plus each `metadata.description`) | all three pages |
| Product URL | `https://studio.flowcasta.com/` | Privacy, Terms |
| Support email | `support@flowcasta.com` | all three pages |
| Marketing site link | `https://www.flowcasta.com/` ("Back to Home") | `LegalPageShell` |
| Operating company | NETSACH TECH LTD | all three pages. **Keep** if the new product is under the same entity |
| Last updated | Privacy "March 31, 2026" · Refund "May 26, 2026" · Terms has none | `lastUpdated` prop. Set to the new app's publish date (consider adding one to Terms) |
| Refund windows | 14 days (refund period), 7 days | Refund. Confirm against the new product's pricing policy |
| Data retention | 30 days | Privacy |
| Logo | `/assets/flowcasta_new_logo_{dark,light}_nobg.png` | `FullLogo` (overridden by tenant `logo_url` on white-label domains) |

**Sections in each page (keep, update facts)**
- **Privacy:** Consent · Information Collection and Use (OAuth data per platform: Facebook pages, YouTube channels, access tokens for Facebook/Twitch/YouTube) · How We Use Your Data · Data Sharing and Disclosure · Data Retention and Storage · User Rights and Data Control (Google permissions revoke link) · **YouTube API Services** · Service Providers · Links to Other Sites · Children's Privacy · Changes · Contact Us.
- **Terms:** service terms · **Third-Party Platform Compliance** (YouTube ToS link; replaced the older Facebook-specific clause in commit `0c80c61`) · Payment Terms, Refunds, and Upgrade and Downgrade Terms · Disclaimer · Contact Us.
- **Refund:** 1. Refund Policy (+ No Refunds After Initial Period) · 2. Managing Your Subscription and Avoiding Future Billing · 3. Billing Questions and Payment Support · 4. Policy Agreement.

> ⚠️ **Platform compliance:** the YouTube API Services section, the Google permissions revoke link and the Third-Party Platform Compliance clause are **required by Google/YouTube and Meta app review**. If the new app connects the same platforms (§15), keep these clauses and update only the product name and URLs. Update the per-platform data list in Privacy to match the integrations the new app actually enables.

**Shell & typography.** `LegalPageShell` renders a sticky header (logo + Terms/Privacy/Refund/Login links + "Back to Home"), an "overline" label, a title, an optional "Last updated" line and the section stack. It uses Flowcasta's typography utility classes below. Map them to the new app's type scale (`--font-display` / `--font-body` → new fonts). Note the header background is a hard-coded `rgba(10,10,9,0.86)`. Switch it to a token in the new app so light mode and tenant themes work.

#### `app/globals.css` (excerpt: typography utilities)

```css
.overline {
  font-family: var(--font-body), sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.text-display-2xl {
  font-family: var(--font-display), sans-serif;
  font-size: clamp(2.25rem, 4vw, 3.5rem);
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.text-display-xl {
  font-family: var(--font-display), sans-serif;
  font-size: clamp(2rem, 3vw, 2.5rem);
  line-height: 1.05;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.text-display-lg {
  font-family: var(--font-display), sans-serif;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.text-display-md {
  font-family: var(--font-display), sans-serif;
  font-size: 1.5rem;
  line-height: 1.15;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.text-display-sm {
  font-family: var(--font-display), sans-serif;
  font-size: 1.125rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.text-body-lg {
  font-family: var(--font-body), sans-serif;
  font-size: 1rem;
  line-height: 1.6;
}

.text-body-md {
  font-family: var(--font-body), sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
}

.text-body-sm {
  font-family: var(--font-body), sans-serif;
  font-size: 0.8125rem;
  line-height: 1.4;
  letter-spacing: 0.01em;
}

.text-body-xs {
  font-family: var(--font-body), sans-serif;
  font-size: 0.6875rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
}
```

#### `components/legal/LegalPageShell.tsx`

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

import FullLogo from "@/components/layout/FullLogo";

const legalLinks = [
  { href: "/terms-of-service", label: "Terms" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/refund-policy", label: "Refund" },
  { href: "/login", label: "Login" },
];

export function LegalPageShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-(--bg)">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-70 bg-[radial-gradient(circle_at_top,var(--brand-glow-lg),transparent_60%)]" />

      <header className="sticky top-0 z-30 border-b border-(--border) bg-[rgba(10,10,9,0.86)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/terms-of-service" className="inline-flex items-center">
            <FullLogo className="block h-9.5 w-auto" />
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-2 text-body-sm text-(--text-secondary)">
            {legalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-transparent px-3 py-1.5 transition-colors duration-200 hover:border-(--brand-muted) hover:bg-(--brand-muted) hover:text-(--text-primary)"
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://www.flowcasta.com/"
              className="rounded-full bg-(--brand) px-4 py-1.5 font-semibold text-(--text-inverse) transition-colors duration-200 hover:bg-(--brand-hover)"
            >
              Back to Home
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto w-full max-w-4xl px-6 pb-16 pt-12">
          <p className="overline text-(--brand-light)">Legal</p>
          <h1 className="mt-3 text-display-xl text-(--text-primary)">
            {title}
          </h1>
          {lastUpdated ? (
            <p className="mt-3 text-body-sm text-(--text-muted)">
              Last updated: {lastUpdated}
            </p>
          ) : null}

          <div className="mt-10 space-y-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
```

<sub>69 lines</sub>

#### `components/layout/FullLogo.tsx`

> Brand-aware logo: uses the white-label tenant's `logo_url` when present, otherwise the product's theme-specific logo. Also used by the dashboard sidebar/top bar.

```tsx
"use client";
import Image from "next/image";
import * as React from "react";
import { useTheme } from "next-themes";
import { useBrandConfig } from "@/components/providers/BrandProvider";

export default function FullLogo({
  className = "hidden md:block",
}: {
  className?: string | undefined;
}) {
  const { resolvedTheme } = useTheme();
  const { brandConfig } = useBrandConfig();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch: server renders a neutral placeholder until the
  // client knows the resolved theme.
  if (!mounted) {
    return (
      <span
        className={className}
        style={{ width: 200, height: 50, display: "inline-block" }}
        aria-hidden
      />
    );
  }

  // A reseller's logo lives on their own CDN, so it goes through a plain <img>
  // rather than next/image and its per-host allowlist. The box clamps it: an
  // oversized upload scales down instead of stretching the header.
  if (brandConfig.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brandConfig.logo_url}
        alt={brandConfig.brand_name}
        className={`h-10 w-auto max-h-12 max-w-[200px] object-contain object-left ${className}`}
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  const src = isDark
    ? "/assets/flowcasta_new_logo_dark_nobg.png"
    : "/assets/flowcasta_new_logo_light_nobg.png";

  return (
    <Image
      src={src}
      alt={isDark ? "Full_Dark_Logo" : "Full_Light_Logo"}
      width={200}
      height={80}
      className={className}
      style={{ width: "auto", minHeight: 80 }}
    />
  );
}
```

<sub>61 lines</sub>

#### `app/privacy-policy/page.tsx`

```tsx
import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Flowcasta.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="March 31, 2026">
      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Consent to Privacy Policy
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          By using Flowcasta&apos;s services, you agree to the collection and
          use of information as described in this Privacy Policy. You must agree
          to this Privacy Policy before accessing our services.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          Flowcasta is operated by NETSACH TECH LTD and provides browser-based
          live streaming services at https://studio.flowcasta.com/.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Information Collection and Use
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          For a better experience, we may require certain personally
          identifiable information, including but not limited to your name and
          email. This information will be used to contact or identify you.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">We collect:</p>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>
            A list of Facebook pages (with access token) you manage (if granted
            access to your Facebook account).
          </li>
          <li>
            A list of your YouTube channels (with access token) (if granted
            access to your YouTube account).
          </li>
          <li>Your name and email address.</li>
          <li>
            Access tokens for Facebook, Twitch and YouTube to perform actions on
            your behalf, including: creating and scheduling live streams,
            starting and stopping live streams, retrieving information about
            live streams, pulling comments, and creating and removing comments
            from live stream chat.
          </li>
          <li>Data related to your live streams.</li>
        </ul>
        <p className="text-body-md text-[var(--text-secondary)]">
          We use YouTube API Services for YouTube-related functionality
          (specifically live video streaming). By using our service, you agree
          that we access and use your YouTube data in accordance with this
          policy and YouTube&apos;s terms of service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          How We Use Your Data
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>
            Provide our core services of scheduling and hosting live videos on
            your Facebook pages, YouTube channels, and other streaming
            destinations.
          </li>
          <li>Improve and optimize our services.</li>
          <li>Communicate with you about our services.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Data Sharing and Disclosure
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          We do not transfer or disclose your information to third parties for
          purposes other than the ones provided in this policy. We do not sell
          your personal information or Google user data. We do not use Google
          user data for serving advertisements or any purpose other than
          providing our core live streaming services.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          Some of your data may be stored on cloud infrastructure providers
          (such as Google Cloud Platform) solely for the purpose of operating
          our service. These providers act as data processors and do not have
          access to use your data for their own purposes.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          Flowcasta employees or contractors may access your data when necessary
          for debugging or problem-solving purposes. Such access is limited to
          what is required to resolve the issue.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          We may disclose your information only when required by law, such as to
          comply with a subpoena or similar legal process.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Data Retention and Storage
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>
            Authorized Data: We only store and process authorized data (YouTube
            channel information, live stream information and access tokens). We
            do not store or retrieve non-authorized data. Stored for as long as
            you are an active client of Flowcasta, but for no longer than 30
            calendar days without refresh or authorization verified. We refresh
            this data every 30 days or delete it if you revoke access to your
            YouTube, Twitch or Facebook account.
          </li>
          <li>
            Live Stream Data: Real-time data (for example, live stream view
            counts) is retrieved and used in real-time only, not stored on our
            servers. Core functionality data (for example, stream status and
            live comments) is stored as long as necessary for our services, with
            authorization verified every 30 days.
          </li>
        </ul>
        <p className="text-body-md text-[var(--text-secondary)]">
          Data Accuracy: During live streams or when you have scheduled live
          streams through Flowcasta, we periodically check the status of the
          live stream to ensure we display correct information. This is done
          only for active or scheduled live streams. While we make every effort
          to ensure data accuracy and timely updates, the most current data is
          always available through Facebook, Twitch or YouTube&apos;s own
          services.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          User-Initiated Data Deletion: You can request deletion of your stored
          data at any time by contacting us at support@flowcasta.com or through
          our live chat. Upon receiving such a request, we will delete your data
          as soon as possible and within 7 calendar days. This deletion only
          affects data stored by Flowcasta and does not impact data stored by
          YouTube or other streaming platforms.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          Account Deletion: If you delete your account from our service, we will
          also delete all user data we have stored related to your account as
          soon as possible and within 7 calendar days.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          We store your data securely on encrypted cloud servers in the United
          States, using industry-standard security measures including strict
          access controls, encryption at rest, and internal security audits.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          User Rights and Data Control
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>Access your personal data.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your data.</li>
          <li>Revoke access to your YouTube, Twitch or Facebook account.</li>
        </ul>
        <p className="text-body-md text-[var(--text-secondary)]">
          To exercise these rights, contact us at support@flowcasta.com or
          through our live chat. To revoke Flowcasta&apos;s access to your
          YouTube data, visit
          https://security.google.com/settings/security/permissions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          YouTube API Services
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          We use YouTube API Services. By using our service, you are also bound
          by Google&apos;s Privacy Policy and YouTube Terms of Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">Log Data</h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          Whenever you visit our Service, we collect information that your
          browser sends to us that is called Log Data. This Log Data may include
          information such as your computer&apos;s Internet Protocol (IP)
          address, browser version, pages of our Service that you visit, the
          time and date of your visit, the time spent on those pages, and other
          statistics.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Service Providers
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          We may employ third-party companies and individuals to facilitate our
          Service, perform Service-related services, or assist in analyzing
          Service usage. These third parties have access to your Personal
          Information to perform tasks on our behalf but are obligated not to
          disclose or use it for other purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">Security</h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          We strive to protect your Personal Information using commercially
          acceptable means. However, no method of internet transmission or
          electronic storage is 100% secure and reliable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Links to Other Sites
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          Our Service may contain links to external sites not operated by us. We
          advise reviewing their Privacy Policies and assume no responsibility
          for their content or practices.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Children&apos;s Privacy
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          Our Services do not address anyone under 13. We do not knowingly
          collect personal information from children under 13. If we discover
          such collection, we will delete it immediately. Parents aware of their
          child providing us personal information should contact us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Changes to This Privacy Policy
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          We may update our Privacy Policy periodically. We advise reviewing
          this page for changes. Changes are effective immediately upon posting.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Contact Us
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          For questions, suggestions, or complaints about our privacy practices,
          please contact us at support@flowcasta.com.
        </p>
      </section>
    </LegalPageShell>
  );
}
```

<sub>265 lines</sub>

#### `app/terms-of-service/page.tsx`

```tsx
import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for Flowcasta.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service">
      <section className="space-y-3">
        <p className="text-body-md text-[var(--text-secondary)]">
          These terms and conditions outline the rules and regulations for the
          use of Flowcasta&apos;s website. Flowcasta is operated by NETSACH TECH
          LTD and is available at https://studio.flowcasta.com/.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          By accessing this website we assume you accept these terms and
          conditions in full. Do not continue to use Flowcasta&apos;s website if
          you do not accept all of the terms and conditions stated on this page.
        </p>
      </section>

      <section className="space-y-3">
        <p className="text-body-md text-[var(--text-secondary)]">
          The following terminology applies to these Terms and Conditions,
          Privacy Statement and Disclaimer Notice and any or all Agreements:
          &quot;Client&quot;, &quot;You&quot; and &quot;Your&quot; refers to
          you, the person accessing this website and accepting the
          Company&apos;s terms and conditions. &quot;The Company&quot;,
          &quot;Ourselves&quot;, &quot;We&quot;, &quot;Our&quot; and
          &quot;Us&quot;, refers to our Company. &quot;Party&quot;,
          &quot;Parties&quot;, or &quot;Us&quot; refers to both the Client and
          ourselves, or either the Client or ourselves. All terms refer to the
          offer, acceptance and consideration of payment necessary to undertake
          the process of our assistance to the Client in the most appropriate
          manner, whether by formal meetings of a fixed duration, or any other
          means, for the express purpose of meeting the Client&apos;s needs in
          respect of provision of the Company&apos;s stated services/products,
          in accordance with and subject to prevailing law of your jurisdiction.
          Any use of the above terminology or other words in the singular,
          plural, capitalization and/or he/she or they, are taken as
          interchangeable and therefore as referring to same.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">General</h2>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>
            We are not responsible for video content you stream; we just provide
            the tool.
          </li>
        </ul>
        <p className="text-body-md text-[var(--text-secondary)]">
          By using Flowcasta&apos;s website for publishing live videos to
          YouTube you are agreeing to be bound by the YouTube Terms of Service
          https://www.youtube.com/t/terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Third-Party Platform Compliance
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          FlowCasta provides integrations with third-party platforms that may
          have their own terms, policies, technical requirements, and content
          restrictions. These requirements may change from time to time.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          Users are responsible for ensuring that their content and activities
          comply with the applicable policies of the platforms to which they
          publish or stream. FlowCasta may restrict, disable, modify, or remove
          features, templates, destinations, or publishing options where
          necessary to comply with third-party platform requirements or
          applicable law.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          FlowCasta may also provide warnings or other safeguards where
          particular content, templates, or functionality may not be supported
          or permitted by a destination platform. Users must not use FlowCasta
          to circumvent or knowingly violate the policies or technical
          restrictions of third-party platforms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Payment Terms, Refunds, and Upgrade and Downgrade Terms
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          The fees for your Plan are billed in advance and automatically renew
          on a monthly or annual basis, as specified in your Plan.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>
            Monthly subscription plans are refundable up to 1 month of prior
            service in cases where there were issues with the services we
            provide or the user forgot to cancel the subscription. Annual
            subscription plans are not refundable.
          </li>
          <li>
            Subscription plans purchased with a discount or promotional price
            are not refundable.
          </li>
          <li>
            If you downgrade your Plan level, your credit card will
            automatically be charged the new rate beginning with your next
            billing cycle.
          </li>
          <li>
            If you upgrade your Plan level, your credit card will immediately be
            charged a pro-rated amount reflecting the increased rate, and you
            will be charged the full amount of the new rate beginning with your
            next billing cycle.
          </li>
          <li>
            Depending on the payment method, you may be charged an 8.5-9% refund
            fee.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">Cookies</h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          We employ the use of cookies. By using Flowcasta&apos;s website you
          consent to the use of cookies in accordance with Flowcasta&apos;s
          privacy policy.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          Most modern day interactive websites use cookies to enable us to
          retrieve user details for each visit. Cookies are used in some areas
          of our site to enable the functionality of this area and ease of use
          for those people visiting. Some of our affiliate or advertising
          partners may also use cookies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">License</h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          Unless otherwise stated, Flowcasta and/or its licensors own the
          intellectual property rights for all material on Flowcasta. All
          intellectual property rights are reserved. You may view and/or print
          pages from https://studio.flowcasta.com/ for your own personal use
          subject to restrictions set in these terms and conditions.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          You must not:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>Republish material from https://studio.flowcasta.com/</li>
          <li>Sell, rent or sub-license material from Flowcasta</li>
          <li>Reproduce, duplicate or copy material from Flowcasta</li>
          <li>
            Redistribute content from Flowcasta (unless content is specifically
            made for redistribution)
          </li>
        </ul>
        <p className="text-body-md text-[var(--text-secondary)]">
          If you find any link on our website or any linked website
          objectionable for any reason, you may contact us about this. We will
          consider requests to remove links but will have no obligation to do so
          or to respond directly.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          Whilst we endeavor to ensure that the information on this website is
          correct, we do not warrant its completeness or accuracy; nor do we
          commit to ensuring that the website remains available or that the
          material on the website is kept up to date.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Disclaimer
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          To the maximum extent permitted by applicable law, we exclude all
          representations, warranties and conditions relating to our website and
          the use of this website (including, without limitation, any warranties
          implied by law in respect of satisfactory quality, fitness for purpose
          and/or the use of reasonable care and skill). Nothing in this
          disclaimer will:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>Limit or exclude our or your liability for fraud.</li>
          <li>
            Limit any of our or your liabilities in any way that is not
            permitted under applicable law.
          </li>
          <li>
            Exclude any of our or your liabilities that may not be excluded
            under applicable law.
          </li>
        </ul>
        <p className="text-body-md text-[var(--text-secondary)]">
          The limitations and exclusions of liability set out in this Section
          and elsewhere in this disclaimer: (a) are subject to the preceding
          paragraph; and (b) govern all liabilities arising under the disclaimer
          or in relation to the subject matter of this disclaimer, including
          liabilities arising in contract, in tort (including negligence) and
          for breach of statutory duty.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          Contact Us
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          For questions about these terms, contact support@flowcasta.com.
        </p>
      </section>
    </LegalPageShell>
  );
}
```

<sub>221 lines</sub>

#### `app/refund-policy/page.tsx`

```tsx
import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund policy for Flowcasta subscriptions.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPageShell title="Refund Policy" lastUpdated="May 26, 2026">
      <section className="space-y-3">
        <p className="text-body-md text-[var(--text-secondary)]">
          Welcome to Flowcasta! By accessing or using our platform, you agree to
          these Terms of Use. Please read them carefully before using our
          services. If you do not agree with these terms, please do not use our
          services.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          We are committed to helping you manage your live streaming workflow.
          Before you subscribe or make any payment, please take a moment to
          carefully read and understand our Refund Policy.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          This policy is designed to clearly outline your rights,
          responsibilities, and options regarding subscription payments and
          cancellations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          1. Refund Policy
        </h2>
        {/*
              Previous policy (commented out as requested):
              <p className="text-body-md text-[var(--text-secondary)]">
                All payments made to Flowcasta are final and non-refundable.
                Flowcasta does not provide refunds, credits, or reversals for
                any subscription charge, renewal charge, one-time payment, or
                unused portion of service.
              </p>
              <p className="text-body-md text-[var(--text-secondary)]">
                This no-refund policy applies in all situations, including but not
                limited to:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
                <li>Forgetting to cancel your subscription before renewal.</li>
                <li>No longer needing or using the service.</li>
                <li>Changes to your business plans, budget, or priorities.</li>
                <li>Unsatisfactory experience after payment.</li>
                <li>Accidental purchases or duplicate subscriptions.</li>
                <li>Partial use of a billing period.</li>
              </ul>
              <p className="text-body-md text-[var(--text-secondary)]">
                By subscribing to Flowcasta, you acknowledge and agree that all
                charges are final, non-refundable, and non-transferable.
              </p>
            */}
        <p className="text-body-md text-[var(--text-secondary)]">
          Customers are entitled to request a refund within 14 days of initial
          purchase, in accordance with our payment processor&apos;s refund
          policy.
        </p>
        <h3 className="text-display-sm text-[var(--text-primary)]">
          No Refunds After Initial Period
        </h3>
        <p className="text-body-md text-[var(--text-secondary)]">
          Outside of the 14-day initial purchase window, once a subscription
          payment has been successfully processed, Flowcasta does not offer
          refunds. This includes but is not limited to:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>Forgetting to cancel your subscription before renewal.</li>
          <li>No longer needing or using the service.</li>
          <li>Event changes or cancellations.</li>
          <li>Unsatisfactory experience after payment.</li>
          <li>Duplicate subscriptions purchased by the user.</li>
        </ul>
        <p className="text-body-md text-[var(--text-secondary)] font-semibold">
          All payments made to Flowcasta outside the initial 14-day window are
          final, non-refundable, and non-transferable.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          By subscribing to Flowcasta, you acknowledge and accept that all
          processed payments are binding and non-refundable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          2. Managing Your Subscription and Avoiding Future Billing
        </h2>
        {/*
              Previous policy (commented out as requested):
              <p className="text-body-md text-[var(--text-secondary)]">
                You may cancel your subscription at any time through your account
                settings to prevent future renewal charges.
              </p>
            */}
        <p className="text-body-md text-[var(--text-secondary)]">
          You may cancel your subscription at any time through your account
          settings to prevent future renewal charges.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>Cancellation stops future billing only.</li>
          <li>
            To avoid being charged for the next billing cycle, you must cancel
            your subscription before your next renewal date.
          </li>
          <li>
            After canceling, you will continue to have access to your
            subscription benefits until the end of your current paid period, but
            no further charges will be made.
          </li>
          <li>
            It is the user&apos;s sole responsibility to manage and monitor
            their subscription status and billing cycles.
          </li>
        </ul>
        <p className="text-body-md text-[var(--text-secondary)]">
          Flowcasta is not responsible for subscription charges resulting from
          failure to cancel before renewal.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          3. Billing Questions and Payment Support
        </h2>
        {/*
              Previous policy (commented out as requested):
              <p className="text-body-md text-[var(--text-secondary)]">
                Flowcasta does not issue refunds. For card-network disputes or
                payment processor issues, users may also contact their payment
                provider directly in accordance with that provider&apos;s policies.
              </p>
            */}
        <p className="text-body-md text-[var(--text-secondary)]">
          If you believe there is an unauthorized or incorrect charge on your
          account, contact our support team immediately so we can investigate
          the transaction details with you.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          In rare cases where a technical billing error has occurred (such as
          duplicate charges caused by a system issue), you may be eligible for a
          refund review.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>
            You were charged multiple times for the same subscription within the
            same billing cycle.
          </li>
          <li>A billing error caused by Flowcasta&apos;s system.</li>
        </ul>
        <p className="text-body-md text-[var(--text-secondary)]">
          If you believe a technical billing error has occurred, contact us
          within 7 days of the charge at support@flowcasta.com. Each request
          will be reviewed individually, and approved refunds (if any) will be
          issued to your original payment method.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          For billing questions, contact us at support@flowcasta.com.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">
          4. Policy Agreement
        </h2>
        <p className="text-body-md text-[var(--text-secondary)]">
          By purchasing or subscribing to Flowcasta, you acknowledge and agree
          to abide by this Refund Policy. This policy is binding once a payment
          is processed.
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          We strongly encourage you to carefully consider your purchase and
          ensure that Flowcasta meets your needs before subscribing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-display-sm text-[var(--text-primary)]">Summary</h2>
        {/*
              Previous policy (commented out as requested):
              <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
                <li>No refunds are provided under this policy.</li>
                <li>You can cancel anytime to avoid future billing.</li>
                <li>Flowcasta is not responsible for late cancellations.</li>
                <li>All successful charges are final and non-refundable.</li>
                <li>For help, contact us at support@flowcasta.com.</li>
              </ul>
            */}
        <ul className="list-disc space-y-2 pl-6 text-body-md text-[var(--text-secondary)]">
          <li>Refunds are available within 14 days of initial purchase.</li>
          <li>No refunds for renewals or after the initial 14-day period.</li>
          <li>You can cancel anytime to avoid future billing.</li>
          <li>Flowcasta is not responsible for late cancellations.</li>
          <li>
            Only technical billing errors caused by Flowcasta&apos;s system are
            eligible for special review.
          </li>
          <li>For help, contact us at support@flowcasta.com.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <p className="text-body-md text-[var(--text-secondary)]">
          NETSACH TECH LTD
        </p>
        {/* <p className="text-body-md text-[var(--text-secondary)]">
          Address 1: 4 Unity close ada george
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          Port Harcourt 500272, Rivers
        </p> */}
        <p className="text-body-md text-[var(--text-secondary)]">
          Address: 3568 Dodge Street Omaha, NE 68131
        </p>
        <p className="text-body-md text-[var(--text-secondary)]">
          Thank you for trusting Flowcasta. Flowcasta is a fully automated SaaS
          platform. We do not provide human-driven or manually delivered
          services.
        </p>
      </section>
    </LegalPageShell>
  );
}
```

<sub>229 lines</sub>


---

## 17. Porting checklist

- [ ] Map every token in §3 to the new design system (or alias them in `globals.css`). Confirm the brand colour flows through CSS vars, which White Label needs.
- [ ] Port §5 types and §6 foundation unchanged. Replace the `lib/tours` stub if the new app has tours.
- [ ] Port or re-skin the §7 primitives, keeping the props API.
- [ ] Wrap dashboard content in `@container/app` (or convert the container-query classes).
- [ ] Port `proxy.ts` rules for `/admin`, auth and White Label.
- [ ] Settings shell: all four tabs, `?tab=` and `?workspaceModal=create` deep links.
- [ ] Upgrade page: new Paddle price IDs in env. Verify checkout in the sandbox.
- [ ] White Label: set the Vercel env for the **new** project, test add → DNS → auto-verify → resolve on the tenant host → delete.
- [ ] Reseller, Agency (swap the resource kit), Admin.
- [ ] Integrations: register the new app's OAuth callback → `/integrations/:channel/select` with the backend team for each platform. Rename the `postMessage` type on both sides.
- [ ] Replace all "Flowcasta" copy, `flowcasta:` storage/event keys, demo links and help-centre URLs with the new product's.
- [ ] Decide on the known quirks in §4 (profile save, `/subscriptions` link).
- [ ] Legal pages: update the product name, URLs, support email, dates and logo (§16). Keep the platform-compliance clauses. Keep the routes public and register the URLs in each OAuth app and in Paddle.

---

<sub>Embedded files (104): `types/types.ts (subset)`, `services/api/api.ts`, `lib/auth-session.ts`, `lib/tours.ts (trimmed)`, `lib/utils.ts`, `lib/toast.tsx`, `lib/animations.ts`, `lib/plan-core.ts`, `lib/plan.ts`, `lib/subscription.ts`, `lib/white-label-access.ts`, `lib/profile-image.ts`, `stores/workspace-store.ts`, `services/Upload.ts (trimmed)`, `services/Projects.ts (trimmed)`, `components/ui/Button.tsx`, `components/ui/Modal.tsx`, `components/ui/Input.tsx`, `components/ui/Switch.tsx`, `components/ui/Select.tsx`, `components/ui/Badge.tsx`, `components/ui/Card.tsx`, `components/ui/Tabs.tsx`, `components/ui/Tooltip.tsx`, `components/ui/Avatar.tsx`, `components/ui/Toaster.tsx`, `components/ui/PageSkeletons.tsx`, `components/motion/StaggerList.tsx`, `proxy.ts`, `app/(dashboard)/settings/layout.tsx`, `app/(dashboard)/settings/page.tsx`, `services/Worskpaces.ts`, `components/modals/WorkspaceModal.tsx`, `components/modals/ConfirmDeleteWorkspaceModal.tsx`, `services/Teammember.ts`, `services/Subscriptions.ts`, `app/(dashboard)/upgrade/page.tsx`, `providers/PaddleProvider.tsx`, `lib/paddle.ts`, `lib/paddle-config.ts`, `components/marketing-assets/useWhiteLabelAccess.ts`, `services/CustomDomain.ts`, `config/brand.ts`, `components/modals/ConfigureWhiteLabelModal.tsx`, `components/modals/WhiteLabelUpgradeModal.tsx`, `app/(dashboard)/workspaces/[id]/page.tsx`, `components/modals/DnsDomainRecordModal.tsx`, `components/modals/ConfirmDeleteDomainModal.tsx`, `app/api/custom-domains/route.ts`, `app/api/custom-domains/[domain]/route.ts`, `app/api/custom-domains/[domain]/config/route.ts`, `components/providers/BrandProvider.tsx`, `components/providers/BrandGate.tsx`, `app/(dashboard)/resellers/layout.tsx`, `app/(dashboard)/resellers/page.tsx`, `components/modals/AddResellerModal.tsx`, `services/Reseller.ts`, `app/(dashboard)/agency/page.tsx`, `app/admin/page.tsx`, `app/admin/loading.tsx`, `app/admin/(dashboard)/layout.tsx`, `app/admin/(dashboard)/loading.tsx`, `components/admin/admin-dashboard-shell.tsx`, `components/admin/admin-sidebar.tsx`, `components/admin/admin-header.tsx`, `app/admin/(dashboard)/user-management/page.tsx`, `components/admin/user-management/user-stats.tsx`, `components/admin/user-management/users-table.tsx`, `components/admin/user-management/add-user-modal.tsx`, `components/admin/user-management/edit-user-modal.tsx`, `components/admin/user-management/license-details-modal.tsx`, `components/admin/user-management/add-credits-modal.tsx`, `components/admin/user-management/update-credits-modal.tsx`, `app/admin/(dashboard)/statistics/page.tsx`, `components/admin/statistics/statistics-cards.tsx`, `app/admin/(dashboard)/marketing/page.tsx`, `components/admin/marketing/create-campaign-form.tsx`, `components/admin/marketing/marketing-editor.tsx`, `components/admin/marketing/marketing-campaign-table.tsx`, `services/Admin.ts`, `services/Credits.ts`, `services/EmailMarketing.ts`, `lib/constants.ts (trimmed)`, `services/Channels.ts`, `lib/channelConnectAccess.ts`, `lib/destinations.ts`, `app/(dashboard)/channels/page.tsx`, `components/channels/ChannelsHeader.tsx`, `components/demo/WatchDemoButton.tsx`, `components/channels/ChannelsGrid.tsx`, `components/channels/ChannelCard.tsx`, `components/channels/ConnectChannelModal.tsx`, `components/channels/ManualConnectModal.tsx`, `app/integrations/[channel]/select/page.tsx`, `app/(dashboard)/channels/[channel]/page.tsx`, `components/channels/UpdateStreamKeyModal.tsx`, `components/channels/DeleteChannelModal.tsx`, `components/channels/UnlinkRequiredModal.tsx`, `app/globals.css (typography utilities excerpt)`, `components/legal/LegalPageShell.tsx`, `components/layout/FullLogo.tsx`, `app/privacy-policy/page.tsx`, `app/terms-of-service/page.tsx`, `app/refund-policy/page.tsx`</sub>
