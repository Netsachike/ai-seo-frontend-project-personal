# Rankoya landing page: implementation plan (v2)

A modern, responsive, high-conversion marketing site for **Rankoya** at `landing_page/rankoya/` (standalone repo: `favour-the-dev/rankoya_landingpage`). Section flow is modelled on [rankyak.com](https://rankyak.com/); everything visual and verbal follows the Rankoya brand guide.

This is v2 of the plan. v1 lives in the app repo history (`docs/landing_page_implementation_Plan.md`). Section 1 lists what changed and why.

---

## 0. Context

| Item               | Detail                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product            | Rankoya: AI SEO and AI-search visibility. Tagline _Be the answer._                                                                                                    |
| Repo               | `landing_page/rankoya/`, its own git repo, deployed on its own. Not part of the app's build.                                                                          |
| Stack              | Next 16.4 (App Router, `cacheComponents` + `partialPrefetching` on), React 19.3, Tailwind 4 through `@tailwindcss/turbopack` (no PostCSS), TypeScript strict          |
| Added dependencies | `motion` 14, `lucide-react`, `next-themes`, `class-variance-authority`, `clsx`, `tailwind-merge`; dev: `prettier`, `prettier-plugin-tailwindcss`                      |
| Brand source       | App repo: `docs/rankoya_brand_identity.md` (wins on conflict), `src/app/globals.css`, `src/components/brand/logo.tsx`, `src/config/brand.ts`, `src/config/pricing.ts` |
| Marketing URL      | `https://rankoya.uk` (`NEXT_PUBLIC_SITE_URL`)                                                                                                                         |
| App URL            | `https://app.rankoya.uk` (`NEXT_PUBLIC_APP_URL`). Auth routes are `/sign-in` and `/sign-up`; there is no `/login`.                                                    |
| Company            | NETSACH TECH LTD                                                                                                                                                      |

### Decisions already made (from v1 open questions)

| #   | Question        | Answer                                                   | How v2 applies it                                                                                                                                   |
| --- | --------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CTA destination | The app's auth page                                      | "Get started" → `app.rankoya.uk/sign-up`, "Log in" → `app.rankoya.uk/sign-in`. `/login` does not exist in the app. Both URLs live in `lib/site.ts`. |
| 2   | Google sign-in  | Single "Get started" CTA                                 | Hero has one button. No Google button, no second hero button.                                                                                       |
| 3   | Press logos     | Keep the marquee, show our platform integrations instead | Logo marquee under the hero with the real integrations and engines. Labelled "Works with" so it doesn't read as an endorsement by those companies.  |
| 4   | Demo video      | Static screenshot and animated mockups                   | Product showcase is a coded, animated dashboard mockup (crisp at any size, themed, no stale screenshot). A real screenshot can replace it later.    |
| 5   | Testimonials    | Use fictional ones                                       | Allowed, but each card carries a visible "Illustrative example" label (PRODUCT.md forbids passing off invented proof as real).                      |
| 6   | Dependencies    | Add `motion` and `lucide-react`                          | Added, plus `next-themes` (theme toggle), `cva`/`clsx`/`tailwind-merge` (component variants, matching the app).                                     |

---

## 1. Gaps found in v1 and how v2 fixes them

| #   | Gap in v1                                                                                                      | Fix in v2                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Called the palette "Ink and Signal" (PRODUCT.md's old lime-signal guide).                                      | The live palette is **Blue and Navy** with Signal **Violet** `#5B47F5`. Tokens are copied from the app's `globals.css`; the brand guide wins on conflict.                                                                      |
| 2   | Phase 1 adds `@tailwindcss/postcss`.                                                                           | The scaffold compiles CSS with `@tailwindcss/turbopack` in `next.config.ts`. No PostCSS config is needed or added.                                                                                                             |
| 3   | CTAs pointed to `/login`.                                                                                      | The app's routes are `/sign-in` and `/sign-up`. A signed-out `/login` would bounce to `/sign-in?next=/login` and 404 after sign-in.                                                                                            |
| 4   | Hero had two CTAs, a mock "4.8/5" star rating and an "X articles generated" counter.                           | One CTA (decision 2). Fabricated ratings and counters removed (PRODUCT.md: "do not fabricate them"). The proof strip states product facts instead: platforms tracked, approval before publishing, Telegram approvals.          |
| 5   | "Now tracking AI answers across 5 engines".                                                                    | The app tracks 6 platforms: Google, Google Maps, ChatGPT, Claude, Gemini, Perplexity. Copy names them and doesn't round.                                                                                                       |
| 6   | Product showcase reused `docs/reference_image.png`.                                                            | That image is an off-brand "SEO Pilot" concept (John Doe, Acme Agency, rocket logo). It must not ship. The showcase is a coded Rankoya dashboard using the app's mock entities (Northwind Roasters and its competitors).       |
| 7   | Social proof section said "stub or omit".                                                                      | Replaced by the integrations marquee (decision 3).                                                                                                                                                                             |
| 8   | Integrations listed Zapier, Make and Wix/Webflow next to things the app doesn't have.                          | Only real providers from the app's integration catalog: WordPress, Shopify, Webflow, Wix, Ghost, Google Search Console, Google Analytics, Telegram. Official marks come from the app's `assets/icons/platforms`.               |
| 9   | Pricing tiers "Free / Professional / Agency", "All plans include a free trial. No credit card required."       | Tiers match the app's `PlanName`: Free, Professional, Agency, plus White Label for resellers. All prices are `null` in the app, so cards show "Pricing coming soon". The free-trial / no-card line is removed until confirmed. |
| 10  | Announcement banner and hero announcement pill both planned.                                                   | One: the pill inside the hero. A separate banner pushes the hero below the fold on phones.                                                                                                                                     |
| 11  | Wordmark described as lowercase "rankoya" in Geist.                                                            | The shipped lockup is the title-case "Rankoya" image with the R-and-arrow mark. v2 uses the app's PNG artwork (light and dark), as the app's `Logo` component does.                                                            |
| 12  | SEO plumbing was "add OG and Twitter tags". For an SEO product's own site, that's not enough.                  | `metadataBase`, canonical URL, title template, generated OG image, Twitter card, `robots.ts`, `sitemap.ts`, JSON-LD (`Organization` + `SoftwareApplication`), favicon/icon/apple-icon from the app, `viewport.themeColor`.     |
| 13  | "Add viewport meta".                                                                                           | Next adds the viewport tag. Theme colour goes in the `viewport` export, not `metadata`.                                                                                                                                        |
| 14  | Dark mode was "toggle optional", with no mechanism for applying `.dark`.                                       | `next-themes` with `attribute="class"`, system default, a header toggle, and `suppressHydrationWarning` on `<html>`.                                                                                                           |
| 15  | Accessibility (skip link, focus, ARIA, reduced motion) was left to the final phase.                            | Built into every phase. Each phase has its own acceptance checks (section 4).                                                                                                                                                  |
| 16  | No plan for the sticky header covering anchor targets, or for the mobile menu's focus, Escape and scroll lock. | `scroll-margin-top` on sections; mobile menu is a modal dialog with focus trap, Escape to close, body scroll lock and focus return.                                                                                            |
| 17  | Hero headline faded in from opacity 0.                                                                         | That delays Largest Contentful Paint. The `h1` and hero copy render visible; only decorative mockups animate.                                                                                                                  |
| 18  | Motion setup unspecified.                                                                                      | `motion/react` through `LazyMotion` + `m` (smaller bundle) inside `MotionConfig reducedMotion="user"`. One shared `Reveal` component.                                                                                          |
| 19  | Copy scattered across components; mock data hard to swap.                                                      | All copy and mock data in `content/` modules, all URLs in `lib/site.ts`. Components take no hard-coded strings. This also makes later translation easier.                                                                      |
| 20  | Components in `app/components`.                                                                                | `components/{layout,sections,ui,brand,mockups}` at the project root, `lib/`, `content/`. `app/` holds routes and metadata files only.                                                                                          |
| 21  | `cacheComponents` constraints ignored.                                                                         | Pages are fully static. Nothing in server render reads the clock or request data (for example, the footer year is a constant, not `new Date()`).                                                                               |
| 22  | Responsive display type "44→60px" didn't exist in the token set.                                               | Marketing type scale added as fluid `clamp()` utilities (`text-hero`, `text-section`), alongside the app's fixed scale.                                                                                                        |
| 23  | Footer links to Terms/Privacy/Cookies with no target.                                                          | The app hosts `/privacy-policy`, `/terms-of-service`, `/refund-policy`; the footer links there. No cookie policy is linked until one exists.                                                                                   |
| 24  | No deployment, environment or analytics plan.                                                                  | Section 6.                                                                                                                                                                                                                     |
| 25  | Verification was only build, lint and Lighthouse.                                                              | Adds `typecheck` and `format:check` scripts, a per-phase checklist and a banned-words grep.                                                                                                                                    |
| 26  | The parent app repo doesn't ignore `landing_page/`.                                                            | Add `landing_page/` to the app repo's `.gitignore` so the nested repo is never committed into it as a gitlink.                                                                                                                 |

---

## 2. Page structure

| #   | Section            | Anchor          | Phase | RankYak equivalent  |
| --- | ------------------ | --------------- | ----- | ------------------- |
| 1   | Header             | none            | 2     | Sticky header       |
| 2   | Hero (with pill)   | `#top`          | 2     | Hero + announcement |
| 3   | Works-with marquee | `#works-with`   | 2     | "As seen in"        |
| 4   | Product showcase   | `#product`      | 2     | Demo video          |
| 5   | Feature deep-dives | `#features`     | 3     | Feature sections    |
| 6   | How it works       | `#how-it-works` | 4     | How it works        |
| 7   | Integrations grid  | `#integrations` | 4     | Integrations        |
| 8   | Testimonials       | `#stories`      | 5     | Success stories     |
| 9   | Pricing            | `#pricing`      | 5     | Pricing             |
| 10  | FAQ                | `#faq`          | 6     | FAQ                 |
| 11  | Final CTA          | none            | 6     | Bottom CTA          |
| 12  | Footer             | none            | 1 / 6 | Footer              |

Header nav is driven by `NAV_LINKS` in `lib/site.ts`. Each phase adds its own anchor when the section ships, so the nav never links to a section that isn't on the page.

---

## 3. File structure

```
landing_page/rankoya/
├── app/
│   ├── layout.tsx            fonts, metadata, viewport, providers, JSON-LD
│   ├── page.tsx              section composition
│   ├── globals.css           tokens, type scale, base styles
│   ├── opengraph-image.tsx   generated 1200×630 share card
│   ├── robots.ts, sitemap.ts
│   └── favicon.ico, icon.png, apple-icon.png   (copied from the app)
├── assets/
│   ├── brand/                logo + mark, light/dark (copied from the app)
│   └── platforms/            official integration + engine marks
├── components/
│   ├── brand/                logo.tsx, platform-tile.tsx
│   ├── layout/               header.tsx, mobile-menu.tsx, footer.tsx, skip-link.tsx, theme-toggle.tsx
│   ├── mockups/              dashboard-mockup.tsx (+ later feature mockups)
│   ├── providers.tsx         ThemeProvider + MotionConfig + LazyMotion
│   ├── sections/             hero.tsx, works-with.tsx, product-showcase.tsx, …
│   └── ui/                   button.tsx, container.tsx, section.tsx, reveal.tsx
├── content/                  copy and mock data per section
├── lib/                      site.ts (URLs, nav), cn.ts, json-ld.ts
└── docs/IMPLEMENTATION_PLAN.md
```

---

## 4. Phases

Every phase must pass: `npm run lint`, `npm run typecheck`, `npm run build`, keyboard-only pass, light + dark check, 375px / 768px / 1440px check, `prefers-reduced-motion` check, banned-words grep.

### Phase 1: Foundation

- Dependencies and scripts (`typecheck`, `format`, `format:check`), Prettier config matching the app.
- `globals.css`: the app's light and dark tokens verbatim, `@custom-variant dark`, the app's type scale plus fluid `text-hero` / `text-section`, motion easings, focus ring, selection colour, reduced-motion reset, `scroll-margin-top` for anchors, `.num` for tabular figures.
- `layout.tsx`: Geist / Geist Mono, `metadataBase`, title template, description, keywords, canonical, Open Graph, Twitter card, `viewport.themeColor` per scheme, `suppressHydrationWarning`, JSON-LD, skip link, providers.
- Metadata files: `opengraph-image.tsx` (navy card, lockup, "Be the answer."), `robots.ts`, `sitemap.ts`, app icons copied from the app.
- `lib/site.ts`: site/app URLs from env with production defaults, sign-in/sign-up URLs, nav links, legal links.
- UI primitives: `Button` (cva: primary/secondary/ghost, sizes; renders `<a>` for links), `Container`, `Section`, `Reveal`.
- Brand: `Logo`, `Mark` (themed artwork pair, as in the app), `PlatformTile`.
- Footer shell: lockup, tagline, legal links, "© 2026 NETSACH TECH LTD". Expanded in phase 6.
- Remove the create-next-app boilerplate (`public/*.svg`, page content, README).

**Done when:** build is clean, the page renders the header, empty main and footer shell in both themes, `/robots.txt`, `/sitemap.xml` and `/opengraph-image` resolve, and Lighthouse SEO is 100 on the shell.

### Phase 2: Header, hero, works-with, product showcase

- **Header**: sticky, transparent at top, surface background plus bottom border once scrolled (scroll listener with passive flag, state only flips on threshold). Lockup left, nav centre (≥ `lg`), theme toggle + "Log in" + "Get started" right. Below `lg`: menu button opens a full-screen dialog (focus trap, Escape, scroll lock, focus return, `aria-expanded`/`aria-controls`).
- **Hero**: announcement pill ("Now tracking Google, Maps, ChatGPT, Claude, Gemini and Perplexity"), `h1` "See where you rank on Google and in AI answers. Then close the gap." with inline engine tiles, sub-headline from the brand guide, single "Get started" button, reassurance line, proof strip of product facts (no ratings or counts).
- **Works-with marquee**: real integration and engine marks scrolling in a loop. Pauses on hover and focus, stops with reduced motion, duplicate track `aria-hidden`, edge fade masks. Static list for screen readers.
- **Product showcase**: coded dashboard mockup in browser chrome on a navy-to-midnight panel: visibility score ring, six platform cards with sparklines and deltas, a competitor rank list with "You" moving up, and an agent approval card in violet. Lines draw and numbers settle on first view; static under reduced motion. Decorative content is `aria-hidden` with a text summary for assistive tech.

**Done when:** hero `h1` is the LCP element and paints without waiting on JS, the CTA points to `/sign-up`, the menu passes a keyboard-only pass, and the marquee and mockup are still under reduced motion.

### Phase 3: Feature deep-dives

Reusable `FeatureRow` (alternating sides on `lg+`, stacked below; overline, `h2`, copy, bullet list, mockup). Five rows, each with its own coded mockup in `components/mockups/`:

1. **AI visibility**: "See where you show up in AI answers." Answer card with the brand line highlighted in violet, engine tiles, "mentioned" pill.
2. **Rankings and competitors**: "Know who outranks you, and why." Line chart, "You" in blue over orange/teal/magenta competitors; rank list.
3. **Your SEO agent**: "Approve the fix. Rankoya does the work." Approval card (Approve violet, Edit outlined), autopilot mode switch, Telegram thread hint.
4. **Content**: "Articles drafted from what's ranking now." Editor card with heading outline and "Rankoya does this" / "You do this" split.
5. **Site audit**: "Find what's holding your rankings back." Issue list with severity badges, never colour-only (icon + label).

Deltas always carry an arrow and sign, not only colour.

### Phase 4: How it works + integrations

- **How it works**: the real workflow, 6 steps: Add your site → Rankoya scans → Ranked action plan → Agent drafts → You approve (app or Telegram) → Publish. Horizontal on `lg+`, vertical timeline below. Staggered reveal.
- **Integrations grid**: grouped as in the app's catalog: Publishing (WordPress, Shopify, Webflow, Wix, Ghost), Data (Search Console, Analytics), Approvals (Telegram), AI engines tracked (ChatGPT, Claude, Gemini, Perplexity, Google, Maps).
- Header nav gains "How it works" and "Integrations".

### Phase 5: Testimonials + pricing

- **Testimonials**: 3 cards built on the mock personas (Ada Okafor / Northwind Roasters, plus an agency persona). Each card shows an "Illustrative example" tag. Replace with real quotes later through `content/testimonials.ts`.
- **Pricing**: Free, Professional (highlighted), Agency, plus a White Label strip for resellers. Feature lists match the app's plan gates. Price slots read "Pricing coming soon" while the app's prices are `null`; a single `content/pricing.ts` change turns them on. Monthly/annual toggle ships disabled until prices exist.

### Phase 6: FAQ, final CTA, full footer

- **FAQ**: native `<details>`/`<summary>` (accessible, works without JS) with animated height, 8 questions from v1 rewritten in brand voice. Emits `FAQPage` JSON-LD.
- **Final CTA**: midnight panel, "Be the answer.", one "Get started" button.
- **Footer**: Product (section anchors), Company (contact `mailto`), Legal (app's privacy, terms, refund), social links only once accounts exist.

### Phase 7: Polish and QA

Motion review across sections (500–700ms, `--ease-out`, 60–100ms stagger), Lighthouse ≥ 95 on all four categories on mobile, cross-browser pass (Chrome, Firefox, Safari, iOS Safari), screen-reader pass (NVDA + VoiceOver), real-device check, image weights audit, final copy pass against the banned-words list.

---

## 5. Brand and copy rules (enforced in review)

- Sentence case, no exclamation marks, numbers first.
- Banned: supercharge, unleash, revolutionize, magic, game-changer, seamless.
- Violet is the rarest colour: agent and wins only, flat fill, never a gradient.
- No sparkle/robot/rocket icons, no glowing orbs, no purple gradients, no emoji.
- No invented ratings, customer counts, benchmarks or prices.

---

## 6. Deployment and environment

| Variable               | Default                  | Used for                           |
| ---------------------- | ------------------------ | ---------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `https://rankoya.uk`     | `metadataBase`, canonical, sitemap |
| `NEXT_PUBLIC_APP_URL`  | `https://app.rankoya.uk` | Sign-in / sign-up links            |

- Host on Vercel as its own project, domain `rankoya.uk` (+ `www` redirect).
- Preview deploys set `robots` to `noindex` via `VERCEL_ENV !== "production"`.
- Analytics and cookie consent: **open**. Pick a cookieless option (Vercel Web Analytics or Plausible) to avoid a consent banner, or add a banner and a cookie policy together.

## 7. Open items for the product owner

1. Confirm the "Works with" label for the marquee (asked for "Trusted by"; listing third-party marks under "Trusted by" implies their endorsement).
2. Real prices, and whether there is a free trial.
3. Social accounts for the footer.
4. Contact email for the footer and JSON-LD (`hello@rankoya.uk` is a placeholder).
5. Analytics choice (section 6).
