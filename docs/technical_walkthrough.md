# Rankoya: technical walkthrough

**Branch:** `feat/backend-wiring` · **Updated:** 2026-10-14
**API contract:** `docs/backend/docs/openapi.yaml` (gitignored, local only; open `docs/backend/docs/index.html` for Swagger UI). 90 operations.

This guide follows a user through the app screen by screen. For each screen it lists the backend endpoints called, what triggers each call, and what has no endpoint yet. Use it to run a demo, to check what is integrated, and to test.

**Rule since 2026-10-14: live data only.** No screen shows mock, demo or sample values. When the API returns nothing, the screen shows 0 or an empty state. Features with no endpoint are hidden or marked "coming soon", never faked.

**Legend**

| Mark | Meaning |
|---|---|
| ✅ **Live** | Calls the real backend |
| 🟡 **Partial** | Live, but part of it has no endpoint yet (kept in the browser or not saved) |
| ⛔ **No endpoint** | Hidden, marked "coming soon", or replaced by an email to support |

---

## 0. How requests work

### Client and config

- **HTTP client:** axios in [`src/services/api/api.ts`](../src/services/api/api.ts). Each endpoint wrapper lives in `src/services/<area>.ts`, and screens call them through React Query hooks in `src/features/<area>/hooks.ts`.
- **Base URL:** `NEXT_PUBLIC_API_BASE_URL`, including the `/api` prefix (for example `http://127.0.0.1:8001/api`). If it is unset, every request is rejected with `ERR_API_NOT_CONFIGURED` and nobody can sign in.
- **Headers on every request:** `Accept: application/json`, `Content-Type: application/json`, and `Authorization: Bearer <authToken cookie>`.
- **Timeouts:** 60 s by default. LLM, SERP, crawl and DataForSEO calls use `LONG_REQUEST_TIMEOUT_MS` (5 min). These calls are **synchronous on the backend**, so a spinner running for a minute or more is expected.
- **Site scoping:** site endpoints are built with `sitePath(siteId, "...")`, which gives `/sites/{site}/...`. The backend resolves the **active workspace from the token**, and a site outside that workspace returns 404.
- **401 handling:** any 401 except on `/login` and `/register` clears the session cookies and fires `rankoya:session-expired`, which sends the user back to sign-in.
- **Paid calls:** live backlink metrics, the backlinks list and competitor prospects call DataForSEO, which bills per call. The UI only makes these calls when the user asks (a confirm dialog or a Load button), and shows the cost and a "Sandbox data" badge when the backend reports them.

### Session, browser storage and route guard

| Where | Key | What it holds |
|---|---|---|
| Cookie | `authToken` | Sanctum bearer token from `POST /login` → `data.token` |
| Cookie | `authUser` | Trimmed user JSON (name, role, active workspace, subscriptions). Name and email are refreshed from `GET /me` on load |
| localStorage | `rankoya:login-workspaces` | **Temporary:** the workspaces from the login response, used while `GET /workspace` returns 404 |
| localStorage | `rankoya:setup-progress` | Furthest setup step reached, per site. `null` means setup is finished |
| localStorage | `rankoya:site-setup` | Setup draft per site: crawl run id, description, audience, topics, preferences |
| localStorage | `rankoya:crawl-runs` | Newest crawl run id per site (there is no "latest crawl" endpoint) |
| sessionStorage | `rankoya:gsc-pending` | Site and return path held across the Google OAuth redirect |
| sessionStorage | `rankoya:wpcom-pending` | Site and return path held across the WordPress.com OAuth redirect |

[`src/proxy.ts`](../src/proxy.ts) (Next 16's replacement for middleware):
- A visitor with no `authToken` cookie is redirected to `/sign-in?next=<path>`.
- A signed-in user who opens `/sign-in` or `/sign-up` is redirected to `/`.
- `/admin/**` requires the `authUser` cookie to claim the admin role. This only shapes navigation; the backend enforces access.
- On white-label hosts, the legal pages are hidden.

### Testing setup (applies to every section)

1. Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`, then run `npm run dev`.
2. Open DevTools → **Network** and filter by `/api/` (or by your API host). Each step below names the request to look for.
3. Watch **Application → Cookies / Local Storage** for the keys above.
4. To reset a user's state: clear cookies, clear localStorage, and reload.
5. To call an endpoint directly, copy `authToken` from the cookies and use it in Swagger UI (**Authorize**, without the `Bearer ` prefix) or in curl:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" "$API/sites"
   ```

---

## 1. Authentication

| Screen / action | Endpoint | Status | Notes |
|---|---|---|---|
| `/sign-in`: submit | `POST /login` | ✅ | Writes `authToken` and `authUser` and stores the workspaces. Lands on `/sites`, or on `?next=` |
| `/sign-up`: submit | `POST /register` | ✅ | Signs the user in straight away |
| `/sign-up`: workspace name | `POST /workspace/store` (multipart) | ✅ | First workspace (`is_default: 1`), then `/sites/new` |
| Every app load | `GET /me` | ✅ | Confirms the token (a 401 signs out) and refreshes name and email in `authUser` |
| Profile menu: **Sign out** | `POST /logout` | ✅ | Best effort; cookies are cleared either way |
| "Continue with Google" | none | ⛔ | Shows "unavailable" |
| `/forgot-password` | none | ⛔ | Opens an email to support with the reset request (tenant's support address on white-label domains) |
| `/verify` | none | ⛔ | Redirects to `/sign-in` (no email-code endpoint) |

**Test:** sign up with a new email and confirm `register` and `workspace/store` return 2xx and you land on `/sites/new`. Reload any page and look for `GET /me`. Delete `authToken` and open an app page: you should land on `/sign-in?next=…`.

---

## 2. Workspaces and the sites list (`/sites`)

| Action | Endpoint | Status | Notes |
|---|---|---|---|
| Workspace list and active workspace | `GET /workspace` | 🟡 | **Returns 404 today.** Falls back to `rankoya:login-workspaces` |
| Sites in the active workspace | `GET /sites` | ✅ | |
| Site card: clusters covered | `GET /sites/{site}/topical-maps` | ✅ | One call per card |
| Site card: AI visibility score | `GET /sites/{site}/ai-visibility/overview` | ✅ | 0 before the first scan |
| Switch workspace (top bar, ⌘K, setup) | `POST /workspaces/{id}` | ✅ | Clears the query cache, then `/sites` |
| Create workspace | `POST /workspace/store` | ✅ | |

---

## 3. Adding a site: the 8-step setup (`/sites/new` → `/sites/{id}/setup/{step}`)

"Add website" anywhere in the app (Overview banner, Quick actions, sites page) opens this flow at `/sites/new?workspace={id}`.

### Step 2a: Domain (`/sites/new`) ✅

| Action | Endpoint | Notes |
|---|---|---|
| (if another workspace is picked) | `POST /workspaces/{id}` | Sites are created in the active workspace |
| **Continue** | `POST /sites` `{ name, url }` | Server errors show under the field |
| Right after create | `POST /sites/{site}/crawl` | Fire and forget; the run id goes into the draft |

### Step 2b: Details (`/setup/details`) 🟡

Code: [`site-profile.ts`](../src/features/site-setup/site-profile.ts), [`crawl.ts`](../src/features/site-setup/crawl.ts).

| Order | Endpoint | Notes |
|---|---|---|
| 1 | `GET /sites/{site}/crawl-runs/{run}`, every 3 s | Waits for the first crawl (up to 3 min). If no run id arrives within 10 s, starts one with `POST /crawl` |
| 2 | `GET /sites/{site}/crawl-runs/{run}/pages` | First 50 pages, readable ones only, homepage first. Shared with step 4 |
| 3 | `POST /sites/{site}/copilot/ask` | Writes each section in **RankYak's structure** from up to 12 page digests (≤ 5,000 chars). Description: *Core Business · Key Features ("Name: explanation") · Unique Value Proposition*, with claims marked "The site claims…" and testimonials marked "not independently verified". Audience: *Primary Audience · Key Characteristics (Professional roles, Business needs, Pain points, Buying behavior, Company profile)*. Replies in the UI language; both sections share one conversation |
| fallback | none | If the copilot fails or answers empty, the same headings are filled from the pages' titles, meta descriptions, H1s, summaries and offer pages (English) |

- No readable pages → the error with **Try again**. Retry appears after 90 s.
- **Not saved to the backend:** there is no `PATCH /sites/{site}`. Confirmed text stays in the draft.
- **Side effect:** the copilot thread shows on the Agent screen until the user asks something new.

### Step 3: Google Search Console ✅

`GET search-console/overview` → **Connect**: `GET search-console/connect` → Google → backend `GET /google/search-console/callback` → `/settings/search-console?connected=1` → `GET search-console/properties` → `POST search-console/property` (auto-picked when one matches the domain) → `POST search-console/sync` (not awaited). **Skip** is allowed.

### Step 4: Core topics ✅

Code: [`topics.ts`](../src/features/site-setup/topics.ts). This step is the **topical map builder**:

1. `GET topical-maps` → if a map with clusters exists, its clusters are offered straight away (`GET topical-maps/{id}`).
2. Otherwise, after the crawl (same pages as step 2b): `POST keywords/discover` with **seed keywords taken from page titles, H1s and headings**, then `POST keywords/analyze`, then `POST topical-map/build`, then `GET topical-maps/{id}`.
3. If the map is empty (common on small sites), the site's own keywords are grouped by cluster name and offered instead (`GET keywords`).
4. If all of that is empty, the step shows the error and the backend's message with **Try again**. It never shows an empty list.

The 5 topics with the highest search volume are recommended. Retry appears after 2 min. An empty list cached by an earlier version is ignored.

**Why you saw no topics before:** the map came back `null` (too few usable keywords from a 4-page crawl), the empty list was cached forever, and the step let you continue with zero topics. All three are fixed.

### Step 5: Billing 🟡 · Step 6: Integration ✅ · Step 7: Preferences 🟡

- Billing reads the plan from `authUser`; upgrading goes to `/upgrade` (Paddle).
- Integration: `GET/POST publishing/connections`, then `POST publishing/connections/{id}/test`.
- Preferences stay in the draft and are sent in step 8.

### Step 8: Done ✅

1. `POST keywords/discover` with the **chosen core topics as seed keywords**. The backend has no core-topics field, so this is how the choice reaches it.
2. `POST content-planner/generate` with `{ month, timezone, cadence: "weekly", articles_target, autopilot_enabled }`.
3. Setup is marked finished and the user lands on `/{siteId}/overview`. Failures in 1–2 don't block finishing.

**Test the whole flow:** `POST /sites` → `POST /crawl` → `crawl-runs/{id}` polls → `crawl-runs/{id}/pages` → `copilot/ask` ×2 → (step 4) `topical-maps` → `keywords/discover` → `keywords/analyze` → `topical-map/build` → `topical-maps/{id}` → (step 8) `keywords/discover` → `content-planner/generate`.

---

## 4. The site dashboard (`/{siteId}/…`)

The sidebar follows the growth loop:

| Group | Screens |
|---|---|
| **Insights** (where you stand) | Overview · AI visibility · Rankings · Competitors · Site audit |
| **Grow** (what to do) | Action plan · **Topical map** · Content · **Money pages** · **Authority** · Ask Rankoya |
| **Workspace** (connect and run) | Integrations · **SEO tools** · Resellers · Agency · Settings |

**Social** and **Reports** are commented out in [`nav.ts`](../src/components/layout/nav.ts) until the backend has endpoints for them.

### 4.1 Overview ✅

Code: [`features/overview/hooks.ts`](../src/features/overview/hooks.ts). Everything is calculated from live data for the selected range (7/30/90 days), with 0 when there is none.

| Element | Source |
|---|---|
| Platform cards: ChatGPT, Claude, Gemini, Perplexity | `GET ai-visibility/results`: share of that engine's answers that mention the site, change vs the previous range, daily sparkline |
| Platform card: Google | `GET search-console/overview`: share of Search Console queries averaging top-10, change and sparkline |
| Trend chart | Daily share of AI answers that mention the site |
| Share of voice | Mentions of the site vs competitors named in the same answers |
| Recent activity | Last crawl, latest scan, articles written (`GET articles`), articles published (`GET publishing/publications`) |
| Getting started | `search-console/overview`, `publishing/connections`, `topical-maps`, `opportunities`, `publications`, `ai-visibility/overview` |
| **Run new scan** | `GET ai-visibility/prompts` → (none) `POST ai-visibility/prompts/generate` → `POST ai-visibility/test` |
| **Add website** | Opens site setup (§3) |

Google Maps was removed (no endpoint).

### 4.2 AI visibility ✅

`GET ai-visibility/overview`, `GET ai-visibility/prompts`, `GET ai-visibility/results`. **Generate prompts**: `POST ai-visibility/prompts/generate`. **Run scan**: `POST ai-visibility/test`. The score is 0 before the first test. Engines shown are the four the backend tests (ChatGPT, Gemini, Perplexity, Claude).

### 4.3 Rankings ✅

`GET keywords`, `GET serp/results`, `GET ai-visibility/prompts`, `GET ai-visibility/results`, `GET search-console/overview`. **Add keywords**: `POST keywords/discover` `{ seed_keywords }` → `POST keywords/analyze`. Position change and sparklines are empty because the API has no rank history.

### 4.4 Competitors ✅

| Action | Endpoint |
|---|---|
| Load | `GET competitors`, `GET content-gaps`, `GET serp/results`, `GET keywords`, `GET ai-visibility/prompts`, `GET ai-visibility/results`, `GET authority/opportunities?per_page=20` |
| **Research competitors** | `POST serp/research` |
| **Research history** card | `GET serp/runs` |
| Per competitor: **Find link prospects** | `POST authority/backlink-prospects` `{ competitor_domain, limit: 20 }` (paid) |
| Question gaps: **Write the answer** | `POST copilot/ask`; the drafted answer opens in a dialog |
| Keyword gaps: **Add to keywords** | `POST keywords/discover` `{ seed_keywords: [keyword] }` |
| Link sites: **Open link opportunities** | Goes to Authority |

### 4.5 Site audit ✅

Code: [`audit-view.tsx`](../src/app/(app)/[brand]/audit/audit-view.tsx), [`features/audit/crawl.ts`](../src/features/audit/crawl.ts).

| Element / action | Endpoint |
|---|---|
| **Latest crawl** card (status, pages read/found/failed, progress) | `GET crawl-runs/{run}`, polled every 3 s while running |
| **Recrawl site** | `POST crawl` → poll → when finished, `POST site-guard/analyze` automatically |
| **Run audit** | `POST site-guard/analyze` |
| Scores and stats | `GET site-guard/issues` (summary page), `GET authority/profile` |
| **Issues** tab, filter by status (open, in progress, resolved, ignored) | `GET site-guard/issues?status=&page=` (50 per page, with pager) |
| Issues **By issue** layout | Rows grouped by issue type, with a count; expand to see **every affected page URL**, its current value, status and fix control |
| Issues **All rows** layout | One row per issue, with its page URL |
| **Crawled pages** tab | `GET crawl-runs/{run}/pages?page=` (50 per page): URL, title, status code, meta description length or **Missing**, H1, words, indexable, issue count. CSV export |
| Page detail drawer | Title and meta (with lengths), H1, canonical, indexable, structured data, words, internal/external links, images without alt text, headings, summary, and the issues on that page |
| Bulk / per-row **Let Rankoya fix** | `POST site-guard/issues/{id}/propose-fix` |
| Issue page: apply / verify / status | `POST …/apply-fix`, `POST …/verify-fix`, `PATCH site-guard/issues/{id}` |

The crawl run id comes from `rankoya:crawl-runs`, the setup draft, or the newest `crawl_run_id` on the issues' pages. The backend has no "latest crawl" endpoint. Only canonical and meta-description issues can be fixed by Rankoya.

### 4.6 Action plan ✅

`GET opportunities`, `GET ai-visibility/overview`. **Find opportunities**: `POST opportunities/analyze`. Move cards: `PATCH opportunities/{id}` `{ status }`. **Details** on any card: `GET opportunities/{id}` (description, what to do, impact/effort/score, evidence). The made-up progress bar on "working" cards is gone.

### 4.7 Topical map (new) ✅

| Element / action | Endpoint |
|---|---|
| Coverage ring, clusters, keywords, mapped, clusters with a page | `GET topical-maps`, `GET topical-maps/{id}` |
| Map version picker | `GET topical-maps` (when there is more than one) |
| Cluster cards: core topic, coverage, keywords and volume, strategy, money-page badge, target page or **Plan content** | `GET topical-maps/{id}` |
| **All keywords** tab (volume, difficulty, CPC, opportunity, intent, cluster, quality) | `GET keywords?page=` (100 per page) |
| **Discover keywords** (optional seeds) | `POST keywords/discover` → `POST keywords/analyze` → `POST topical-map/build` |
| **Rebuild map** | `POST topical-map/build` |

### 4.8 Content ✅

| Action | Endpoint |
|---|---|
| Month calendar / list | `GET content-calendar?from=&to=`, `GET articles?per_page=100` |
| **Plan next month** | `POST content-planner/generate` |
| Row menu: **Reschedule** | `PATCH content-calendar/{item}/reschedule` `{ scheduled_date, scheduled_time }` |
| Row menu: **Change keyword** | `PATCH content-calendar/{item}/swap-keyword` `{ keyword_id }` (from `GET keywords`) |
| Row menu: **Remove from calendar** | `PATCH content-calendar/{item}/remove` |
| **Plans** tab | `GET content-plans?page=` |
| **Research briefs** tab + drawer | `GET articles/research?page=`, `GET articles/research/{id}` |
| Planned item → **Write it** | `POST articles/research/keywords/{keyword}` → `POST articles/generate/{research}` |
| Article: save / publish | `PUT articles/{id}`, `POST publishing/articles/{id}/publish` |

"Reject" and "Ask for revisions" were removed from the article page: the backend can't reject or revise an article.

### 4.9 Money pages (new) ✅

| Action | Endpoint |
|---|---|
| **Find money pages** | `POST money-pages/analyze` |
| Table: page, commercial score, role, intent, primary keyword, conversion signals, analyzed | `GET money-pages?page=&per_page=20` |
| Page drawer | `GET money-pages/{id}`, `GET money-pages/{id}/recommendations` (prioritised recommendations, workflow, conversion signals, supporting content, internal-link opportunities) |

### 4.10 Authority (new) ✅

| Action | Endpoint |
|---|---|
| Scores (readiness, internal, external), backlinks, referring domains, competitor gap | `GET authority/profile` |
| **Analyze authority** | `POST authority/analyze` |
| **Fetch live metrics** (confirm first; paid) | `GET authority/backlinks/summary`: backlinks, referring domains/pages, spam score, new/lost, rank, cost |
| **Link opportunities** tab, status dropdown | `GET authority/opportunities?page=&per_page=20`, `PATCH authority/opportunities/{id}` `{ status }` |
| Opportunity drawer | `GET authority/opportunities/{id}` |
| **Live backlinks** tab (Load button; paid per page) | `GET authority/backlinks?limit=20&offset=` |
| **Find prospects** (competitor domain, page to pitch, limit) | `POST authority/backlink-prospects` |

### 4.11 Ask Rankoya (agent) ✅

`GET copilot/conversations?per_page=1` → `GET copilot/conversations/{id}`; send: `POST copilot/ask`. The "Open tasks" card lists the action-plan cards that are working or waiting for approval. The Telegram card was removed (no endpoint).

### 4.12 Integrations ✅

| Element | Endpoint |
|---|---|
| **Website platform** card: detected vs confirmed, change it | `PATCH sites/{site}/platform` `{ platform }` |
| WordPress, Shopify, Webflow, Wix, Ghost | `GET/POST publishing/connections`, `POST publishing/connections/{id}/test` |
| **WordPress.com** (new) | `GET publishing/wordpress-com/authorize` → WordPress.com → `/integrations/wordpress-com/callback` → `GET publishing/wordpress-com/callback?code&state` → pick a site → `POST publishing/wordpress-com/complete` → `POST publishing/connections/{id}/test` |
| Search Console | OAuth as in setup; **Sync**: `POST search-console/sync` |
| AI engines tab | Read-only list of the 4 engines every scan tests |
| Telegram, Google Analytics | ⛔ Coming soon |
| Disconnect | ⛔ Removed (no endpoint) |

**Backend config needed:** the WordPress.com OAuth redirect URI must point to `{FRONTEND_URL}/integrations/wordpress-com/callback`.

### 4.13 SEO tools (new) ✅

| Tab | Endpoint |
|---|---|
| Meta tags | `POST free-tools/meta-tags` |
| Redirects | `POST free-tools/redirect-checker` |
| Broken links | `POST free-tools/broken-links` (limit 100) |
| Robots.txt | `POST free-tools/robots-txt` |
| Keyword clustering | `POST free-tools/keyword-clustering` |
| Schema markup | `POST free-tools/schema-generator` (copy the `<script>` tag) |
| Agent tools (MCP) | `GET mcp/tools`, `POST mcp/sites/{site}/call` (pick a tool, see its arguments, send JSON, see the result) |

### 4.14 Shell

| Element | Status |
|---|---|
| Brand and workspace switchers, ⌘K | ✅ `GET /sites`, `POST /workspaces/{id}` |
| User card and profile menu | ✅ From `authUser` (+ `GET /me`) |
| Help: support ticket and feedback | ⛔ Opens an email to support with the message filled in |
| Notifications bell | ⛔ Hidden (no endpoint) |
| Theme and language | Browser preferences |

---

## 5. Account pages

| Page / action | Endpoint | Status |
|---|---|---|
| **Settings → Profile**: photo | `POST /upload-loacal-image` (`image`) or `POST /upload-gif` (`gif_file`) | ✅ (URL kept on this device) |
| Settings → Profile: name, email, password | none | ⛔ Read-only, with a note to contact support |
| **Settings → Workspaces** | `GET /workspace`, `POST /workspace/store`, `/workspace/update`, `/workspace/delete`, `POST /workspaces/{id}` | ✅ (list falls back while `GET /workspace` is 404) |
| **Settings → Team** | `GET /team`, `POST /team/add`, `/team/update`, `/team/update/password`, `DELETE /team/delete` | ✅ |
| **Settings → Subscriptions**: cancel | `POST /cancle/subscription` | ✅ |
| **Resellers** | `GET /reseller`, `POST /reseller/add`, `/reseller/update/details`, `/reseller/update/password`, `DELETE /reseller/delete` | ✅ |
| **White Label** `/workspaces/{id}` | `GET/POST /custom-domains`, `PATCH /custom-domains/{id}/config`, `PATCH …/verification`, `DELETE /custom-domains/{id}`, Next routes `/api/custom-domains/**` (Vercel) | ✅ |
| Tenant branding on custom hosts | `GET /custom-domains/resolve?domain=` | ✅ |
| White Label access | `GET /users/{id}/addons/reseller-seats/access` | ✅ |

## 6. Billing (`/upgrade`) ✅

Paddle.js checkout with `NEXT_PUBLIC_PADDLE_*` price ids; plan changes call `POST /cancle/subscription` first. Without `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, paid buttons are disabled.

## 7. Admin (`/admin`) ✅

`GET /admin` (stats, users with `page`/`search`), `POST /admin/users/add`, `/admin/users/update/details`, `/admin/users/update/password`, `/admin/users/update/subscriptions`, `/admin/addon/update`, `/admin/users/credits/add`, `/admin/users/credits/update`, `/activateUser`, `/deactivateUser`, `/admin/users/delete`, `POST /user/sendCampaign`, `GET /all/email/campaign`.

---

## 8. Endpoint coverage

**Every frontend-callable operation in the contract now has a screen or action.** The only operations not called are the three the providers call directly:

| Operation | Called by |
|---|---|
| `GET /google/search-console/callback` | Google (redirects back to `/settings/search-console`) |
| `GET /publishing/wix/callback` | Wix |
| `POST /publishing/wix/webhook` | Wix |

## 9. Gaps (need a backend endpoint or change)

| Gap | Effect in the UI | What the backend could add |
|---|---|---|
| `GET /workspace` returns 404 | Workspace list comes from the login response | Ship the workspace controller |
| No `PATCH /sites/{site}` (or settings) | Setup description, audience, country and language aren't saved | `PATCH /sites/{site}` accepting `description`, `target_audience`, `country`, `language` |
| No site-profile endpoint | Setup uses the copilot + crawled pages | `POST /sites/{site}/profile/generate` (ideally streamed) |
| No core-topics field | Chosen topics are sent as seed keywords | Store core topics on the site or the topical map |
| No "latest crawl run" | Run id is remembered in the browser | `GET /sites/{site}/crawl-runs` (list, newest first) |
| No rank / visibility history | Rank change and history charts are empty; Overview trends come from the newest 100 results | Daily snapshots |
| No delete for publishing connections | No Disconnect | `DELETE /sites/{site}/publishing/connections/{id}` |
| No article reject / revise | Buttons removed | Status update, or a revise endpoint |
| No profile / password update for yourself | Read-only | `PUT /me`, `PUT /me/password` |
| No password reset, email codes, Google sign-in | Email to support / hidden | Auth endpoints |
| No notifications, Telegram, Analytics, usage meters | Hidden / coming soon | Endpoints for each |
| WordPress.com redirect URI | Must point to the frontend callback page | Config change |

---

## 10. Suggested demo script (about 20 minutes)

1. **Sign up** (`/register` + `/workspace/store`), then you land on `/sites/new`.
2. **Add a domain** (`POST /sites`; the crawl starts).
3. **Details**: the description and audience appear in RankYak's structure once the crawl finishes. Confirm each section.
4. **Search Console**: connect (or skip).
5. **Core topics**: real clusters from the topical map builder. Pick 5.
6. **Billing** (Free) → **Integration** (WordPress app password, or WordPress.com sign-in) → **Preferences** → **Done**.
7. **Overview**: run a scan, and watch the platform cards, trend and share of voice fill with real numbers.
8. **Site audit**: recrawl → audit runs on its own → open **Crawled pages** and a page's drawer → group by issue and expand to see every URL → propose → apply → verify a canonical or meta issue.
9. **Topical map**: discover keywords with a few seeds → see clusters, coverage and target pages.
10. **Content**: reschedule an item, change its keyword, open **Research briefs**, write and publish an article.
11. **Money pages**: find money pages → open one for recommendations.
12. **Authority**: analyze → fetch live metrics → find prospects from a competitor → update an opportunity's status.
13. **Competitors**: write the answer for a question gap; find link prospects for a competitor.
14. **SEO tools**: meta tags and broken links on the homepage; run an MCP tool.
15. **Ask Rankoya** (⌘J): "What should I fix first?"

**Before the demo:** the slow calls (crawl, scan, topics, article writing, money pages, authority) can each take minutes. Run them once on the demo site so the screens open already filled, and keep a fresh site for the live setup flow. Paid calls (live metrics, backlinks, prospects) bill DataForSEO, so check whether the backend is on the sandbox.
