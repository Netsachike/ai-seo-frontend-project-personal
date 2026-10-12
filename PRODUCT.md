# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: small-business owners and in-house marketers running one brand (persona: Ada Okafor, owner of Northwind Roasters). They check in a few times a week on desktop and approve work from their phone over Telegram. Their job is to understand where their brand shows up in Google and AI answers, and to get the gaps closed without becoming SEO specialists.

Secondary: agencies managing several client brands. The workspace → brand hierarchy supports them, but the defaults are tuned for a single brand.

## Product Purpose

Rankoya shows a brand where it ranks on Google and inside AI answers (ChatGPT, Claude, Gemini, Perplexity, Google AI Overviews), compares it with competitors, and lets an AI agent do the work to close the gap: write articles, fix on-page SEO and publish after approval. Success means a rising AI visibility score with minimal effort from the owner.

## Positioning

Measurement and execution in one product: the same agent that finds the gap writes the fix, and it takes approvals both in the web app and on Telegram (same conversation thread). Work is split explicitly into what "Rankoya" does and what "You" must do.

## Operating Context

- Workflow: scan → insight → ranked action plan → agent drafts → owner approves (app or Telegram) → publish (WordPress first).
- Every agent change to a live site goes through an approval card (Approve / Edit / Reject). Autopilot modes: Ask me first (default), Auto-publish content, Full autopilot.
- Hierarchy: User → Workspaces (team, billing, credits) → Brands (websites) → screens.
- Backend is built in parallel; the frontend runs on MSW mocks first. Deadline Oct 30, 2026.

## Capabilities and Constraints

- Stack (existing): Next 16 App Router, React 19.2, Tailwind 4, shadcn/ui, TanStack Query/Table, next-intl, next-themes, MSW.
- Launch locales: en (source), es, fr, de, pt, ar (RTL), zh, ja. UI language and brand content language are separate settings.
- Light, dark and system theme are MVP.
- Plan tiers: Free / Growth / Agency. Mock plan is Growth. All limits come from the API, never hard-coded.
- Roles: Owner, Admin, Member, Viewer.
- Open decision: legal company name (placeholder until confirmed).

## Brand Commitments

- Brand guide "Ink and Signal": calm, dense, data-first; cool neutrals and near-black ink; one electric lime Signal reserved for the agent and for wins, never used as text color.
- Geist and Geist Mono (tabular numbers for every compared figure).
- No purple gradients, glowing orbs, sparkle icons or emoji.
- Voice: plain and specific, numbers first then meaning then action, sentence case, no exclamation marks. The agent speaks as "Rankoya" in first person. Banned words: supercharge, unleash, revolutionize, magic, game-changer, seamless.

## Evidence on Hand

Only fictional mock entities: workspaces "Northwind Team" and "Ada's Agency", brand Northwind Roasters, competitors Bluebird Coffee, Halfmoon Roastery, Ember & Oak. No real customers, testimonials, benchmarks or pricing exist; do not fabricate them.

## Product Principles

1. Numbers first, then meaning, then the next action.
2. Always say who does the work: Rankoya or You.
3. Nothing touches a live site without an approval the user can see and undo.
4. A brand-new workspace with zero data must still read as intentional, never as broken charts.
5. Every surface works in any supported language, direction and theme.

## Accessibility & Inclusion

Target WCAG 2.2 AA: 4.5:1 text contrast in both themes, visible focus rings, translated aria-labels, deltas never shown by color alone, reduced-motion respected, full RTL support.
