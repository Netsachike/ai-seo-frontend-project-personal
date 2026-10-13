# Rankoya Landing Page — Phased Implementation Plan

Build a modern, responsive, high-conversion landing page for **Rankoya** at `landing_page/rankoya/`, modeled after [RankYak's homepage](https://rankyak.com/) but expressed entirely in the **Rankoya brand identity** (Ink and Signal palette, Geist typography, calm/precise/data-first personality).

---

## Context Summary

| Item                | Detail                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product**         | Rankoya — AI SEO & AI-search visibility platform. "Be the answer."                                                                                                                                                                                                                                                     |
| **Target**          | `landing_page/rankoya/` — standalone Next.js 16 project (already scaffolded, currently boilerplate)                                                                                                                                                                                                                    |
| **Stack**           | Next.js 16.4, React 19.3, Tailwind CSS 4, TypeScript                                                                                                                                                                                                                                                                   |
| **Reference model** | [rankyak.com](https://rankyak.com/) — section structure, UX patterns, conversion flow                                                                                                                                                                                                                                  |
| **Brand source**    | [rankoya_brand_identity.md](file:///c:/dev/company_Projects/ai-seo/docs/rankoya_brand_identity.md), [globals.css](file:///c:/dev/company_Projects/ai-seo/src/app/globals.css), [brand.ts](file:///c:/dev/company_Projects/ai-seo/src/config/brand.ts), [PRODUCT.md](file:///c:/dev/company_Projects/ai-seo/PRODUCT.md) |
| **Design tokens**   | Blue `#2563EB`, Navy `#0F1B33`, Violet `#5B47F5`, Midnight `#0B1220`, Mist `#F5F8FD`, Frost `#EEF2F8`                                                                                                                                                                                                                  |
| **Typography**      | Geist (sans, weight 600 headings, tight tracking), Geist Mono (tabular numbers)                                                                                                                                                                                                                                        |
| **App URL**         | `https://app.rankoya.uk`                                                                                                                                                                                                                                                                                               |
| **Marketing URL**   | `https://rankoya.uk`                                                                                                                                                                                                                                                                                                   |

---

## User Review Required

> [!IMPORTANT]
> **No real customer data exists yet.** Per [PRODUCT.md](file:///c:/dev/company_Projects/ai-seo/PRODUCT.md): "Only fictional mock entities… No real customers, testimonials, benchmarks or pricing exist; do not fabricate them." All social proof, testimonials, and pricing sections will use clearly-labeled placeholder/mock data that's easy to swap later.

> [!IMPORTANT]
> **Pricing is TBD.** The [pricing.ts](file:///c:/dev/company_Projects/ai-seo/src/config/pricing.ts) has all prices as `null`. The pricing section will show plan tier names (Free / Professional / Agency) with "Coming soon" or placeholder amounts you can swap in.

> [!WARNING]
> **Standalone vs. integrated.** The landing page is a separate Next.js project in `landing_page/rankoya/`. It does **not** share the main app's `node_modules`, `globals.css`, or component library. We will replicate the Rankoya design tokens into the landing page's own CSS to maintain visual consistency without coupling the two builds.

---

## Open Questions

> [!IMPORTANT]
>
> 1. **CTA destination**: Should "Try for free" / "Get started" buttons link to `https://app.rankoya.uk/login` (sign-up/login page)? Or a different URL? ANS - YES SHOULD LEAD TO LOGIN
> 2. **Google sign-in on landing page**: RankYak has a "Join with Google" button on the hero. Should Rankoya include this, or keep it to a single "Get started" CTA? - KEEP TO SINGLE GET STARTED
> 3. **Press/media logos**: RankYak shows "As seen in" logos (Yahoo Finance, AP, etc.). Does Rankoya have any press coverage or partner logos to display? If not, should this section be omitted or stubbed? - KEEP THE MARQUEE BUT EXCHANGE WITH PLATFORM INTEGRATIONS AS "trusted by" SECT WITH OUR PLATFORMS: SHOPIFY, WODPRESS E.T.C
> 4. **Demo video**: RankYak embeds a product demo video. Does a Rankoya demo video exist, or should we use a static screenshot / animated mockup of the app instead? YES STATIC SCREENSHOT AND ANIMATED MOCKUPS =
> 5. **Success stories / testimonials**: Should we use fictional testimonials (consistent with the mock persona "Ada Okafor, Northwind Roasters") or omit this section until real ones exist? YES
> 6. **Dependencies to add**: The landing page currently only has `next`, `react`, `react-dom`, and `tailwindcss`. Should we add `motion` (Framer Motion) for scroll animations, and `lucide-react` for icons — matching the main app's stack? YES

---

## RankYak Section Map → Rankoya Equivalents

| #   | RankYak Section                                                                          | Rankoya Equivalent          | Notes                                                                    |
| --- | ---------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| 1   | Sticky header + mega-menu                                                                | Sticky header + simple nav  | Simpler nav (no mega-menu needed for a landing page)                     |
| 2   | Announcement banner                                                                      | Announcement banner         | "Built for agencies too" → contextual promo                              |
| 3   | Hero (headline with inline logos, dual CTA, social proof)                                | Hero section                | Headline: visibility across Google + AI engines. Rankoya brand voice.    |
| 4   | Product demo video/screenshot                                                            | Product showcase            | Screenshot of the app dashboard (reference_image.png available) or video |
| 5   | "As seen in" press logos                                                                 | Social proof bar            | Stub or omit based on answer to Q3                                       |
| 6   | Feature deep-dives (keyword discovery, content plan, article gen, site guard, backlinks) | Feature sections            | Map to: AI Visibility, Rankings, Competitors, Content/Agent, Site Audit  |
| 7   | "How it works" flow                                                                      | How it works                | scan → insight → action plan → agent drafts → approve → publish          |
| 8   | Integrations grid                                                                        | Integrations                | WordPress, Google Search Console, Google Analytics, Telegram             |
| 9   | Testimonials / success stories                                                           | Social proof / testimonials | Mock or omit (see Q5)                                                    |
| 10  | Pricing                                                                                  | Pricing tiers               | Free / Professional / Agency — placeholder prices                        |
| 11  | FAQ accordion                                                                            | FAQ section                 | Adapted from Rankoya's product context                                   |
| 12  | Final CTA                                                                                | Bottom CTA                  | "Be the answer." tagline + sign-up button                                |
| 13  | Footer                                                                                   | Footer                      | Links, company info, NETSACH TECH LTD                                    |

---

## Proposed Changes

### Phase 1: Foundation & Layout Shell

_Set up the design system, global styles, and the overall page skeleton._

---

#### [MODIFY] [globals.css](file:///c:/dev/company_Projects/ai-seo/landing_page/rankoya/app/globals.css)

Replace the boilerplate CSS with Rankoya design tokens ported from the main app's [globals.css](file:///c:/dev/company_Projects/ai-seo/src/app/globals.css):

- Import Tailwind 4 with `@import "tailwindcss"`
- Define `@theme inline` block with Rankoya color tokens (`--bg`, `--surface`, `--ink`, `--signal`, `--nav-bg`, etc.)
- Add `:root` light palette and `.dark` dark palette
- Add typography utilities (`text-display`, `text-h1`, `text-h2`, `text-overline`, etc.)
- Add motion tokens (`--ease-out`, `--ease-in-out`)
- Add base layer styles (body, selection, focus-visible rings)

#### [MODIFY] [layout.tsx](file:///c:/dev/company_Projects/ai-seo/landing_page/rankoya/app/layout.tsx)

- Update metadata: title → "Rankoya | Be the Answer — AI SEO Platform", description → product pitch
- Add Open Graph and Twitter meta tags
- Keep Geist / Geist Mono font loading (already configured)
- Add proper `lang="en"`, viewport meta

#### [MODIFY] [page.tsx](file:///c:/dev/company_Projects/ai-seo/landing_page/rankoya/app/page.tsx)

- Replace boilerplate with the landing page composition: import and render all section components in order

#### [MODIFY] [package.json](file:///c:/dev/company_Projects/ai-seo/landing_page/rankoya/package.json)

- Add `lucide-react` for consistent iconography
- Add `motion` (Framer Motion v14) for scroll-triggered animations
- Add `class-variance-authority` for component variants
- Add `@tailwindcss/postcss` as devDependency (if not auto-configured)

---

### Phase 2: Header & Hero

_The first impression — sticky navigation and a high-impact hero section._

---

#### [NEW] `app/components/header.tsx`

Sticky top nav bar modeled after RankYak's header:

- Rankoya logo (horizontal lockup) on the left — use the brand mark from [mark-light.png](file:///c:/dev/company_Projects/ai-seo/src/assets/brand/mark-light.png) + "rankoya" wordmark in Geist 600
- Nav links: Features, How It Works, Integrations, Pricing, FAQ
- Right side: "Log in" text link + "Get started" pill button (`bg-ink text-ink-fg rounded-full`)
- Scroll behavior: border appears on scroll (like RankYak's `border-gray-200` on scroll)
- Mobile: hamburger → full-screen overlay menu
- Smooth-scrolls to section anchors

#### [NEW] `app/components/hero.tsx`

High-impact hero section:

- **Announcement pill**: small rounded badge at top (e.g., "Now tracking AI answers across 5 engines →")
- **Headline**: Large `text-display` (44px→60px responsive), tight tracking. Incorporates inline platform icons for Google and AI engines (as colored dots/tiles, not real logos per brand rules)
  - Example: "See where you rank on **Google** and in **AI answers**. Then close the gap."
- **Subheadline**: `text-body-lg`, muted text (`text-fg-2`)
  - "Rankoya measures your visibility across Google, ChatGPT, Claude, Gemini and Perplexity, then an AI agent writes the fix — published only after you approve."
- **Dual CTA buttons**:
  - Primary: "Try Rankoya free" → `bg-ink text-ink-fg rounded-full`
  - Secondary: "See how it works" → outlined, scrolls to How It Works section
- **Social proof strip**: Star rating (mock 4.8/5) + stacked user avatars + "X articles generated" counter

#### [NEW] `app/components/product-showcase.tsx`

Product demo area (below hero):

- Styled container with a subtle gradient background (navy-to-midnight or a muted green/blue from RankYak's style)
- Embeds either a video player or a static screenshot of the Rankoya dashboard (the [reference_image.png](file:///c:/dev/company_Projects/ai-seo/docs/reference_image.png) shows the app UI)
- Rounded corners, subtle shadow, responsive sizing
- Fallback: high-quality screenshot with browser chrome mockup

---

### Phase 3: Feature Sections

_Deep-dive feature blocks that communicate core value propositions._

---

#### [NEW] `app/components/features/feature-section.tsx`

Reusable feature section layout component:

- Alternating left/right layout (text + visual)
- Overline label (`text-overline` — 11px, uppercase, letter-spaced, `text-fg-3`)
- H2 heading (`text-h1` — 28px, weight 600)
- Description paragraph
- Optional bullet list with icons
- Visual: illustration card or app screenshot mockup
- Scroll-triggered fade-in animation (Framer Motion `whileInView`)

#### [NEW] `app/components/features/ai-visibility.tsx`

**"AI Visibility"** — the hero feature:

- Overline: "AI VISIBILITY"
- Headline: "See where you show up in AI answers."
- Copy: Track mentions across ChatGPT, Claude, Gemini, Perplexity. Share of voice per engine.
- Visual: floating card illustration showing engine tiles with visibility percentages (using brand engine accent colors: Google `#16A34A`, ChatGPT `#8B5CF6`, Claude `#EA580C`, Gemini `#3B82F6`, Perplexity `#0D9488`)

#### [NEW] `app/components/features/rankings.tsx`

**"Rankings & Competitors"**:

- Overline: "RANKINGS AND COMPETITORS"
- Headline: "Know who outranks you, and why."
- Copy: Google positions and AI share of voice side by side.
- Visual: mock chart card showing a blue "You" line climbing above competitor lines (orange, teal, magenta per brand chart colors)

#### [NEW] `app/components/features/seo-agent.tsx`

**"Your SEO Agent"**:

- Overline: "YOUR SEO AGENT"
- Headline: "Approve the fix. Rankoya does the work."
- Copy: Articles and on-page fixes drafted, published only after approval. Autopilot modes.
- Visual: approval card mockup with Approve (violet) / Edit (outlined) buttons, agent avatar

#### [NEW] `app/components/features/content-generation.tsx`

**"Content Generation"**:

- Overline: "CONTENT"
- Headline: "SEO-optimized articles, written for you."
- Copy: Built from real-time SERP data, E-E-A-T compliant, proper heading structure and linking
- Visual: article editor card mockup

#### [NEW] `app/components/features/site-audit.tsx`

**"Site Audit"**:

- Overline: "SITE AUDIT"
- Headline: "Find what's holding your rankings back."
- Copy: Technical and on-page issues with severity and fix guidance
- Visual: audit card with severity badges (green/yellow/red using status colors)

---

### Phase 4: How It Works & Integrations

_Explain the workflow and show what connects._

---

#### [NEW] `app/components/how-it-works.tsx`

Stepped workflow section (modeled after RankYak's approach):

- Section heading: "How Rankoya works"
- 6-step horizontal flow (vertical on mobile):
  1. **Connect** — Add your website
  2. **Analyze** — Rankoya crawls and audits your site
  3. **Discover** — Find SEO & AI visibility opportunities
  4. **Plan** — AI generates a ranked action plan
  5. **Execute** — Agent drafts articles and fixes
  6. **Approve** — You review and publish
- Each step: numbered circle (using `bg-ink` for active, `bg-surface-2` for upcoming), title, short description
- Connector lines/arrows between steps
- Subtle animation: steps fade in sequentially on scroll

#### [NEW] `app/components/integrations.tsx`

Integration logos grid:

- Section heading: "Connects to your stack"
- Grid of integration tiles: WordPress, Shopify, Wix, Webflow, Google Search Console, Google Analytics, Telegram, Zapier, Make
- Each tile: rounded card (`bg-surface`, `border-border`, `rounded-lg`), platform icon, name
- Note: per brand rules, use neutral rounded tiles rather than real third-party logos drawn by the generator. We can use simple SVG icons or generic tiles with names.

---

### Phase 5: Social Proof & Pricing

_Build trust and present the offer._

---

#### [NEW] `app/components/testimonials.tsx`

Testimonials / social proof section:

- Section heading: "Trusted by businesses like yours"
- Card grid (2–3 columns on desktop, 1 on mobile)
- Each card: quote text, author name, role, company, small avatar
- Use fictional mock personas from PRODUCT.md context (Ada Okafor / Northwind Roasters) or generic placeholders clearly marked as examples
- Cards styled: `bg-surface`, `border-border`, `rounded-xl`, subtle shadow

#### [NEW] `app/components/pricing.tsx`

Pricing tiers section:

- Section heading: "Simple, transparent pricing"
- 3 cards side by side: **Free**, **Professional** (highlighted), **Agency**
- Each card: tier name, price (placeholder "Coming soon" or mock price), feature list with check icons, CTA button
- Professional card gets a "Most popular" badge and `border-ink` highlight
- All prices display as placeholder per current `pricing.ts` config
- Bottom note: "All plans include a free trial. No credit card required."

---

### Phase 6: FAQ, Final CTA & Footer

_Answer objections, make the final push, and close the page._

---

#### [NEW] `app/components/faq.tsx`

FAQ accordion section:

- Section heading: "Frequently asked questions"
- Accordion items (click to expand/collapse):
  1. How does Rankoya work?
  2. Which AI engines does Rankoya track?
  3. Are the articles SEO-optimized?
  4. Can I review content before it's published?
  5. What platforms does Rankoya integrate with?
  6. Does Rankoya support multiple languages?
  7. Can I add multiple websites?
  8. Is AI content effective for SEO?
- Content adapted from RankYak's FAQ but rewritten for Rankoya's context and voice
- Styled with `border-border` dividers, smooth height transition, chevron rotation

#### [NEW] `app/components/cta-section.tsx`

Final conversion CTA:

- Dark background section (`bg-nav` navy or `bg-[#0B1220]` midnight)
- Large headline: "Be the answer." (the tagline, in `text-display`, white)
- Subheadline: "Start measuring your AI visibility today."
- CTA button: "Get started for free" → white on ink, rounded-full, large
- Optional: small reassurance text ("No credit card required")

#### [NEW] `app/components/footer.tsx`

Page footer:

- Dark background matching the CTA section
- 4-column grid (responsive → stacked on mobile):
  - **Product**: Features, How It Works, Integrations, Pricing
  - **Resources**: Help Center, API Docs, Blog, What's New
  - **Company**: About, Careers, Contact, Press
  - **Legal**: Terms, Privacy, Cookie Policy
- Bottom bar: "© 2026 NETSACH TECH LTD" + social media icon links
- Rankoya logo (dark variant)

---

### Phase 7: Polish, Animation & Responsive QA

_Final refinements for a production-quality page._

---

#### Animation pass (all section components)

- Scroll-triggered `whileInView` animations using Framer Motion:
  - Sections: fade up (`opacity: 0 → 1`, `translateY: 24px → 0`)
  - Feature visuals: slight scale-up or slide-in from the side
  - How-it-works steps: staggered sequential reveal
  - Stats/numbers: count-up animation on view
- All animations respect `prefers-reduced-motion` (disable when `reduce`)
- Timing: `--ease-out` curve, 500–700ms duration, 100ms stagger

#### Responsive QA

- Mobile-first breakpoints: default (mobile), `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Test: iPhone SE, iPhone 14, iPad, 1440px desktop, ultrawide
- Header: hamburger menu below `lg`, full nav above
- Hero: single-column mobile, centered text
- Features: stacked on mobile, side-by-side on `lg+`
- Pricing: horizontal scroll or stacked cards on mobile
- Footer: 2×2 grid on `sm`, 4-col on `lg+`

#### Dark mode

- All components use semantic token classes (`text-fg`, `bg-surface`, `border-border`)
- Dark mode inherits from the `.dark` palette in `globals.css`
- Toggle button in header (optional, or system-preference only)

#### Accessibility

- Target WCAG 2.2 AA per [PRODUCT.md](file:///c:/dev/company_Projects/ai-seo/PRODUCT.md)
- 4.5:1 text contrast in both themes
- Visible focus rings (`outline: 2px solid var(--blue)`)
- Proper heading hierarchy (single `h1`, sequential `h2`s)
- `aria-label` on icon buttons, `aria-expanded` on accordions/mobile menu
- Skip-to-content link
- Reduced-motion respected

---

## File Structure Summary

```
landing_page/rankoya/
├── app/
│   ├── globals.css              ← [MODIFY] Rankoya design tokens
│   ├── layout.tsx               ← [MODIFY] metadata, fonts, OG tags
│   ├── page.tsx                 ← [MODIFY] compose all sections
│   ├── favicon.ico              ← [REPLACE] with Rankoya favicon
│   └── components/
│       ├── header.tsx            ← [NEW] sticky nav
│       ├── hero.tsx              ← [NEW] hero + social proof
│       ├── product-showcase.tsx  ← [NEW] demo video/screenshot
│       ├── how-it-works.tsx      ← [NEW] 6-step workflow
│       ├── integrations.tsx      ← [NEW] platform grid
│       ├── testimonials.tsx      ← [NEW] social proof cards
│       ├── pricing.tsx           ← [NEW] 3-tier pricing
│       ├── faq.tsx               ← [NEW] accordion
│       ├── cta-section.tsx       ← [NEW] final CTA
│       ├── footer.tsx            ← [NEW] page footer
│       └── features/
│           ├── feature-section.tsx    ← [NEW] reusable layout
│           ├── ai-visibility.tsx      ← [NEW]
│           ├── rankings.tsx           ← [NEW]
│           ├── seo-agent.tsx          ← [NEW]
│           ├── content-generation.tsx ← [NEW]
│           └── site-audit.tsx         ← [NEW]
├── public/
│   ├── images/                  ← [NEW] brand assets, screenshots, illustrations
│   └── videos/                  ← [NEW] demo video (if available)
├── package.json                 ← [MODIFY] add dependencies
└── tsconfig.json
```

---

## Verification Plan

### Automated Tests

- `npm run build` in `landing_page/rankoya/` — must complete with zero errors
- `npm run lint` — must pass ESLint
- Lighthouse audit: target ≥ 90 on Performance, Accessibility, Best Practices, SEO

### Manual Verification

- Visual comparison against RankYak's section flow and layout proportions
- Verify all Rankoya brand tokens match `globals.css` from the main app
- Test on Chrome, Firefox, Safari (desktop + mobile viewport)
- Verify dark mode renders correctly
- Test with `prefers-reduced-motion: reduce` — no animations should play
- Confirm all CTA buttons link to the correct app URL
- Screen reader pass: headings, landmarks, interactive elements properly labeled
- RTL check (not required for landing page MVP, but tokens should support it)

---

## Implementation Order

| Phase       | Scope                                     | Est. Effort |
| ----------- | ----------------------------------------- | ----------- |
| **Phase 1** | Foundation: tokens, layout, dependencies  | Small       |
| **Phase 2** | Header + Hero + Product showcase          | Medium      |
| **Phase 3** | 5 feature sections                        | Large       |
| **Phase 4** | How It Works + Integrations               | Medium      |
| **Phase 5** | Testimonials + Pricing                    | Medium      |
| **Phase 6** | FAQ + Final CTA + Footer                  | Medium      |
| **Phase 7** | Animation, responsive QA, dark mode, a11y | Medium      |
