# How Rankoya's integrations connect, and what the backend still needs

Written 10 Nov 2026 against the frontend (`ai-seo`, branch `dev`) and the backend (`ai-seo-project`, `main` at `8328cb1`).
Step-by-step tests live in `docs/integrations-testing.md`. This file explains the moving parts and answers the open questions.

---

## Short answers

**Wix sends us back to the callback. What happens then?**
Next checks the request, gets a Wix access token, confirms the site has Wix Blog, and then asks Laravel to save the connection.
That last step fails today: Laravel rejects the request (details in section 2). Nothing is saved, and you land back on the page with "Wix is installed, but we couldn't save the connection".

**Does the backend need a new endpoint to save the credentials?**
No new endpoint. Laravel already has the right one, `POST /sites/{site}/publishing/connections`, and it already stores credentials encrypted against the site and workspace (`credentials` is cast `encrypted:array` in `PublishingConnection`).
What's missing is that this endpoint has to *accept* the Wix app, webhook and feed shapes, and Laravel needs publishers that use them. All the changes are inside the existing Publishing module.

**Who stores what?**
Next stores nothing long-term. It runs the browser-facing steps (redirects, test sends, signing), then hands the result to Laravel.
Laravel stores every connection and does every real publish, from its queue.

**Why does the credits pill only show a loading shape?**
The live backend doesn't have the credits route. `GET https://api.rankoya.uk/api/credits/balance` returns **404 "route could not be found"**, even though the route is in the backend repo, committed and pushed (`routes/api.php` line 55, `CreditWalletController`). Section 6 has the fix.

---

## 1. The big picture

```
 User's browser ──► Next (app.rankoya.uk)            ──► Laravel (api.rankoya.uk)        ──► Wix / Make / app
                    · starts and finishes sign-ins       · stores connections (encrypted)    · receives articles
                    · sends test articles                · publishes articles (queue)
                    · serves the RSS / JSON feed         · keeps publication history
```

Every integration ends in the same place: a row in Laravel's `publishing_connections` table for that site.
When an article is approved, Laravel's `PublishingService` picks the provider for the connection's `platform` + `method` and publishes.
The provider is chosen in `app/Modules/Publishing/Services/PublishingProviderManager.php`.
The only exception is RSS: a feed is read by others, nothing is pushed, so it needs no connection row.

## 2. Wix (installing Rankoya's Wix app)

### The flow

1. The user clicks **Continue to Wix**. Next's `/api/integrations/wix/start` sets a signed, 10-minute cookie that remembers the site and the page they came from. It then sends them to Wix's installer with a return address of `https://app.rankoya.uk/api/integrations/wix/callback`.
2. The user picks their Wix site and approves. Wix sends them to the return address with `signedInstance`.
3. `/api/integrations/wix/callback` then:
   1. checks the cookie, so the request really came from this user's click;
   2. checks `signedInstance` was signed with our `WIX_APP_SECRET` and reads the **instance ID** out of it. The instance ID is Wix's ID for "Rankoya installed on this site";
   3. swaps the instance ID for a 4-hour access token (`POST https://www.wixapis.com/oauth2/token`, `client_credentials`);
   4. lists blog categories to make sure Wix Blog is on the site;
   5. **calls Laravel** with the user's own login token:
      `POST /sites/{site}/publishing/connections` with
      `{ platform: "wix", method: "api", credentials: { instance_id, site_id }, config: { auth: "app" } }`;
   6. calls `POST …/connections/{id}/test` to activate it;
   7. sends the user back with `?connected=wix`, which shows a toast and refreshes the card.

The instance ID is the only thing worth storing. Access tokens expire after 4 hours, so Laravel makes a new one every time it publishes, from the instance ID plus the app ID and secret.

### Why it fails today (backend, `app/Modules/Publishing`)

| # | Problem | Where |
|---|---|---|
| 1 | `WixPublishingProvider` isn't in the provider list, so **every** Wix connection is refused with "This publishing integration is not available yet." | `Services/PublishingProviderManager.php` |
| 2 | Validation requires `credentials.access_token` and `config.collection_id` for Wix. The app flow sends `instance_id` and no token. | `Controllers/PublishingController.php` → `storeConnection` |
| 3 | The provider uses a stored token and writes to **Wix CMS collections** (`/wix-data/v2/items`), not Wix Blog. | `Providers/WixPublishingProvider.php` |
| 4 | Already there and reusable: `WixOAuthService::createAccessToken($instanceId)` makes the token. It reads `WIX_CLIENT_ID` / `WIX_CLIENT_SECRET`. | `Services/WixOAuthService.php`, `config/services.php` |

### Backend tasks

1. Register `WixPublishingProvider` in `PublishingProviderManager`.
2. In `storeConnection`, when `platform = wix` and `config.auth = app`: require `credentials.instance_id`, and drop the `access_token` and `collection_id` requirements.
3. In `WixPublishingProvider`, when `config.auth = app`:
   - get the token from `WixOAuthService::createAccessToken(instance_id)`, sent as `Authorization: <token>`;
   - **test:** `GET https://www.wixapis.com/blog/v3/categories`;
   - **publish:** create a Wix Blog draft post, then publish it (Wix Blog "Draft Posts" API). The body is Wix rich content, so the article HTML needs converting.
4. Set `WIX_CLIENT_ID` = the app's App ID and `WIX_CLIENT_SECRET` = the App Secret Key in Laravel's `.env`. These are the same values as Next's `WIX_APP_ID` / `WIX_APP_SECRET`.
5. Optional: handle the "App Removed" webhook, already verified in `WixOAuthController@webhook`, to mark the connection `error` when the user uninstalls.

## 3. Make, Lovable and Replit (webhooks)

These three work the same way. The only difference is who owns the receiving URL.

- **Make:** Make gives the URL (a "Custom webhook" module in a scenario). Each article runs the scenario, which can send it anywhere Make connects to.
- **Lovable / Replit:** the user's own app gives the URL. The dialog has a prompt to paste into Lovable or Replit. It builds an endpoint that receives articles, checks they come from Rankoya, saves them, and shows them on `/blog`.

### The flow

1. The dialog makes a **signing secret** (`whsec_…`). Lovable and Replit apps keep it to check each request. Make can ignore it.
2. The user pastes the URL and clicks **Send test article**. Next's `/api/integrations/webhook/test`:
   - refuses anything that isn't a public `https` address (localhost and private networks included);
   - sends a signed sample article (`event: "test"`).
3. If the URL answers 2xx, **Save connection** unlocks. Next calls Laravel:
   `POST /sites/{site}/publishing/connections` with
   `{ platform: "custom", method: "webhook", credentials: { webhook_url, secret }, config: { provider: "make" | "lovable" | "replit" } }`.
4. From then on, **Laravel** sends every published or updated article to that URL in the same signed format.

The request format, so Laravel and the receivers agree:

```
POST <webhook_url>
Content-Type: application/json
User-Agent: Rankoya-Webhooks/1.0
X-Rankoya-Event: test | article.published | article.updated
X-Rankoya-Timestamp: <unix seconds>
X-Rankoya-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<raw body>", key = secret>

{ "event": "...", "sent_at": "...",
  "site":    { "id", "name", "url" },
  "article": { "id", "title", "slug", "meta_title", "meta_description", "content_html",
               "language", "featured_image", "published_at", "updated_at" } }
```

Reference code: `src/lib/integrations/webhook.ts`.

### Why it fails today

No provider supports `method: webhook`, so `storeConnection` refuses it with "This publishing integration is not available yet." The validation itself would pass: `credentials` is an `array` rule, so `webhook_url` and `secret` are kept.

### Backend tasks

1. Add a `WebhookPublishingProvider` and register it. `supports()` should be `method === 'webhook'`.
   - `publish()` / `update()`: build the body above, sign it, POST it; 2xx means success. Store the HTTP status in `response_metadata`.
   - `testConnection()`: send the same body with `event: "test"`.
2. In `storeConnection`, when `method = webhook`, require `credentials.webhook_url` (`url`, https) and `credentials.secret`. Allow `config.provider` (`in:make,lovable,replit`).
3. Retry 5xx and timeouts from the queue (for example 1, 5 and 30 minutes). Don't follow redirects.
4. Refuse private and internal IPs at send time too: the address can change after the test.

### Your Make webhook

A signed test sent to `https://hook.us2.make.com/011nq2q9…` on 10 Nov came back **410**. Make answers 410 when no scenario is listening on that webhook. To fix it:

1. Open the scenario that has the Custom webhook module and click the module, so it shows it's waiting for data. Or click **Run once**.
2. Send the test again from Rankoya (Integrations → Make).

Make should then show "Successfully determined". The dialog now explains a 410 in plain words instead of "error 410".

## 4. RSS / JSON feed

### The flow

1. **Get feed link** asks Next's `/api/integrations/rss?site=<id>` for the links. Next checks the user can open the site, then returns:
   - RSS: `https://app.rankoya.uk/api/feeds/<siteId>.<signature>`
   - JSON: the same link with `?format=json`

   The signature is an HMAC of the site ID using `FEED_TOKEN_SECRET`. Nobody can guess another site's link, and nothing has to be stored.
2. Feed readers, Make's RSS module, or a Lovable / Replit page open the link. Nobody is logged in.
3. `/api/feeds/<token>` checks the signature, fetches the site and its published articles **from Laravel**, and returns RSS 2.0 or JSON Feed 1.1. Responses are cached for 5–15 minutes.

### Why it fails today

Step 3 needs to read Laravel without a user, using `BACKEND_SERVICE_TOKEN`. That token doesn't exist yet.
A normal token wouldn't be enough anyway: `SiteController@show` and the article list only return sites in the token owner's **active workspace**, so one account can't read every customer's site.

### Backend tasks (pick one)

- **Recommended:** one internal route, `GET /internal/sites/{site}/feed`, protected by a shared secret header or a Sanctum token with a single `feeds:read` ability. It returns the site (`id, name, url, language`) and its 50 newest published articles (`id, title, slug, meta_title, meta_description, content, language, media, metadata, published_at, updated_at, created_at`). No workspace check: the frontend's signed link already decides which site may be read. The frontend already calls this route (`src/app/api/feeds/[token]/route.ts`).
- Or: a service account whose token skips the workspace check on `GET /sites/{site}` and `GET /sites/{site}/articles`. This is more invasive.

Please also answer:
- Which article status belongs in the feed (`published` today)?
- Can articles carry their live URL (`metadata.published_url`)? Without it, feed items have no link.

## 5. What each side owns

| | Next (this repo) | Laravel |
|---|---|---|
| Wix | Start / callback, signature check, blog check | Save `instance_id`, make tokens, publish to Wix Blog |
| Make, Lovable, Replit | Test send, signing secret, prompt | Save URL and secret, send real articles, retries |
| RSS / JSON | Signed links, the feed itself | Read-only feed data (internal route or service token) |
| Secrets | `INTEGRATIONS_STATE_SECRET`, `FEED_TOKEN_SECRET`, `WIX_APP_ID`, `WIX_APP_SECRET`, `WIX_SHARE_URL_ID` | `WIX_CLIENT_ID`, `WIX_CLIENT_SECRET` (same values), the feed token or secret |

## 6. Credits indicator stuck loading

**Cause.** The topbar pill calls `GET /credits/balance`. On the live server that route doesn't exist:

```
GET https://api.rankoya.uk/api/credits/balance
404 {"message": "The route api/credits/balance could not be found.", ...}
```

`GET /api/sites` on the same server answers 401 as expected, so the server is up. It just doesn't have the newer route.
The route *is* in the backend repo (`routes/api.php` line 55 → `Api\CreditWalletController@show`, pushed to `origin/main`). Either the latest `main` isn't deployed, or Laravel's route cache wasn't rebuilt after deploying.

**What the frontend does.** While the request is in flight, and during one retry (about 1 s apart, ~3 s per request on this server), the pill shows a loading shape. When the request fails, the pill hides. So you see the loading shape for several seconds, then nothing. It never shows a number because there's no number to show.

**Fix (backend / server):**

```bash
cd /var/www/ai-seo-project
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force          # credit_wallets / api_usage_logs tables, if not there yet
php artisan optimize:clear && php artisan optimize   # rebuilds the route and config cache
```

Then `curl -H "Accept: application/json" https://api.rankoya.uk/api/credits/balance` should answer **401** (route exists, needs login) instead of 404. Reload the app; the pill shows the balance, or `0` in red for a new wallet.

**Also on that server:** the 404 response includes a full stack trace and the server path (`/var/www/ai-seo-project/...`). That means `APP_DEBUG=true` in production. Set `APP_DEBUG=false` in the live `.env` and run `php artisan config:cache`. Debug output can leak secrets and internals.

## 7. Order of work

1. **Server:** deploy `main`, clear caches, set `APP_DEBUG=false`. Fixes credits.
2. **Backend:** `WebhookPublishingProvider` and validation (section 3). Make, Lovable and Replit can then save and publish.
3. **Backend:** Wix app support (section 2), plus the Wix env values.
4. **Backend:** feed route or token (section 4). The RSS / JSON links start working with no frontend change other than the URL.
5. **Frontend:** once 2–4 are live, run `docs/integrations-testing.md` end to end.
