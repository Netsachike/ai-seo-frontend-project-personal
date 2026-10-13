# Rankoya brand identity guide

**Product:** Rankoya · **App URL:** https://app.rankoya.uk · **Company:** NETSACH TECH LTD
**Purpose of this document:** a self-contained brief for an image-generation agent producing the Rankoya **logo**, **favicon / app icons** and **sign-in carousel images**. Everything here is taken from the shipped app (`src/app/globals.css`, `src/config/brand.ts`, `PRODUCT.md`, `docs/implementation_v2.md`). Where this guide and older docs disagree, this guide wins.

> The approved logo is the **R with a rising blue arrow** (concept 2 in section 6). It ships in the app; see section 11 for the files. New artwork should match it, not reinterpret it.

---

## 1. What Rankoya is

**One line:** Rankoya shows a business where it ranks on Google and inside AI answers, then an AI agent does the work to close the gap.

**Tagline (in app):** _Be the answer._

**Longer description:** Search is splitting in two. People still use Google, but more and more of them ask ChatGPT, Claude, Gemini, Perplexity and Google AI Overviews instead. Rankoya measures a brand's visibility in both places, compares it with competitors, and gives it an AI SEO agent that writes articles, fixes on-page problems and publishes them, but only after the owner approves each change.

**Positioning:** measurement and execution in one product. The same agent that finds the gap writes the fix. Every task is clearly split between what **Rankoya** does and what **You** must do.

**Core workflow:** scan → insight → ranked action plan → agent drafts → owner approves (in the app or on Telegram) → publish (WordPress first).

### Who it is for

| Audience                                                                                                   | What they want                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary:** small-business owners and in-house marketers with one brand (e.g. a specialty coffee roaster) | Understand where they show up in Google and AI answers, and get the gaps closed without becoming SEO experts. They check in a few times a week on desktop and approve work from their phone. |
| **Secondary:** agencies managing several client brands                                                     | A workspace per client, team roles, reports, and White Label resale under their own brand.                                                                                                   |

### Feature map (what the sidebar contains)

**Insights**

- **Overview:** an AI visibility score, per-platform charts (Google, Google Maps, ChatGPT, Claude, Gemini, Perplexity), trends and deltas.
- **AI visibility:** the questions customers ask AI assistants, whether the brand is mentioned in the answer, where it appears and how often. Share of voice per engine.
- **Rankings:** Google keyword positions over time, rank distribution.
- **Competitors:** side-by-side visibility and share of voice against named competitors.
- **Site audit:** technical and on-page SEO issues with severity and fix guidance.

**Grow**

- **Action plan:** a ranked list of what to do next, each item tagged "Rankoya does this" or "You do this".
- **Content:** AI-drafted articles in a rich editor, scheduled and published to the site.
- **Ask Rankoya (agent):** a chat with the SEO agent. It proposes changes as **approval cards** (Approve / Edit / Reject). Autopilot modes: _Ask me first_ (default), _Auto-publish content_, _Full autopilot_. The same thread continues on Telegram.
- **Social:** coming soon.

**Workspace**

- **Integrations:** Google Search Console, Google Analytics, WordPress and others.
- **Reports**, **Settings** (profile, team with Owner/Admin/Member/Viewer roles, workspaces, subscriptions).
- **Agency** and **Resellers:** multi-client management and a **White Label** program where resellers serve Rankoya on their own domain, with their own logo, favicon, colours and sign-in carousel.

**Onboarding:** an 8-step guided site setup (domain, business details written by AI, core topics, preferences, integrations, Search Console, billing, done).

**Platform facts:** web app, light theme by default with dark and system themes, 8 launch languages including Arabic (right-to-left), Chinese and Japanese. Accessibility target WCAG 2.2 AA.

---

## 2. Brand personality

**Calm, precise, data-first, trustworthy.** Rankoya is a measuring instrument with a capable assistant attached, not a hype machine. It should feel like a well-made financial or analytics tool: dense with information, quiet in style, confident without shouting.

| Rankoya is                                       | Rankoya is not                 |
| ------------------------------------------------ | ------------------------------ |
| Clear, measured, specific                        | Hype, "growth hacking", flashy |
| Quietly confident                                | Playful or cartoonish          |
| Modern, engineered, British-registered           | Generic Silicon Valley AI      |
| Helpful and accountable (it asks before it acts) | Autonomous robot, sci-fi AI    |

**Core ideas the visuals can draw on**

1. **Ranking / rising position:** moving up a list, reaching position #1, a stepped ascent.
2. **Being the answer:** a brand highlighted inside an answer, a marker on a result, a signal getting through.
3. **Two search worlds, one view:** classic search plus AI answers, measured together.
4. **Approval and control:** the human approves, the agent does the work.

### Voice (for any words that appear in imagery or marketing)

- Plain and specific. Numbers first, then meaning, then action.
- Sentence case. No exclamation marks.
- The agent speaks as "Rankoya" in the first person.
- **Banned words:** supercharge, unleash, revolutionize, magic, game-changer, seamless.

---

## 3. Colour palette ("Blue and Navy")

These are the live tokens from `src/app/globals.css`. Use exact hex values.

### Core brand colours

| Role             | Name          | Hex       | Notes                                                                                                                                                |
| ---------------- | ------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary**      | Rankoya Blue  | `#2563EB` | Buttons, links, active nav, the "You" data series. White text on it passes AA (5.2:1).                                                               |
| **Secondary**    | Deep Navy     | `#0F1B33` | Sidebar in both themes. The brand's "ink" backdrop.                                                                                                  |
| **Accent**       | Signal Violet | `#5B47F5` | Reserved for the agent and for wins: agent button, upgrade CTA, agent avatar, logo accent dot. Always a flat fill with white text. Never a gradient. |
| **Night**        | Midnight      | `#0B1220` | Dark page background; sign-in brand panel background.                                                                                                |
| **Text on dark** | Frost         | `#EEF2F8` | Text on navy/midnight.                                                                                                                               |
| **Paper**        | Mist          | `#F5F8FD` | Light page background.                                                                                                                               |
| **White**        | White         | `#FFFFFF` | Cards, text on blue and violet.                                                                                                                      |

### Supporting neutrals

| Light theme     | Hex                   | Dark theme        | Hex       |
| --------------- | --------------------- | ----------------- | --------- |
| Text            | `#0E1A33`             | Text              | `#EEF2F8` |
| Secondary text  | `#4B5A74`             | Secondary text    | `#A8B3C7` |
| Muted text      | `#64748B`             | Muted text        | `#8492A8` |
| Surface 2       | `#EFF3F9`             | Surface           | `#111A2E` |
| Border          | `#E3E9F2`             | Surface 2         | `#18233A` |
| Strong border   | `#CBD5E3`             | Border            | `#22304A` |
| Navy card       | `#16233F`             | Strong border     | `#30405E` |
| Dark-theme blue | `#3B82F6` / `#7AA2FF` | Dark-theme violet | `#7C6CFF` |

### Status and data colours (use sparingly in illustrations)

| Meaning                | Light     | Dark      |
| ---------------------- | --------- | --------- |
| Success / rank up      | `#15803D` | `#4ADE80` |
| Warning                | `#B45309` | `#FBBF24` |
| Danger / rank down     | `#C42B2B` | `#FF7A7A` |
| Competitor A (orange)  | `#F08A24` | `#F5A04A` |
| Competitor B (teal)    | `#13A38B` | `#2EC4A8` |
| Competitor C (magenta) | `#B54AC7` | `#CF6FE0` |
| Other / neutral series | `#8A94A6` | `#8492A8` |
| Star / highlight       | `#FBBF24` |           |

### Colour proportions

Roughly **60% navy/midnight or mist/white**, **30% neutrals and blue-greys**, **8% Rankoya Blue**, **2% Signal Violet**. Violet is the rarest colour on screen; it marks the agent and moments of success. If violet and blue appear together, blue carries the structure and violet is a small, deliberate point.

---

## 4. Typography

- **Primary typeface:** **Geist** (sans). Headings weight 600, tight tracking (about -0.03em on the wordmark and display sizes).
- **Numbers and data:** **Geist Mono** with tabular figures for every compared number (ranks, scores, percentages).
- Display headline: 44px / 600. Overline labels: 11px, 600, uppercase, letter-spaced.
- Arabic: Noto Sans Arabic. Chinese/Japanese: system CJK fonts.

---

## 5. Visual style rules

**Do**

- Flat, crisp, geometric. Rounded corners at 8–16px on UI shapes.
- Lots of navy and white space; one clear focal point.
- UI-derived imagery: cards, rank tables, line and area charts, score rings, a highlighted answer, an approval card.
- Subtle depth only: thin 1px borders, soft low shadows, gentle navy-to-midnight linear gradients (`#16233F` → `#0B1220`) as backgrounds.
- Hand-picked, real-feeling data: positions like #1, #3, #7; deltas like ▲ 4; scores like 72.

**Don't**

- No purple or neon gradients, glowing orbs, lens flares, sparkle/star "AI" icons, robots, brains, rockets, magic wands, crystal balls or emoji.
- No stock photos of people pointing at screens, no 3D blob shapes, no glassmorphism overload.
- No real third-party logos (Google, OpenAI/ChatGPT, Anthropic/Claude, Gemini, Perplexity) drawn by the generator. The app inserts official logos itself. Represent engines with neutral rounded tiles or coloured dots using the engine accents: Google `#16A34A`, Maps `#1A73E8`, ChatGPT `#8B5CF6`, Claude `#EA580C`, Gemini `#3B82F6`, Perplexity `#0D9488`.
- No embedded paragraphs of text in images. Image generators garble text, and the app overlays translated copy on top.

---

## 6. Logo brief

### Name and wordmark

- Name: **Rankoya**. Wordmark set in lowercase **"rankoya"** (matches the app's existing lowercase wordmark style), Geist-like geometric sans, weight 600, tight tracking. A title-case "Rankoya" variant is acceptable for formal use; pick one and stay with it.
- The wordmark is a brand name and is never translated.

### Symbol: what it must say

Rising rank + being the found answer. It must work at **16×16px** as a favicon, so it needs to be simple: 2–3 shapes, no thin detail, no text inside the icon except, optionally, a single letter "R".

### Concept directions (generate each, then choose)

1. **Ascending steps:** three rounded bars rising left to right (like a podium or rank chart), with a small **Signal Violet** dot above the tallest bar marking position #1.
2. **"R" with a rising stroke:** a geometric lowercase or uppercase R whose leg extends upward into an arrow or stepped line; violet dot at the tip.
3. **Answer marker:** a rounded speech/answer bubble containing an upward chevron or a #1 marker, combining "AI answer" with "ranking up".
4. **Rank pin:** a map/result pin shape built from a stepped ascending form, nodding to local search (Google Maps) and search results.

**Accent rule carried over from the current brand:** the symbol is drawn in one main colour (navy on light, white on dark, or white on blue) with **one small Signal Violet `#5B47F5` dot or point** as the "you are here / #1" marker. That dot is the brand's signature.

### Lockups and colour variants to produce

| Variant         | Background             | Symbol                 | Wordmark      | Accent dot             |
| --------------- | ---------------------- | ---------------------- | ------------- | ---------------------- |
| Primary (light) | `#FFFFFF` or `#F5F8FD` | `#0F1B33` or `#2563EB` | `#0E1A33`     | `#5B47F5`              |
| Reversed (dark) | `#0F1B33` or `#0B1220` | `#FFFFFF`              | `#FFFFFF`     | `#7C6CFF`              |
| On blue         | `#2563EB`              | `#FFFFFF`              | `#FFFFFF`     | `#FFFFFF` or `#0F1B33` |
| Mono            | any                    | single colour          | single colour | same colour            |

Lockups: **horizontal** (symbol left, wordmark right, gap ≈ 0.45 × symbol height; this is the one used in the sidebar and sign-in header at ~22px symbol / 18px text), **stacked** (symbol above wordmark), **symbol only**.

Clear space: at least the height of the accent dot × 2 on all sides. Minimum size: symbol 16px, horizontal lockup 96px wide.

### Logo generation prompt (starter)

> Minimal flat vector logo for "rankoya", an AI SEO and AI-search visibility platform. Symbol: three rounded ascending bars rising left to right, the tallest topped by a small solid violet (#5B47F5) circle marking first place. Symbol in deep navy #0F1B33, wordmark "rankoya" in lowercase geometric sans-serif, semibold, tight letter-spacing, colour #0E1A33, placed to the right of the symbol. White background. Clean, precise, calm, data-first, premium SaaS. No gradients, no glow, no sparkles, no 3D, no extra text. Centered, generous padding.

Swap the symbol sentence for concepts 2–4 to explore. Deliver vector (SVG) if possible; otherwise 2048px PNG with transparent background.

---

## 7. Favicon and app icon brief

Use the **symbol only** (never the wordmark) on a rounded-square tile.

| Variant        | Spec                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| Default tile   | Background Rankoya Blue `#2563EB`, symbol white, accent dot white or `#0F1B33`   |
| Alternate tile | Background Deep Navy `#0F1B33`, symbol white, accent dot `#7C6CFF`               |
| Corner radius  | about 22% of the tile size (iOS masks its own corners; supply square for Apple)  |
| Safe area      | keep the symbol inside the central 70% (Android maskable icons crop to a circle) |

**Files to export**

| File                                    | Size                    | Notes                                                                      |
| --------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `favicon.ico`                           | 16, 32, 48 (multi-size) | Replaces `src/app/favicon.ico`                                             |
| `icon.svg`                              | vector                  | Modern browsers; Next app-router `src/app/icon.svg`                        |
| `icon.png`                              | 512×512                 | General / PWA                                                              |
| `apple-icon.png`                        | 180×180                 | Square, no transparency, no pre-rounded corners                            |
| `icon-192.png`, `icon-512-maskable.png` | 192, 512                | PWA manifest; maskable has full-bleed background                           |
| `og-image.png`                          | 1200×630                | Social share: navy background, horizontal lockup, tagline "Be the answer." |

At 16px, check legibility: if the three bars blur together, reduce to two bars + dot, or use a bold "R" with the dot.

### Favicon prompt (starter)

> App icon, flat vector. Rounded square tile in solid blue #2563EB. Centered white symbol of three rounded ascending bars, the tallest topped by a small solid circle. Bold, simple shapes readable at 16 pixels. No text, no gradient, no shadow, no glow. Symbol occupies the central 65% of the tile.

---

## 8. Sign-in carousel images brief

### Where they appear

The sign-in, sign-up and verify pages split the screen: the form on the left (start side), a brand panel on the right (hidden below 1024px width). The panel is always dark. On White Label domains this panel becomes an auto-rotating carousel (6 seconds per slide, cross-fade). The default carousel ships with three slides, and resellers can replace them.

### Technical spec

- **Format:** PNG or WebP (SVG also supported), sRGB, < 500 KB each.
- **Size:** **1600 × 2000 px (4:5 portrait)**. The panel fills half of a desktop screen at full height and uses `object-fit: cover`, so it crops from the centre on wide and narrow screens. Keep key content in the **central 70% horizontally**.
- **Text overlay safe zone:** the app draws a black gradient from the bottom (85% → 10% opacity) and places a kicker, a large headline and a sentence in the **bottom-left 45%** of the panel. Keep that area quiet: dark, low-detail background only. Put the focal visual in the **upper 55%**.
- **No text, numbers longer than 3 characters, logos or brand names baked in.** The app provides translated copy, including RTL Arabic.
- Background: Midnight `#0B1220` to Navy card `#16233F` linear gradient (top-left to bottom-right), matching the current placeholder slides in `public/login/`.
- Style: flat, stylised UI illustrations (floating cards and charts), not screenshots and not photos. Cards in `#111A2E` with `#30405E` 1px borders and 16–24px radius; highlights in Rankoya Blue; one violet accent per slide.

### The three slides (copy the app overlays, for context)

**Slide 1: AI visibility** (`slide-visibility`)

- Overlay copy: kicker "AI visibility" · headline "See where you show up in AI answers." · "Track how ChatGPT, Claude, Gemini and Perplexity mention your brand, all in Rankoya."
- Visual: a floating AI answer card with blank text lines, one line highlighted with a violet `#5B47F5` marker (the brand being named in the answer). Around it, four or five small rounded engine tiles in the engine accent colours, connected with thin lines to the card, and a small green "mentioned" pill.

**Slide 2: Rankings and competitors** (`slide-rankings`)

- Overlay copy: kicker "Rankings and competitors" · headline "Know who outranks you, and why." · "Google positions and AI share of voice side by side, every week."
- Visual: a line chart card with a bold blue `#2563EB` "You" line climbing above three thinner competitor lines (orange `#F08A24`, teal `#13A38B`, magenta `#B54AC7`). Beside it a short rank list of rounded rows where the blue row moves up to the top position, with a green ▲ up indicator. Optional donut chart for share of voice.

**Slide 3: Your SEO agent** (`slide-agent`)

- Overlay copy: kicker "Your SEO agent" · headline "Approve the fix. Rankoya does the work." · "Articles and on-page fixes drafted for you, published only after you say yes."
- Visual: an approval card (title bar, blank text lines, an article thumbnail block) with two buttons: a filled violet **Approve** button and an outlined Edit button, no button labels needed. A small circular violet agent avatar showing the Rankoya symbol in white, top-left of the card. Optional: a phone outline at a slight angle showing the same card, to suggest approval on mobile.

### Carousel prompt (starter, slide 1)

> Portrait 4:5 illustration, 1600×2000, flat vector UI art for an AI-search analytics product. Dark background, linear gradient from #16233F top-left to #0B1220 bottom-right. In the upper half, a floating rounded card (#111A2E, 1px #30405E border) representing an AI chatbot answer: four grey placeholder text bars, one bar highlighted in solid violet #5B47F5. Around the card, five small rounded-square tiles in green #16A34A, blue #1A73E8, purple #8B5CF6, orange #EA580C and teal #0D9488, linked to the card by thin #30405E lines. A small green pill with an up arrow. Lower 45% of the image is empty dark background for text overlay. Calm, precise, premium SaaS. No words, no logos, no people, no glow, no sparkles, no 3D.

Adapt for slides 2 and 3 using the visuals above.

---

## 9. Hand-off checklist for the image agent

- [ ] Logo: 4 concepts explored, 1 chosen; horizontal, stacked and symbol-only lockups; light, dark, on-blue and mono variants; SVG + transparent PNG.
- [ ] Symbol legible at 16px; violet accent dot present in colour versions.
- [ ] Favicon set and app icons per section 7, plus OG image.
- [ ] Three carousel images at 1600×2000, bottom 45% kept clear, no text or third-party logos.
- [ ] Only colours from section 3 used; violet stays the rarest colour.
- [ ] Nothing from the "Don't" list in section 5.

## 10. Quick reference

```
Name        Rankoya            URL       https://app.rankoya.uk
Tagline     Be the answer.     Company   NETSACH TECH LTD
Blue        #2563EB            Navy      #0F1B33
Violet      #5B47F5            Midnight  #0B1220
Mist        #F5F8FD            Frost     #EEF2F8
Ink text    #0E1A33            White     #FFFFFF
Type        Geist / Geist Mono
Mood        calm · precise · data-first · trustworthy
```

## 11. Shipped brand assets

The approved artwork lives in `src/assets/assets/` (originals). The app uses trimmed copies:

| File                                                  | What it is                                        | Used in                                    |
| ----------------------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| `src/assets/brand/logo-light.png`                     | Horizontal lockup, navy wordmark, tagline removed | Headers on light surfaces                  |
| `src/assets/brand/logo-dark.png`                      | Same lockup, white wordmark                       | Navy sidebar, admin shell, dark theme      |
| `src/assets/brand/mark-light.png` / `mark-dark.png`   | R-and-arrow symbol alone                          | Setup panel, small brand marks             |
| `src/assets/brand/mark-mask.png`                      | One-colour silhouette of the symbol               | Agent avatar (CSS mask on the violet disc) |
| `src/assets/brand/icon-dark.png`                      | Navy app-icon tile, 512px                         | Source for favicons                        |
| `src/app/favicon.ico`, `icon.png`, `apple-icon.png`   | 16/32/48 ICO, 512 PNG, 180 opaque PNG             | Browser tab, PWA, iOS home screen          |
| `public/login/slide-{visibility,rankings,agent}.webp` | Sign-in carousel, 1200px wide                     | Sign-in, sign-up and verify pages          |
| `src/assets/icons/platforms/*.png`                    | 128px engine and CMS marks                        | Integrations, overview, visibility         |

The logo's tagline is not baked into the app lockups: at sidebar size it is unreadable, so the sidebar sets "Be the answer." as live, translatable text.
