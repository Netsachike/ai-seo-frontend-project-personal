# Rankoya: technical walkthrough

**Branch:** `feat/backend-wiring` · **Written:** 2026-10-13
**API contract:** `docs/backend/docs/openapi.yaml` (gitignored, local only; open `docs/backend/docs/index.html` for Swagger UI)

This guide follows a user through the app screen by screen. For each screen it lists the backend endpoints called, what triggers each call, and what is still faked in the UI. Use it to run a demo, to check what is integrated, and to test.

**Legend**

| Mark | Meaning |
|---|---|
| ✅ **Live** | Calls the real backend |
| 🟡 **Partial** | Some data is live; parts are derived in the browser, kept in browser storage, or mocked |
| 🔴 **Mock** | No endpoint yet: fake delay, UI mock data, or browser-only state |

---

## 0. How requests work

### Client and config

- **HTTP client:** axios in [`src/services/api/api.ts`](../src/services/api/api.ts). Each endpoint wrapper lives in `src/services/<area>.ts`, and screens call them through React Query hooks in `src/features/<area>/hooks.ts`.
- **Base URL:** `NEXT_PUBLIC_API_BASE_URL`, including the `/api` prefix (for example `http://127.0.0.1:8001/api`). If it is unset, every request is rejected with `ERR_API_NOT_CONFIGURED` and nobody can sign in.
- **Headers on every request:** `Accept: application/json`, `Content-Type: application/json`, and `Authorization: Bearer <authToken cookie>`.
- **Timeouts:** 60 s by default. LLM, SERP and crawl-type calls use `LONG_REQUEST_TIMEOUT_MS` (5 min). These calls are **synchronous on the backend**, so a spinner running for a minute or more is expected. Services that use the long timeout: ai-visibility, article-research, articles, authority, content-planner, copilot, keywords, opportunities, search-console, serp, site-guard, topical-maps.
- **Site scoping:** site endpoints are built with `sitePath(siteId, "...")`, which gives `/sites/{site}/...`. The backend resolves the **active workspace from the token**, and a site outside that workspace returns 404.
- **401 handling:** any 401 except on `/login` and `/register` clears the session cookies and fires `rankoya:session-expired`, which sends the user back to sign-in.

### Session and route guard

| Where | Key | What it holds |
|---|---|---|
| Cookie | `authToken` | Sanctum bearer token from `POST /login` → `data.token` |
| Cookie | `authUser` | Trimmed user JSON (name, role, active workspace, subscriptions). The UI gates plan and admin features on it |
| localStorage | `rankoya:login-workspaces` | **Temporary:** the workspaces from the login response, used as a fallback while `GET /workspace` returns 404 |
| localStorage | `rankoya:setup-progress` | Furthest setup step reached, per site. `null` means setup is finished |
| localStorage | `rankoya:site-setup` | Setup draft per site: description, audience, topics, preferences, crawl run id |
| sessionStorage | `rankoya:gsc-pending` | The site and return path held across the Google OAuth redirect |

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
| `/sign-in`: submit | `POST /login` | ✅ | Writes the `authToken` and `authUser` cookies and stores the workspaces in localStorage. Lands on `/sites`, or on `?next=` |
| `/sign-up`: submit | `POST /register` | ✅ | Register returns the same shape as login, so the user is signed in immediately |
| `/sign-up`: workspace name | `POST /workspace/store` (multipart) | ✅ | Creates the first workspace (`is_default: 1`) right after register, then lands on `/sites/new` |
| Profile menu: **Sign out** | `POST /logout` | ✅ | Best effort; the cookies are cleared even if the call fails |
| "Continue with Google" | none | 🔴 | Shows an "unavailable" message |
| `/forgot-password` | none | 🔴 | `fakeRequest()` delay |
| `/verify` (email code) | none | 🔴 | `fakeRequest()` delay, then continues to `/sites/new` |

`GET /me` is wrapped in `services/auth.ts` but no screen calls it yet. The session comes from the login response.

**Test:** sign up with a new email and confirm that `register` and `workspace/store` both return 2xx and that you land on `/sites/new`. Sign out, then sign in again and confirm you land on `/sites`. Delete the `authToken` cookie and open any app page: you should be redirected to `/sign-in?next=…`.

Code: [`src/lib/auth/session.ts`](../src/lib/auth/session.ts), [`src/lib/auth-session.ts`](../src/lib/auth-session.ts), [`src/services/auth.ts`](../src/services/auth.ts)

---

## 2. Workspaces and the sites list (`/sites`)

| Action | Endpoint | Status | Notes |
|---|---|---|---|
| Load the workspace list and the active workspace | `GET /workspace` | 🟡 | **Returns 404 today** (no controller on the backend yet). The service falls back to `rankoya:login-workspaces` from login |
| Load the sites in the active workspace | `GET /sites` | ✅ | |
| Site card: clusters covered | `GET /sites/{site}/topical-maps` | ✅ | One call per card |
| Site card: AI visibility score | `GET /sites/{site}/ai-visibility/overview` | ✅ | One call per card. Shown only after the first visibility test |
| Switch workspace (top bar, ⌘K, setup) | `POST /workspaces/{id}` | ✅ | Activates the workspace on the backend, updates the `authUser` cookie, clears the whole React Query cache, then goes to `/sites` |
| Create workspace (switcher) | `POST /workspace/store` | ✅ | |
| Usage meters, UI preferences (`useMe`, `useUsage`) | none | 🔴 | `lib/mocks/store` |

A card links to `/sites/{id}/setup/{step}` while setup is unfinished (according to `rankoya:setup-progress`), and to `/{siteId}/overview` once it is done.

**Test:** with two workspaces, switch between them. You should see `POST /workspaces/{id}`, then a fresh `GET /sites` that returns the other workspace's sites.

Code: [`src/features/workspace/hooks.ts`](../src/features/workspace/hooks.ts), [`src/services/workspaces.ts`](../src/services/workspaces.ts), [`src/services/sites.ts`](../src/services/sites.ts), [`src/features/sites/hooks.ts`](../src/features/sites/hooks.ts)

---

## 3. Adding a site: the 8-step setup (`/sites/new` → `/sites/{id}/setup/{step}`)

The progress bar counts "account" as step 1, so the domain screen reads "Step 2 of 8". Progress is stored per site in `rankoya:setup-progress`, so a refresh resumes at the right step, and jumping ahead by URL sends you back to the furthest step reached.

### Step 2a: Domain (`/sites/new`) ✅

| Action | Endpoint | Notes |
|---|---|---|
| (if a different workspace is picked) | `POST /workspaces/{id}` | Sites are created in the backend's active workspace |
| **Continue** | `POST /sites` `{ name, url: "https://<domain>" }` | Errors from the server show under the field |
| Right after create (fire and forget) | `POST /sites/{site}/crawl` | Starts the first crawl; the run id is saved to the setup draft |
| Load the site on later steps | `GET /sites/{site}` | 404 shows "site not found" |

### Step 2b: Details (`/setup/details`) 🟡

The description and audience are written from the site's first crawl in [`site-profile.ts`](../src/features/site-setup/site-profile.ts):

| Order | Endpoint | Notes |
|---|---|---|
| 1 | `GET /sites/{site}/crawl-runs/{run}`, polled every 3 s | Waits for the crawl the domain step started (up to 3 min). If its id never reaches the draft within 10 s, it calls `POST /crawl` itself |
| 2 | `GET /sites/{site}/crawl-runs/{run}/pages` | First 50 pages. Only pages that loaded and have text are kept, homepage first. Both sections share this one read |
| 3 | `POST /sites/{site}/copilot/ask` | **Option B.** The question contains up to 12 page digests (path, type, title, meta description, H1 and a text excerpt), capped at 5,000 characters. It asks for markdown in the UI's language with fixed headings. The audience question also includes the confirmed description. Both sections use the same conversation |
| fallback | none | **Option A.** If the copilot errors or returns an empty answer, the section is built from the pages' own text: homepage title, meta description, H1 and summary, plus key service or product pages. The audience gets a short list derived from the offer pages and the site's country and language. The fallback is always in English |

- If no page could be read, the section shows the error with **Try again**. Retry reads the crawl again.
- The finished answer is released in small bursts, so it writes itself in. The copilot does not stream.
- The loader shows Retry after 90 s, because a first crawl can take minutes.
- **Side effect:** the copilot conversation is stored, so the Agent screen (which opens the latest conversation) will show this setup thread until the user asks something new.
- **Still local:** confirmed answers stay in the localStorage draft. There is no `PATCH /sites/{site}` to save them yet.
- Language and country default from the domain's TLD, then from the site's `location` and `language`.

Completing this step **prefetches topic discovery** (see step 4), so the topics are often ready by the time the user gets there.

**Test:** add a domain and watch Network for the `crawl-runs/{id}` polls → `crawl-runs/{id}/pages` → `copilot/ask`. To test the fallback, block `copilot/ask` in DevTools (right-click → Block request URL), then retry. The text should come back built from the page titles and meta descriptions.

### Step 3: Google Search Console (`/setup/google-search-console`) ✅

| Action | Endpoint | Notes |
|---|---|---|
| Check connection status | `GET /sites/{site}/search-console/overview` | `connection` is null until connected. "Ready" means `status = connected` **and** a property is chosen |
| **Connect** | `GET /sites/{site}/search-console/connect` | Returns `authorization_url`. The browser goes to Google, and `rankoya:gsc-pending` is written to sessionStorage |
| Google → backend | `GET /google/search-console/callback` | Handled by the backend, which redirects to `{FRONTEND_URL}/settings/search-console?connected=1` |
| Return page: list properties | `GET /sites/{site}/search-console/properties` | A property matching the domain is picked automatically (domain property first, then URL-prefix) |
| Return page: save property | `POST /sites/{site}/search-console/property` | Then sends the user back to the setup step |
| After saving (not awaited) | `POST /sites/{site}/search-console/sync` | Pulls the last 30 days |

**Skip** is allowed and continues without a connection.

### Step 4: Core topics (`/setup/core-topics`) ✅

[`topics.ts`](../src/features/site-setup/topics.ts) runs this chain. Each call is slow, so the step can take several minutes on a fresh site.

1. `GET /sites/{site}/crawl-runs/{run}`, **polled every 3 s** until the crawl completes or fails. It gives up after 3 minutes and uses whatever has been crawled. If there is no saved run id, it calls `POST /crawl` first.
2. `POST /sites/{site}/keywords/discover`
3. `POST /sites/{site}/keywords/analyze` (scores and clusters the keywords)
4. `POST /sites/{site}/topical-map/build`
5. `GET /sites/{site}/topical-maps/{id}`. The clusters become topic chips, and the 5 with the highest search volume are pre-selected.

The topics the user chooses are kept in the local draft only.

### Step 5: Billing (`/setup/billing`) 🟡

Shows plans and reads the plan from the `authUser` cookie. Upgrading links to `/upgrade` (Paddle checkout, see section 6). The user can also continue on Free.

### Step 6: Integration (`/setup/integration`) ✅

| Action | Endpoint |
|---|---|
| List connections | `GET /sites/{site}/publishing/connections` |
| Connect a CMS | `POST /sites/{site}/publishing/connections`, then `POST /publishing/connections/{id}/test` |

API connections are created as `pending`. Only a passing test makes them `active`. If the test returns `success: false`, the connection is kept in `error` state and the message is shown. The form fields for each platform are in [`publishing/forms.ts`](../src/features/publishing/forms.ts):

| Platform | Fields |
|---|---|
| WordPress | site_url, username, application_password |
| Shopify | store_domain, access_token |
| Webflow | access_token, config.collection_id |
| Wix | access_token, site_id |
| Ghost | config.site_url, admin_api_key |

### Step 7: Preferences (`/setup/preferences`) 🔴

Articles per week and publish mode (manual or auto) are kept in the local draft. They are sent in step 8.

### Step 8: Done (`/setup/done`) ✅

**Finish** calls `POST /sites/{site}/content-planner/generate` with:
```json
{ "month": "YYYY-MM", "timezone": "<browser tz>", "cadence": "weekly",
  "articles_target": "articlesPerWeek × 4 (1–100)", "autopilot_enabled": "publishMode === auto" }
```
If the call fails, setup still finishes, and the plan can be generated later from Content. Setup is then marked finished, and the user is sent to `/{siteId}/overview`.

**Test the whole flow:** add a real domain you control. In Network you should see, in order: `POST /sites` → `POST /crawl` → (step 4) `crawl-runs/{id}` polls → `keywords/discover` → `keywords/analyze` → `topical-map/build` → `topical-maps/{id}` → (step 8) `content-planner/generate`.

---

## 4. Site dashboard (`/{siteId}/…`)

The `[brand]` URL segment is the site id. The layout resolves it with `GET /sites/{site}` and `GET /workspace`. A 404 shows not-found, and an unknown site id shows not-found too.

### 4.1 Overview (`/{site}/overview`) 🟡

| Element | Source | Status |
|---|---|---|
| Growth loop progress (connect → analyze → discover → optimize → publish → measure) | `search-console/overview`, `publishing/connections`, `site.last_crawled_at`, `topical-maps`, `opportunities`, `publishing/publications`, `ai-visibility/overview` | ✅ Each step counts as done when its data exists |
| **Run AI scan** | `GET ai-visibility/prompts` → (if there are none) `POST ai-visibility/prompts/generate` → `POST ai-visibility/test` | ✅ Slow, synchronous |
| Trend charts, sparklines, share of voice | `getBrandSummary` mock | 🔴 No history endpoint |
| Platform cards (`platformGlance`), activity feed | `lib/mocks/ui-data*` | 🔴 |

### 4.2 AI Visibility (`/{site}/visibility`) ✅

| Action | Endpoint |
|---|---|
| Load the screen | `GET ai-visibility/overview`, `GET ai-visibility/prompts`, `GET ai-visibility/results` (newest 100) |
| Generate prompts | `POST ai-visibility/prompts/generate` `{ limit? }` |
| Run scan | as on Overview, or `POST ai-visibility/test` `{ prompt_ids }` for selected prompts |
| Prompt detail `/visibility/prompts/{id}` | Reuses prompts and results. "Re-run" calls `POST ai-visibility/test` with that prompt id |

The engine list, cited sources and the per-engine breakdown are **built in the browser** from these results ([`visibility/model.ts`](../src/features/visibility/model.ts)). The display engine catalogue is static.

### 4.3 Rankings (`/{site}/rankings`) 🟡

| Action | Endpoint |
|---|---|
| Load the screen | `GET keywords`, `GET serp/results`, `GET ai-visibility/prompts`, `GET ai-visibility/results`, `GET search-console/overview` |
| **Add keywords** | `POST keywords/discover` `{ seed_keywords }`, then `POST keywords/analyze` |

Positions come from Search Console first (impression-weighted average per query and device), then fall back to the best SERP result. The "AI engines" column counts the engines that mentioned the site for prompts generated from each keyword. **Position change and sparklines are empty** because the API has no rank history yet.

### 4.4 Competitors (`/{site}/competitors`) 🟡

| Action | Endpoint |
|---|---|
| Load the screen | `GET competitors`, `GET content-gaps`, `GET serp/results`, `GET keywords`, `GET ai-visibility/prompts`, `GET ai-visibility/results`, `GET authority/opportunities?per_page=20` |
| **Research competitors** | `POST serp/research` |
| "Draft answer" on question gaps, "Draft outreach" on link sites | none | 🔴 `fakeRequest` |

Share of voice, question gaps (prompts where competitors were named and the site was not), keyword gaps and link sites are all computed in the browser from the responses above.

### 4.5 Site Audit (`/{site}/audit`) ✅

| Action | Endpoint |
|---|---|
| Load the screen | `GET site-guard/issues`, `GET authority/profile` (for the AI-readiness score) |
| **Run audit** | `POST site-guard/analyze` (scans the latest crawl) |
| Bulk "Let Rankoya fix" | `POST site-guard/issues/{id}/propose-fix`, once per issue, one at a time |
| Issue detail `/audit/{issueId}` | `GET site-guard/issues/{id}` |
| ↳ Propose fix | `POST …/propose-fix` (proposal stored in `metadata.fix`) |
| ↳ Apply fix | `POST …/apply-fix` (returns a deployment package) |
| ↳ Verify fix | `POST …/verify-fix` (checks the live page; resolves the issue on success) |
| ↳ Ignore / reopen / in progress | `PATCH site-guard/issues/{id}` `{ status }` |

The backend can write fixes only for **canonical** and **meta_description** issues; other issues are marked "yours". The SEO health score is calculated in the browser as 100 minus 8, 3 or 1 points for each critical, warning or notice issue. **Category scores are empty** because there is no API for them.

### 4.6 Action plan (`/{site}/actions`) ✅

| Action | Endpoint |
|---|---|
| Load the board | `GET opportunities`, `GET ai-visibility/overview` |
| **Find opportunities** | `POST opportunities/analyze` |
| Approve, start, complete or ignore cards | `PATCH opportunities/{id}` `{ status }`, once per selected card |

Each card's column comes from its status and type: Rankoya handles content, gap, refresh, article, cluster and internal-link work; everything else is yours.

### 4.7 Content (`/{site}/content`) ✅

| Action | Endpoint |
|---|---|
| Month calendar | `GET content-calendar?from=&to=`, plus `GET articles?per_page=100` (matched to calendar items by `keyword_id`) |
| **Generate plan** for a month | `POST content-planner/generate` `{ month, timezone }` |
| Open an item with no article yet (`/content/item-{id}`) | `GET content-calendar` (finds the item) |
| ↳ **Write it** | `POST articles/research/keywords/{keywordId}`, then `POST articles/generate/{researchId}` (both slow) |
| Open an article (`/content/{articleId}`) | `GET articles/{id}` |
| ↳ Save edits | `PUT articles/{id}` (the backend saves a revision first) |
| ↳ Publish | `GET publishing/connections` (to pick a target), then `POST publishing/articles/{id}/publish` |
| ↳ "Ask for revisions" | none | 🔴 `fakeRequest` |

Wrapped in the service but **not used in the UI yet:** `content-plans`, `content-calendar/{item}/reschedule`, `/swap-keyword` and `/remove`, plus `articles/research` (list and get).

### 4.8 Agent (`/{site}/agent` and the ⌘J panel) 🟡

| Action | Endpoint |
|---|---|
| Load the thread | `GET copilot/conversations?per_page=1`, then `GET copilot/conversations/{id}` for the latest conversation |
| Send a message | `POST copilot/ask` `{ question, conversation_id }`. The question appears straight away and is replaced by the stored pair from the response |
| Approval cards, open tasks list | none | 🔴 `decideApproval` and `openTasks` mocks |

### 4.9 Integrations (`/{site}/integrations`) 🟡

| Provider | Status | Endpoints |
|---|---|---|
| WordPress, Shopify, Webflow, Wix, Ghost | ✅ | `GET/POST publishing/connections`, `POST publishing/connections/{id}/test` (detail page "Test again") |
| Search Console | ✅ | Same OAuth flow as setup step 3. The detail page's **Sync** calls `POST search-console/sync` |
| Google Analytics, Telegram | 🔴 | Browser-only Zustand store, `fakeRequest` |
| **Disconnect** (any provider) | 🔴 | `fakeRequest`; it only removes the local entry |
| `/integrations/{provider}/select` (account picker) | 🔴 | `fakeRequest` |

WordPress.com OAuth (`publishing/wordpress-com/authorize` / `callback` / `complete`) is wrapped in `services/publishing.ts` but **not used in the UI**.

### 4.10 Placeholders

`social` (marked "soon") and `reports` render an empty-state placeholder through `[brand]/[...section]`. Old `/{site}/settings/...` links redirect to `/settings`.

### 4.11 Shell (all dashboard pages)

| Element | Status |
|---|---|
| Brand switcher, ⌘K site list | ✅ `GET /sites` |
| Workspace switcher | ✅ `POST /workspaces/{id}` |
| Notifications popover | 🔴 Mock, refetched every 60 s |
| Help sheet: support ticket and feedback | 🔴 `fakeRequest` |
| Theme and language | 🔴 Local preferences (`updateMe` mock) |
| Job banner (`useJob`) | 🔴 `getMockJob` |

---

## 5. Account pages

| Page / action | Endpoint | Status |
|---|---|---|
| **Settings → Profile**: upload photo | `POST /upload-loacal-image` (`image`; the misspelling is the real route) or `POST /upload-gif` (`gif_file`) | ✅ |
| Settings → Profile: save details, change password | none | 🔴 Toast only |
| **Settings → Workspaces**: list, create, update, delete, activate | `GET /workspace`, `POST /workspace/store`, `POST /workspace/update`, `POST /workspace/delete`, `POST /workspaces/{id}` | ✅ (list falls back to the login data while `GET /workspace` is 404) |
| **Settings → Team**: list, add, edit, change password, delete | `GET /team`, `POST /team/add`, `POST /team/update`, `POST /team/update/password`, `DELETE /team/delete` | ✅ |
| **Settings → Subscriptions**: cancel | `POST /cancle/subscription` `{ subscriptionId }` (the misspelling is the real route) | ✅ |
| `/settings/search-console?connected=1` | GSC OAuth return page (see §3 step 3) | ✅ |
| **Resellers** `/resellers`: list, add, edit, change password, delete | `GET /reseller`, `POST /reseller/add`, `POST /reseller/update/details`, `POST /reseller/update/password`, `DELETE /reseller/delete` | ✅ |
| **Agency** `/agency` | Gated on the `authUser` cookie | 🟡 |
| **White Label** `/workspaces/{id}`: list domains | `GET /custom-domains` | ✅ |
| ↳ Configure (logo, colours, domain) | `POST /upload-loacal-image`, `POST /custom-domains` or `PATCH /custom-domains/{id}/config` | ✅ |
| ↳ DNS records and verify | Next routes `GET /api/custom-domains/{domain}` and `/config` (Vercel), then `PATCH /custom-domains/{id}/verification` | ✅ (Vercel is simulated when `VERCEL_TOKEN` is unset) |
| ↳ Delete domain | Next route `DELETE /api/custom-domains/{domain}`, then `DELETE /custom-domains/{id}` | ✅ |
| White-label tenant branding (every page load on a custom host) | `GET /custom-domains/resolve?domain=<host>` | ✅ |
| White Label access check | `GET /users/{id}/addons/reseller-seats/access` | ✅ |

The Next.js routes under `src/app/api/custom-domains/**` run on the server. They call the Vercel REST API with `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` to add, inspect and remove domains on the Vercel project.

---

## 6. Billing (`/upgrade`) ✅ (Paddle)

- Checkout opens **Paddle.js** in the browser with the price id from `NEXT_PUBLIC_PADDLE_*` ([`lib/paddle-config.ts`](../src/lib/paddle-config.ts)). There is no Rankoya API call to start a checkout. The backend learns about the purchase through Paddle's webhook.
- Changing an existing paid plan calls `POST /cancle/subscription` first, then opens checkout.
- If `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is unset, paid buttons are disabled and a notice is shown.
- **Test:** use `NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox` and a Paddle test card, then sign in again so `authUser.subscriptions` reflects the new plan.

---

## 7. Admin (`/admin`, admin role only)

| Page / action | Endpoint |
|---|---|
| **Statistics** | `GET /admin` (dashboard data) |
| **User management**: list and search | `GET /admin?page=&search=` |
| ↳ Add user | `POST /admin/users/add` |
| ↳ Edit details | `POST /admin/users/update/details` |
| ↳ Change password | `POST /admin/users/update/password` |
| ↳ Plan / licence | `POST /admin/users/update/subscriptions` |
| ↳ Add-ons | `POST /admin/addon/update` |
| ↳ Credits | `POST /admin/users/credits/add`, `POST /admin/users/credits/update` |
| ↳ Activate / deactivate | `POST /activateUser`, `POST /deactivateUser` `{ id }` |
| ↳ Delete | `POST /admin/users/delete` `{ user_id }` |
| **Marketing**: send campaign | `POST /user/sendCampaign` (multipart when there is an attachment) |
| ↳ Campaign list | `GET /all/email/campaign` |

All admin endpoints are ✅ wired. The `/admin` route guard uses the cookie, and the backend enforces the role.

---

## 8. Backend endpoints with no UI yet

These are in `openapi.yaml`, and most already have a service wrapper, but no screen calls them:

| Area | Endpoints | Service |
|---|---|---|
| Auth | `GET /me` | `services/auth.ts` |
| Sites | `PATCH /sites/{site}/platform` | `services/sites.ts` |
| Crawl | `GET crawl-runs/{run}/pages` | `services/crawler.ts` |
| SERP | `GET serp/runs` | `services/serp.ts` |
| Opportunities | `GET opportunities/{id}` | `services/opportunities.ts` |
| Content | `GET content-plans`, `PATCH content-calendar/{item}/reschedule`, `/swap-keyword`, `/remove`; `GET articles/research`, `GET articles/research/{id}` | `content-planner.ts`, `article-research.ts` |
| Money pages | `POST money-pages/analyze`, `GET money-pages`, `GET money-pages/{id}`, `GET …/recommendations` | `services/money-pages.ts` |
| Authority | `POST authority/analyze`, `GET/PATCH authority/opportunities/{id}` | `services/authority.ts` |
| Publishing | WordPress.com OAuth (`authorize`, `callback`, `complete`); Wix callback and webhook (backend only) | `services/publishing.ts` |
| MCP | `GET /mcp/tools`, `POST /mcp/sites/{site}/call` | `services/mcp.ts` |
| Free tools | `POST /free-tools/robots-txt`, `redirect-checker`, `meta-tags`, `broken-links`, `keyword-clustering`, `schema-generator` | `services/free-tools.ts` |

## 9. UI with no backend yet (still mocked)

- Password reset, email verification and Google sign-in
- Profile details and password save
- Saving the confirmed site profile from setup step 2b (written live from the crawl and the copilot, but there is no endpoint to store it)
- Overview trend charts, share of voice over time, platform cards and activity feed
- Rank history (position change and sparklines) and audit category scores
- Notifications, usage meters and the job banner
- Agent approvals and tasks
- Telegram and Google Analytics connections, plus **Disconnect** for every provider
- "Draft answer" and "Draft outreach" on Competitors, and "Ask for revisions" on articles
- Support ticket and feedback forms
- Known backend gap: **`GET /workspace` returns 404**. The workspace list comes from the login response until the controller ships.

---

## 10. Suggested demo script (about 15 minutes)

1. **Sign up** (`/register` + `/workspace/store`). You land on `/sites/new`.
2. **Add a domain** (`POST /sites`; the crawl starts in the background).
3. **Details**: the crawl finishes, then the copilot writes the description and audience from the crawled pages. Confirm each section. Topic discovery starts in the background.
4. **Search Console**: Connect → Google consent → the property is picked automatically → sync. Or skip.
5. **Core topics**: real clusters from crawl → keywords → topical map. Pick 5.
6. **Billing** (continue on Free), then **Integration** (connect WordPress with an application password: create + test), then **Preferences**.
7. **Done**: the content plan is generated, and you land on Overview.
8. **Visibility**: generate prompts → run a scan (slow) → open a prompt to see each engine's answer.
9. **Audit**: run the audit → open a canonical or meta-description issue → propose → apply → verify.
10. **Actions**: find opportunities → move a card.
11. **Content**: open a planned item → **Write it** (research + generate, slow) → edit → save → publish to WordPress.
12. **Agent** (⌘J): ask "What should I fix first?"
13. **Settings → Team**: add a member. **Admin** (admin account): find the user and add credits.

**Before the demo:** the slow calls (scan, topics, article writing) can take minutes. Run them once beforehand on the demo site so the screens open already filled, and keep a second, fresh site for the live setup flow.
