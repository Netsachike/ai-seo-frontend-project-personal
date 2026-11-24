# Rankoya Wix app: App Market submission pack

Everything needed to clear the 8 blockers in the Wix Dev Center, in the order Wix lists them.
Items marked **⚠ YOU** need a decision or information only you have. Everything else can be pasted as is.

| # | Blocker | Status |
|---|---|---|
| 1 | Images | Ready: `images/screenshots/` (4 images) |
| 2 | App icon | Ready: `images/app-icon-1000x1000.png` |
| 3 | Company info | Ready (NETSACH TECH LTD, from netsachtech.co). **⚠ YOU** pick the address |
| 4 | At least one extension | **⚠ Not built yet.** See section 4 |
| 5 | Contact info | **⚠ YOU** need a phone number and the billing/urgent mailboxes |
| 6 | App category | Ready |
| 7 | Search keywords | Ready |
| 8 | Privacy and security questionnaire | Answers drafted below. **⚠ YOU** confirm before approving |

---

## 1. Images

Wix spec: JPG or PNG, at least 1200 × 900 px, ratio 4:3.
Ours: PNG, **2400 × 1800 px** (4:3, rendered at 2× so they stay sharp). Upload them in this order:

| File | What it shows | Caption / alt text |
|---|---|---|
| `images/screenshots/01-overview.png` | Overview: AI visibility score, mentions per AI assistant, next action | Be the answer on Google and in AI search |
| `images/screenshots/02-ai-visibility.png` | AI visibility table and ranking stats | See where your business shows up on Google and in AI answers |
| `images/screenshots/03-approve-articles.png` | Article draft with an Approve / Edit / Reject card | Nothing goes live until you approve it |
| `images/screenshots/04-wix-blog-publishing.png` | How it works plus an article live on a Wix Blog | Approved articles are published straight to your Wix Blog |

The images show a sample brand ("Northwind Roasters") and sample numbers. Image 02 carries a "Sample data shown for illustration" note.
To change the wording or layout, edit `source/shots.html` and run:

```
NODE_PATH=./node_modules node wix/source/render.js "$(pwd)"
```

## 2. App icon

Wix spec: square JPG or PNG, 1000 × 1000 px.
File: **`images/app-icon-1000x1000.png`**. It's the Rankoya "R with rising arrow" on full-bleed navy `#05112C`. It has square corners because Wix rounds them itself.

## 3. Company info

This is the company that publishes the app (NETSACH TECH LTD), not Rankoya itself. Sources: https://netsachtech.co (home, about-us, contact-us, privacy, terms-service, all read on 14 Nov 2026) and the `netsachtech_landing` repo (`src/data/site.ts`, `src/assets/`).

Fields in the order the Wix form shows them:

**Company logo \***
`images/netsach-logo-square-1000x1000.png`: the Netsach network mark in its rounded frame, on white. Use this one, because the Wix slot is square and shown small.
Alternatives: `images/netsach-logo-lockup-square-1000x1000.png` (mark and wordmark, centred on a white square) and `images/netsach-logo-lockup.png` (the original 469 × 219 lockup).
Note: the only source file is 469 × 219 px, so the square mark is upscaled and slightly soft. If Netsach has a vector or a larger PNG of the logo, render it again from that.

**Company name \***
```
NETSACH TECH LTD
```

**Company description** (757 / 1200 characters):
```
NETSACH TECH LTD (Netsach Technologies) is a digital technology company that builds, markets and supports its own software products, including Rankoya, Localmator, ViralGenius and Flowcasta, used by more than 20,000 people in 37 countries. We use cutting-edge technology and the internet to help businesses stand out, reach more customers and grow.

Rankoya is our AI SEO platform. It shows a business where it ranks on Google and whether AI assistants such as ChatGPT, Claude, Gemini and Perplexity mention it. It then writes SEO articles and publishes them to the business's Wix Blog, only after the owner approves each one.

We value work ethic, integrity and results, and we keep supporting what we ship long after launch.
```
The product names, "20,000+ users" and "37 countries" are the figures netsachtech.co and the landing repo publish.

**Company address \***
**⚠ YOU: pick one. Netsach's own site lists three different addresses:**

| Where it appears | Address |
|---|---|
| netsachtech.co/privacy and /terms-service ("company address") | 4 Unity Close, off Ada George, Port Harcourt, Rivers State, Nigeria |
| netsachtech.co/contact-us | NO 2, DAN ORJI CLOSE RUMUOKE, RUMUOKE ADA GEORGE, RIVERS STATE, NIGERIA (exactly as published) |
| netsachtech.co/contact-us | 651 N Broad St, Suite 206, Middletown, DE 19709, USA |

Recommended: **4 Unity Close, off Ada George, Port Harcourt, Rivers State, Nigeria**. It's the address Netsach's own legal documents give as the company address, and the About page says the company is in Nigeria. Use the registered office from the company's CAC registration if that's different.

Reviewers compare this address with the one in the linked privacy policy, so all of them need to match:
- **Rankoya's legal pages** (`src/config/product.ts`) say *3568 Dodge Street, Omaha, NE 68131* and *England and Wales*. That's a fourth address, and neither value matches Netsach's. Update `address` (and `jurisdiction`, if the company isn't under English law) to the address you choose before submitting. Want me to make that change?
- On netsachtech.co, the Contact page and the Privacy/Terms pages give different Nigerian addresses. Worth fixing on that site too.

**Company website**
```
https://netsachtech.co
```

**Privacy policy link \***
```
https://app.rankoya.uk/privacy-policy
```
Recommended over netsachtech.co/privacy. Rankoya's policy names NETSACH TECH LTD as the controller and describes the data this app actually handles: connected-platform credentials, publishing, AI processing and deletion. Netsach's general policy (updated 2026-01-01) doesn't cover the Rankoya app. Both URLs load (HTTP 200).

**Checkbox:** "By registering my company, I agree to receive Wix Developers emails & updates". Required to submit the form.

### App listing text (you'll be asked for this alongside the blockers)

**App name:** Rankoya: AI SEO & Blog Writer

**Teaser / short description:**
> Rank on Google and in AI answers. Rankoya writes SEO articles and publishes them to your Wix Blog.

**Full description:**
> Customers now find businesses two ways: on Google, and by asking AI assistants like ChatGPT, Claude, Gemini and Perplexity. Rankoya shows you where you stand in both, and does the work to improve it.
>
> **Measure.** Track your Google keyword positions and whether AI assistants mention your business when customers ask about what you sell. Compare your share of voice with your competitors.
>
> **Write.** Rankoya plans articles from real search data and drafts them in your brand's voice: guides, comparisons and answers to the questions your customers ask.
>
> **Approve.** Nothing goes live without your OK. Read, edit or reject each draft, or schedule it on the content calendar.
>
> **Publish to Wix.** Connect your Wix site once. Approved articles are published as Wix Blog posts automatically, with no copying and pasting.
>
> Requires Wix Blog on your site. A Rankoya account is needed (sign up at app.rankoya.uk).

**Key benefits** (if Wix asks for 3):
1. See your rankings on Google and your mentions in AI answers in one place
2. SEO articles written for your business, in your voice
3. Approved articles published straight to your Wix Blog

**Pricing:** Rankoya bills on its own site (Paddle), not through Wix. In the pricing section choose the external pricing / "pricing on our site" option, if Wix offers it to your account. **⚠ YOU:** Wix sometimes asks paid apps to use Wix Billing, so check which options the pricing form shows.

## 4. Extension (not built yet: this is the real blocker)

Wix won't list an app that only works through the installer and API calls. It needs at least one thing the user can open inside Wix. Rankoya has none today: install, token and publishing all happen on our side.

**Recommended: one Dashboard Page extension.** It's a page in the site owner's Wix dashboard, under Apps → Rankoya, that loads a URL of ours in an iframe.

- **Iframe URL:** `https://app.rankoya.uk/wix/dashboard`. Wix adds `?instance=<signed instance>` and other params.
- **What the page should do:**
  1. Verify `instance` with the app secret (same HMAC check as the install callback) to get the `instanceId`.
  2. Find the Rankoya site whose Wix connection has that `instance_id`, and show its connection status ("Connected to Rankoya: publishing to Wix Blog"), the last articles published, and an **Open Rankoya** button (new tab, since `app.rankoya.uk` sign-in can't run inside the iframe).
  3. If no Rankoya site is linked yet, show a **Connect** button that starts the normal Rankoya flow.
- **Dev Center:** open your app → Extensions → Create extension → Dashboard Page, then paste the iframe URL and set the page name to "Rankoya".
- **Code needed:** a new route at `src/app/wix/dashboard/page.tsx`, outside the signed-in layout. It must also be allowed to load in an iframe from `*.wix.com` (`Content-Security-Policy: frame-ancestors https://*.wix.com https://*.editorx.com`), so check `next.config.ts` headers. A backend lookup by `instance_id` is needed too, or Next can read it through the existing connection endpoints.

This is a few hours of work. Wix reviewers open the extension, so it must load and say something useful even for a site that isn't connected yet.

## 5. Contact info

Wix needs 3 emails and a phone number. These are private to Wix and not shown on the listing.

| Field | Value |
|---|---|
| Support email | support@rankoya.uk (already used in the app and legal pages) |
| Billing email | **⚠ YOU:** `billing@rankoya.uk` (create the mailbox or alias first), or Netsach's `info@netsachtech.co` |
| Urgent matters email | **⚠ YOU:** `info@netsachtech.co` (published on netsachtech.co), or a founder's direct address. It must be read quickly; Wix uses it for security and outage issues |
| Phone | `+234 810 853 3365` (netsachtech.co footer; the contact page says WhatsApp only). Alternatives: `+1 507 825 8247` (contact page, "calls only") or `+234 806 406 7042` (landing repo). **⚠ YOU:** pick the one that's answered by voice |

## 6. App category

**Marketing → SEO.** If the form also lets you pick a secondary category, add **Blog** (or **Content / Writing tools**, if that's the closest).

## 7. Search keywords (max 5)

1. SEO
2. AI SEO
3. blog writer
4. AI content
5. Google ranking

(Alternates if any are rejected: *AI visibility*, *ChatGPT SEO*, *article writer*, *keyword tracking*.)

## 8. Privacy and security questionnaire: drafted answers

These are based on what the code does today (`docs/wix-backend-integration.txt`). **⚠ YOU:** confirm each one before ticking Approve.

**What Wix data does the app access?**
- The app instance details from the install: `instanceId`, the site's `metaSiteId` and the `siteOwnerId` (used as the blog post author).
- Wix Blog: reads blog categories (to check Wix Blog is installed) and creates and publishes blog posts the site owner approved in Rankoya. Reads a published post's URL to show the live link.
- The app does **not** read site visitors', members' or customers' personal data, contacts, orders or payments.

**Permissions (Dev Center → Permissions)** should be limited to Wix Blog post management (create/publish posts, read categories and posts). Open issue: the Ricos HTML→rich-content converter returns 403 today. Either add that permission, so articles keep their headings, links and images, or have the backend build rich content itself. If you add a permission after users install, they must reinstall.

**Is personal data stored?** Only of the Rankoya account holder (name, email), under Rankoya's privacy policy. From Wix, Rankoya stores `instance_id`, `site_id` and `author_member_id` on the publishing connection. **No Wix access token is stored.** A short-lived token (~4 hours) is generated for each publish.

**Where is data stored and how is it protected?** On Rankoya's servers (api.rankoya.uk). It's encrypted in transit (HTTPS) and at rest, with role-based access in workspaces (privacy policy §11). **⚠ YOU:** fill in the hosting provider and region the form asks for.

**Third parties / sub-processors:** AI model providers (OpenAI, Anthropic, Google, Perplexity) for drafting and visibility checks, plus hosting, email and error monitoring, all as listed in privacy policy §4 and §8. No Wix data is sold or shared for advertising.

**Data deletion / uninstall:** disconnecting in Rankoya deletes the stored connection (privacy policy §9). When the app is uninstalled, the token call fails and publishing stops. **⚠ To confirm with backend:** handle Wix's "App Removed" webhook (already verified in `WixOAuthController@webhook`) to mark the connection removed and delete the stored IDs. Wix reviewers usually expect this, so say "yes" only once it's live.

**GDPR / data-subject requests:** handled via support@rankoya.uk, with a response within one month (privacy policy §12).

**Security contact:** the "urgent matters" email from section 5.

---

## Before you press Submit

- [ ] The extension from section 4 is built, deployed and added in the Dev Center
- [ ] Billing and urgent mailboxes exist, and a phone number is entered
- [ ] The company address is chosen, and `src/config/product.ts` (Rankoya's legal pages) is updated to match it
- [ ] The App Removed webhook is live, or the questionnaire answer matches reality
- [ ] Once the app is public, drop `shareUrlId` from the installer link the backend builds (`publishing/wix/authorize`). It's only for unlisted installs
- [ ] Install the app on a fresh Wix site with Wix Blog, approve an article, and check it appears on the blog: reviewers will do exactly this
