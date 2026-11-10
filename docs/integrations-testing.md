# Testing the new integrations

How to test Wix, Make, Lovable, Replit and the RSS feed before they go to production.
Duda and Zapier are hidden from the catalog: Duda's API needs a paid plan and Zapier's webhooks are paid.
Their code stays in the repo (`/api/integrations/duda/verify`, `src/features/publishing/duda.ts`) for when there's an account to test with.

## What works without the backend

| Integration | Works end to end in Next today | Needs the backend before it's production ready |
|---|---|---|
| Wix | Install, signature check, token, Wix Blog check | Saving a connection with `instance_id` and publishing with app tokens |
| Make | Test article reaches the scenario | Saving a `webhook` connection and sending real articles |
| Lovable / Replit | Test article reaches the app's endpoint | Same as Make |
| RSS / JSON feed | Feed links in the dialog | `BACKEND_SERVICE_TOKEN` so the feed can read published articles |

## 1. Environment

Copy these into `.env.local` (local) and the Vercel project settings (preview and production):

| Variable | Value | Needed for |
|---|---|---|
| `APP_URL` | The public https URL, e.g. `https://app.rankoya.uk`. Leave empty on Vercel previews. | Wix callback, feed links |
| `INTEGRATIONS_STATE_SECRET` | `openssl rand -base64 32` | Wix, feeds (fallback) |
| `FEED_TOKEN_SECRET` | `openssl rand -base64 32` (optional; falls back to the one above) | RSS / JSON feed |
| `WIX_APP_ID`, `WIX_APP_SECRET` | From the Wix app (section 2) | Wix |
| `WIX_SHARE_URL_ID` | Only while the Wix app is unlisted | Wix |
| `BACKEND_SERVICE_TOKEN` | From the backend team | RSS / JSON feed |

Restart `next dev` after changing env vars.

Wix only redirects to https, so test Wix on a Vercel preview or through a tunnel (`cloudflared tunnel --url http://localhost:3000`, then set `APP_URL` to the tunnel URL).
Make, Lovable and Replit can be tested on `localhost`: the test article is sent from the Next server outward.

## 2. Wix

### Create the right kind of app

The screen with **Allowed redirect domains**, **Allowed authorization redirect URIs** and `OAuthStrategy({ clientId })` is a **Wix Headless** OAuth client.
That's for building your own frontend on top of one Wix site you own; it has no client secret and can't act on customers' sites.
Rankoya needs a **Wix App** instead:

1. In Wix Studio → **Custom Apps** → **Create New App** → **Self-Managed**.
2. In the app's **OAuth** settings, copy the **App ID** into `WIX_APP_ID` and the **App Secret Key** into `WIX_APP_SECRET`.
3. There is no redirect URL field: new Wix apps can't use custom authentication. Rankoya sends the return address (`/api/integrations/wix/callback`) inside the install link as `postInstallationUrl`, and Wix comes back to it with `signedInstance`.
4. Under **Permissions**, add the Wix Blog permission that lets the app manage posts (**Manage Blog**). Rankoya also reads blog categories to check Wix Blog is installed.
5. Leave the app unlisted while testing. Copy the GUID from its share/install link into `WIX_SHARE_URL_ID`.

Two things in `src/lib/integrations/connectors/wix.ts` were written from the guide and still need checking against the live Wix app:
the installer URL (`https://www.wix.com/app-installer` with `appId`, `shareUrlId`, `postInstallationUrl`) and the token call (`client_credentials` at `https://www.wixapis.com/oauth2/token` with `instance_id`).
If Wix sends the user somewhere else, check the app's install settings first.

### Test it

1. Use a Wix site with **Wix Blog** added.
2. Integrations → **Wix** → **Continue to Wix**, or pick Wix in site setup step 6 and click **Install on Wix**.
3. Pick the site in Wix and approve.
4. Expected: back on the same page with "Wix connected".

| Result | Meaning |
|---|---|
| `Connecting Wix isn't set up yet` | `WIX_APP_ID`, `WIX_APP_SECRET` or `INTEGRATIONS_STATE_SECRET` (32+ chars) missing |
| `The connection link expired` | Took over 10 minutes, or the callback ran on a different host than the start (check `APP_URL`) |
| `details we couldn't verify` | Wrong `WIX_APP_SECRET` |
| `didn't give Rankoya access` | Token call failed: check the app's permissions |
| `Add Wix Blog to your site` | The site has no Wix Blog |
| `installed, but we couldn't save` | Expected until the backend accepts the app connection (section 6) |

## 3. Make

1. In Make, create a scenario and add **Webhooks → Custom webhook**. Click **Add**, name it `Rankoya`, copy the URL. Leave the module on "Redetermine data structure" (it listens after you click it).
2. Integrations → **Make** → paste the URL → **Send test article**.
3. Expected: "Test article delivered" in Rankoya, and **Successfully determined** in Make with the fields `event`, `site`, `article`.
4. Click **Save connection**.

Then check:
- The card shows Make as connected. If it shows **Reconnect**, the backend saved it as `pending` or rejected it (section 6).
- Typing `http://…`, `https://localhost`, `https://192.168.1.10/…` or a made-up domain shows an error and sends nothing.

## 4. Lovable and Replit

1. Integrations → **Lovable** (or **Replit**). Copy the prompt and the signing secret.
2. Paste the prompt into Lovable chat or Replit Agent. Give it the secret as `RANKOYA_WEBHOOK_SECRET` when asked (Replit: **Secrets**).
3. Publish / deploy the app. Replit: use a deployment, not the dev URL.
4. Paste the endpoint URL → **Send test article**. Expected: "Test article delivered" and nothing stored in the app (test events are ignored).
5. Check the signature is enforced: in the app, change the secret, send the test again. Expected: `The URL answered with error 401`. Put the right secret back.
6. **Save connection**.

To test a real article before the backend sends them, sign one by hand:

```bash
SECRET='whsec_…'; URL='https://…/api/rankoya-webhook'; TS=$(date +%s)
BODY='{"event":"article.published","sent_at":"2026-01-01T00:00:00Z","site":{"id":1,"name":"Test","url":"https://example.com"},"article":{"id":1,"title":"Hello","slug":"hello","meta_title":"Hello","meta_description":"First post","content_html":"<p>Hi</p>","language":"en","featured_image":null,"published_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z"}}'
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')
curl -i -X POST "$URL" -H 'Content-Type: application/json' -H "X-Rankoya-Event: article.published" \
  -H "X-Rankoya-Timestamp: $TS" -H "X-Rankoya-Signature: sha256=$SIG" --data "$BODY"
```

Expected: `200`, and `/blog/hello` shows the post.

## 5. RSS and JSON feed

1. Integrations → **RSS feed** → **Get feed link**. Two links: RSS and JSON (`?format=json`).
2. Without `BACKEND_SERVICE_TOKEN` the dialog says the feed isn't live, and the links return `503 Feeds aren't set up yet.`
3. With the token, open both links:
   - RSS: validate at [validator.w3.org/feed](https://validator.w3.org/feed/) (needs a public URL: preview or tunnel).
   - JSON: one item per published article, newest first, with `content_html`.
4. Change one character of the token in the URL. Expected: `404 Feed not found.`
5. Same site, two users: both get the same link (it's per site, not per user).
6. In Make, add **RSS → Watch RSS feed items** with the RSS link. It should list the articles.

Feeds cache for 5 minutes in the browser and 15 at the edge, so new articles can take that long to show.

## 6. Backend changes (send to the Laravel team)

**Wix app connections.** `POST /sites/{site}/publishing/connections` must accept, for `platform: wix`:
`credentials: { instance_id, site_id }`, `config: { auth: "app" }`, with no `access_token`.
When publishing, mint a token each time: `POST https://www.wixapis.com/oauth2/token` with
`{ grant_type: "client_credentials", client_id: WIX_APP_ID, client_secret: WIX_APP_SECRET, instance_id }`.
`POST …/{id}/test` should do the same and list blog categories. Laravel needs the same `WIX_APP_ID` / `WIX_APP_SECRET`.

**Webhook connections (Make, Lovable, Replit).** Accept:

```json
{ "name": "Make · example.com", "platform": "custom", "method": "webhook",
  "credentials": { "webhook_url": "https://hook.eu2.make.com/…", "secret": "whsec_…" },
  "config": { "provider": "make" } }
```

- Store `webhook_url` and `secret` encrypted, like other credentials. Set the connection `active` (Next already sent a test that passed).
- On publish (and on update, with `article.updated`), POST to `webhook_url`:
  - Headers: `Content-Type: application/json`, `User-Agent: Rankoya-Webhooks/1.0`, `X-Rankoya-Event`, `X-Rankoya-Timestamp` (unix seconds), `X-Rankoya-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<raw body>" with secret>`.
  - Body: `{ event, sent_at, site: { id, name, url }, article: { id, title, slug, meta_title, meta_description, content_html, language, featured_image, published_at, updated_at } }`.
  - Reference implementation: `src/lib/integrations/webhook.ts`.
- A 2xx response means published. Retry 5xx / timeouts with backoff (e.g. 1m, 5m, 30m), and don't follow redirects.
- Refuse private and internal addresses again at send time (DNS can change after the test).
- `POST …/{id}/test` for webhooks: send the same `test` event.

**Feed route.** `GET /internal/sites/{site}/feed?limit=50` → `{ data: { site, articles } }`, authenticated by `X-Internal-Token` (or a Sanctum token with `feeds:read`). Its token goes in `BACKEND_SERVICE_TOKEN`. Full spec: the backend brief PDF, section 5.
Please also confirm:
- Which status the feed should list. It uses `published` now, but sites without an API connection may never reach it.
- That articles can carry their live URL (`metadata.published_url`), so feed items get a link. Without it, items have no link.

## 7. Production checklist

- [ ] All env vars in section 1 set on Vercel production, `APP_URL` = the production domain.
- [ ] Wix app redirect URL set to the production callback; app submitted for review if it should be listed (then drop `WIX_SHARE_URL_ID`).
- [ ] Backend changes in section 6 deployed; a Make connection saves as `active`.
- [ ] One real article published to each of Wix, Make, Lovable, Replit and visible on the other side.
- [ ] RSS link validates; a changed token returns 404.
- [ ] Arabic strings: `src/messages/ar.json` has no `integrations` section yet.
