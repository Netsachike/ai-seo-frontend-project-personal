/**
 * UI-stage data for the action plan, content and agent screens. Same rules as
 * ui-data.ts: brand content is data, labels are enums the UI translates, and
 * `br_new` returns empty sets.
 */
import type { Effort, Impact, Owner } from "./ui-data";

const isNew = (brandId: string) => brandId === "br_new";
const UI_NOW = new Date("2026-10-04T09:30:00Z").getTime();
const iso = (offsetMs: number) => new Date(UI_NOW + offsetMs).toISOString();

/* ───────────── Action plan ───────────── */

export type ActionColumn = "approval" | "working" | "yours" | "done";
export type ActionArea = "content" | "technical" | "schema" | "outreach";

export type ActionCard = {
  id: string;
  column: ActionColumn;
  owner: Owner;
  area: ActionArea;
  impact: Impact;
  effort: Effort;
  title: string;
  /** What changes on the live site; shown in the approval card. */
  items: string[];
  /** Expected visibility points when done. */
  points: number;
  progress?: number;
  href?: string;
};

export function actionPlan(brandId: string, slug: string): { current: number; cards: ActionCard[] } {
  if (isNew(brandId)) return { current: 0, cards: [] };
  return {
    current: 64,
    cards: [
      {
        id: "ac1",
        column: "approval",
        owner: "orbit",
        area: "schema",
        impact: "high",
        effort: "low",
        points: 3,
        title: "Add FAQ and Product schema to 6 pages",
        items: [
          "/subscriptions · FAQ (5 questions) + Product",
          "/shop/yirgacheffe, /shop/huila, /shop/house-blend · Product",
          "/gifts, /shop/beans · Product",
        ],
      },
      {
        id: "ac2",
        column: "approval",
        owner: "orbit",
        area: "content",
        impact: "high",
        effort: "medium",
        points: 2,
        title: "Publish: Northwind vs Bluebird, which subscription fits you",
        items: ["New page: /compare/bluebird-coffee", "Publishes Oct 7 at 09:00"],
        href: `/${slug}/content/art_compare`,
      },
      {
        id: "ac3",
        column: "approval",
        owner: "orbit",
        area: "content",
        impact: "medium",
        effort: "low",
        points: 1,
        title: 'Refresh "How to brew pour-over" (2026)',
        items: ["Updates /guides/pour-over", "Publishes Oct 15 at 09:00"],
        href: `/${slug}/content/art_pourover`,
      },
      {
        id: "ac4",
        column: "approval",
        owner: "orbit",
        area: "technical",
        impact: "medium",
        effort: "low",
        points: 1,
        title: "Write unique meta descriptions for 18 pages",
        items: ["18 product and guide pages"],
      },
      {
        id: "ac5",
        column: "working",
        owner: "orbit",
        area: "content",
        impact: "high",
        effort: "medium",
        points: 2,
        progress: 0.62,
        title: 'Writing "How we source our beans"',
        items: [],
      },
      {
        id: "ac6",
        column: "working",
        owner: "orbit",
        area: "technical",
        impact: "low",
        effort: "low",
        points: 0,
        progress: 0.3,
        title: "Adding alt text to 41 product images",
        items: [],
      },
      {
        id: "ac7",
        column: "yours",
        owner: "you",
        area: "technical",
        impact: "high",
        effort: "low",
        points: 2,
        title: "Unblock GPTBot and ClaudeBot in robots.txt",
        items: [],
        href: `/${slug}/audit/iss_robots`,
      },
      {
        id: "ac8",
        column: "yours",
        owner: "you",
        area: "outreach",
        impact: "high",
        effort: "medium",
        points: 2,
        title: "Send the roundup pitch to thekitchn.com",
        items: [],
        href: `/${slug}/competitors`,
      },
      {
        id: "ac9",
        column: "yours",
        owner: "you",
        area: "content",
        impact: "medium",
        effort: "low",
        points: 1,
        title: "Add author bios to 34 blog posts",
        items: [],
        href: `/${slug}/audit/iss_authors`,
      },
      {
        id: "ac10",
        column: "done",
        owner: "orbit",
        area: "content",
        impact: "medium",
        effort: "medium",
        points: 2,
        title: 'Published "Single-origin vs blends: what to buy"',
        items: [],
      },
      {
        id: "ac11",
        column: "done",
        owner: "you",
        area: "outreach",
        impact: "low",
        effort: "low",
        points: 0,
        title: "Replied to 2 Reddit threads about subscriptions",
        items: [],
      },
    ],
  };
}

/* ───────────── Content ───────────── */

export type ArticleStatus = "published" | "scheduled" | "needsApproval" | "draft";

export type ArticleSummary = {
  id: string;
  title: string;
  status: ArticleStatus;
  /** yyyy-mm-dd, the brand's publish date. */
  date: string;
  score: number;
  keyword: string;
};

const articleList: ArticleSummary[] = [
  {
    id: "art_faq",
    title: "Coffee subscription FAQ",
    status: "published",
    date: "2026-10-01",
    score: 91,
    keyword: "coffee subscription",
  },
  {
    id: "art_blends",
    title: "Single-origin vs blends: what to buy",
    status: "published",
    date: "2026-10-04",
    score: 88,
    keyword: "single origin coffee",
  },
  {
    id: "art_source",
    title: "How we source our beans",
    status: "scheduled",
    date: "2026-10-06",
    score: 90,
    keyword: "ethically sourced coffee",
  },
  {
    id: "art_compare",
    title: "Northwind vs Bluebird: which subscription fits you",
    status: "needsApproval",
    date: "2026-10-07",
    score: 86,
    keyword: "best coffee subscription",
  },
  {
    id: "art_gifts",
    title: "Best coffee gifts for 2026",
    status: "scheduled",
    date: "2026-10-09",
    score: 84,
    keyword: "coffee gift box",
  },
  {
    id: "art_lowacid",
    title: "A guide to low acid coffee",
    status: "draft",
    date: "2026-10-13",
    score: 72,
    keyword: "low acid coffee",
  },
  {
    id: "art_pourover",
    title: "How to brew pour-over (2026 refresh)",
    status: "needsApproval",
    date: "2026-10-15",
    score: 82,
    keyword: "how to brew pour over coffee",
  },
  {
    id: "art_decaf",
    title: "Decaf beans, explained",
    status: "draft",
    date: "2026-10-18",
    score: 70,
    keyword: "decaf coffee beans",
  },
  {
    id: "art_coldbrew",
    title: "Cold brew at home",
    status: "draft",
    date: "2026-10-21",
    score: 68,
    keyword: "coffee for cold brew",
  },
  {
    id: "art_worth",
    title: "Is a coffee subscription worth it?",
    status: "draft",
    date: "2026-10-24",
    score: 74,
    keyword: "is a coffee subscription worth it",
  },
  {
    id: "art_espresso",
    title: "Choosing an espresso subscription",
    status: "draft",
    date: "2026-10-28",
    score: 71,
    keyword: "espresso subscription",
  },
];

export function contentPlan(brandId: string, month: string): ArticleSummary[] {
  if (isNew(brandId)) return [];
  return month === "2026-10" ? articleList : [];
}

export type ChecklistKey = "shortAnswer" | "keyword" | "headings" | "length" | "sources" | "faq" | "links";
export type ChecklistItem = { key: ChecklistKey; ok: boolean };

export type ArticleDetail = ArticleSummary & {
  words: number;
  savedAt: string;
  shortAnswer: string;
  html: string;
  metaTitle: string;
  slug: string;
  checklist: ChecklistItem[];
};

export function articleDetail(brandId: string, id: string): ArticleDetail | null {
  if (isNew(brandId)) return null;
  const summary = articleList.find((a) => a.id === id);
  if (!summary) return null;
  return {
    ...summary,
    words: 1240,
    savedAt: iso(-2 * 60 * 1000),
    shortAnswer:
      "Northwind suits people who want small-batch single origins roasted within 48 hours of shipping. Bluebird suits people who want the widest choice of roasters in one box.",
    html: [
      "<h2>Which subscription fits you?</h2>",
      "<p>Both send fresh coffee on a schedule, but they solve different problems. Northwind roasts every order itself, within 48 hours of shipping. Bluebird curates beans from 40+ partner roasters.</p>",
      "<h2>Price</h2>",
      "<p>A 12 oz bag every two weeks costs [PRICE] with Northwind and $19.50 with Bluebird, before shipping.</p>",
      "<h3>What's included</h3>",
      "<ul><li><p>Free shipping over $35 with both</p></li><li><p>Pause or skip anytime</p></li><li><p>Grind options: whole bean, drip, espresso, French press</p></li></ul>",
      "<h2>Freshness</h2>",
      "<p>Northwind ships within 48 hours of roasting. Bluebird ships within 5 days of roasting because beans travel from partner roasters first.</p>",
      "<h2>Our verdict</h2>",
      "<p>If freshness and knowing the farm matter most, pick Northwind. If you want to try many roasters, pick Bluebird.</p>",
    ].join(""),
    metaTitle: summary.title.length > 55 ? "Northwind vs Bluebird: coffee subscriptions compared" : summary.title,
    slug:
      id === "art_compare"
        ? "compare/bluebird-coffee"
        : summary.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
    checklist: [
      { key: "shortAnswer", ok: true },
      { key: "keyword", ok: true },
      { key: "headings", ok: true },
      { key: "length", ok: true },
      { key: "sources", ok: false },
      { key: "faq", ok: false },
      { key: "links", ok: true },
    ],
  };
}

/* ───────────── Agent ───────────── */

export type OpenTask = { id: string; title: string; status: "waiting" | "working" };

export function openTasks(brandId: string): OpenTask[] {
  if (isNew(brandId)) return [];
  return [
    { id: "t1", title: "Approve schema change", status: "waiting" },
    { id: "t2", title: "Sourcing article", status: "working" },
    { id: "t3", title: "Comparison page", status: "waiting" },
  ];
}
