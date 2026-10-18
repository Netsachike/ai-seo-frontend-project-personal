/**
 * UI-stage data for screens without a mock endpoint. Brand content (questions,
 * keywords, answers, titles) is data in the brand's content language and is
 * not translated; anything the UI labels is an enum the UI translates.
 *
 * `br_new` (Fresh Start Bakery) is the brand-new workspace: every dataset is
 * empty for it, so zero-data states can be reviewed.
 */
import type { Engine } from "@/types/types";

const DAY = 24 * 60 * 60 * 1000;
export const UI_NOW = new Date("2026-10-04T09:30:00Z").getTime();
const iso = (offsetMs: number) => new Date(UI_NOW + offsetMs).toISOString();
const isNew = (brandId: string) => brandId === "br_new";

export type Owner = "rankoya" | "you";
export type Impact = "high" | "medium" | "low";
export type Effort = "low" | "medium" | "high";

/* ───────────── Overview ───────────── */

export type NextAction = {
  id: string;
  owner: Owner;
  title: string;
  impact: Impact;
  note: string;
  cta: "review" | "approve" | "seeSites";
  href: string;
};

export function nextActions(brandId: string, slug: string): NextAction[] {
  if (isNew(brandId)) return [];
  return [
    {
      id: "na1",
      owner: "rankoya",
      title: "Publish a comparison page: Northwind vs Bluebird subscriptions",
      impact: "high",
      note: "Draft ready · targets 9 questions you miss",
      cta: "review",
      href: `/${slug}/content/art_compare`,
    },
    {
      id: "na2",
      owner: "rankoya",
      title: "Add FAQ schema to 6 product pages",
      impact: "high",
      note: "Low effort · AI engines quote FAQ blocks",
      cta: "approve",
      href: `/${slug}/actions`,
    },
    {
      id: "na3",
      owner: "you",
      title: 'Get listed on 3 sites AI engines cite for "best coffee subscription"',
      impact: "high",
      note: "Rankoya can draft the outreach emails",
      cta: "seeSites",
      href: `/${slug}/competitors`,
    },
    {
      id: "na4",
      owner: "rankoya",
      title: 'Refresh "How to brew pour-over", last updated 14 months ago',
      impact: "medium",
      note: "Freshness is a ranking signal",
      cta: "approve",
      href: `/${slug}/actions`,
    },
  ];
}

export type ActivityItem = { id: string; at: string; text: string; sub: string };

export function rankoyaActivity(brandId: string): ActivityItem[] {
  if (isNew(brandId)) return [];
  return [
    {
      id: "a1",
      at: iso(-18 * 60 * 1000),
      text: 'Published "Single-origin vs blends: what to buy" to WordPress',
      sub: "Approved by you on Telegram",
    },
    {
      id: "a2",
      at: iso(-50 * 60 * 1000),
      text: "Rechecked 50 questions across 5 AI engines",
      sub: "You gained 3 new mentions on Gemini",
    },
    {
      id: "a3",
      at: iso(-1.6 * DAY),
      text: "Drafted a comparison page against Bluebird Coffee",
      sub: "Waiting for your approval",
    },
    { id: "a4", at: iso(-1.7 * DAY), text: "Sent your weekly report to Telegram", sub: "Visibility 64, up 8" },
  ];
}

/* ───────────── Visibility ───────────── */

export type Sentiment = "positive" | "neutral" | "negative";

export type EngineVisibility = {
  engine: Engine;
  /** The model that answered (e.g. "perplexity/sonar"); one engine can have several. */
  model?: string;
  /** Latest answers from this model, one per question. */
  answers?: number;
  /** Average visibility score of those answers, 0–100. */
  score?: number;
  mentionRate: number;
  /** Null when no answer mentions you. */
  avgPosition: number | null;
  citations: number;
  sentiment: Sentiment;
  change: number;
};

export type TrackedQuestion = {
  id: string;
  text: string;
  /** Engines that mention you, in display order ChatGPT, Gemini, Perplexity, Claude, AIO. */
  mentionedBy: Engine[];
  rank: number | null;
  topCompetitor: string;
  /** Models with an answer to this question (OpenRouter ids). */
  testedModels?: string[];
  /** When any model last answered it. */
  lastTested?: string | null;
  intent: "commercial" | "informational" | "comparison";
};

export type SourceStatus = "mentionsYou" | "missing" | "yourSite";
export type CitedSource = { domain: string; citations: number; status: SourceStatus };

export type VisibilityData = {
  score: number | null;
  scoreDelta: number;
  rank: number | null;
  brandCount: number;
  mentionRate: number;
  mentionDelta: number;
  answers: number;
  mentioned: number;
  /** Null when no answer mentions you. */
  avgPosition: number | null;
  positionDelta: number;
  positiveSentiment: number;
  sentimentDelta: number;
  checkedAt: string;
  /** Every answer ever recorded, across all runs. */
  totalTests?: number;
  /** When each model last answered, by model id. */
  lastTested?: Record<string, string>;
  engines: EngineVisibility[];
  questions: TrackedQuestion[];
  sources: CitedSource[];
};

export const displayEngines: Engine[] = ["chatgpt", "gemini", "perplexity", "claude", "aio"];

const questions: TrackedQuestion[] = [
  {
    id: "q1",
    text: "best coffee subscription in the US",
    mentionedBy: ["chatgpt", "gemini", "aio"],
    rank: 2,
    topCompetitor: "Bluebird Coffee",
    intent: "commercial",
  },
  {
    id: "q2",
    text: "best single origin coffee beans online",
    mentionedBy: ["chatgpt", "gemini", "perplexity", "claude"],
    rank: 1,
    topCompetitor: "Halfmoon Roastery",
    intent: "commercial",
  },
  {
    id: "q3",
    text: "Northwind Roasters vs Bluebird Coffee",
    mentionedBy: ["chatgpt", "gemini", "perplexity", "claude", "aio"],
    rank: 1,
    topCompetitor: "Bluebird Coffee",
    intent: "comparison",
  },
  {
    id: "q4",
    text: "ethically sourced coffee brands",
    mentionedBy: ["gemini", "perplexity"],
    rank: 4,
    topCompetitor: "Ember & Oak",
    intent: "commercial",
  },
  {
    id: "q5",
    text: "best coffee gift for coffee lovers",
    mentionedBy: ["perplexity"],
    rank: 6,
    topCompetitor: "Bluebird Coffee",
    intent: "commercial",
  },
  {
    id: "q6",
    text: "low acid coffee brands",
    mentionedBy: [],
    rank: null,
    topCompetitor: "Halfmoon Roastery",
    intent: "commercial",
  },
  {
    id: "q7",
    text: "how fresh should coffee beans be",
    mentionedBy: ["chatgpt", "claude"],
    rank: 3,
    topCompetitor: "Bluebird Coffee",
    intent: "informational",
  },
  {
    id: "q8",
    text: "is a coffee subscription worth it",
    mentionedBy: ["gemini"],
    rank: 5,
    topCompetitor: "Bluebird Coffee",
    intent: "informational",
  },
  {
    id: "q9",
    text: "what is single-origin coffee",
    mentionedBy: ["chatgpt", "gemini", "perplexity"],
    rank: 2,
    topCompetitor: "Halfmoon Roastery",
    intent: "informational",
  },
  {
    id: "q10",
    text: "small-batch coffee roasters that ship nationwide",
    mentionedBy: ["chatgpt", "gemini", "perplexity", "aio"],
    rank: 1,
    topCompetitor: "Ember & Oak",
    intent: "commercial",
  },
];

export function visibilityData(brandId: string): VisibilityData {
  if (isNew(brandId)) {
    return {
      score: null,
      scoreDelta: 0,
      rank: null,
      brandCount: 0,
      mentionRate: 0,
      mentionDelta: 0,
      answers: 0,
      mentioned: 0,
      avgPosition: 0,
      positionDelta: 0,
      positiveSentiment: 0,
      sentimentDelta: 0,
      checkedAt: iso(0),
      engines: [],
      questions: [],
      sources: [],
    };
  }
  return {
    score: 64,
    scoreDelta: 8,
    rank: 2,
    brandCount: 4,
    mentionRate: 0.45,
    mentionDelta: 6.2,
    answers: 250,
    mentioned: 113,
    avgPosition: 3.4,
    positionDelta: -0.8,
    positiveSentiment: 0.78,
    sentimentDelta: 3,
    checkedAt: iso(-50 * 60 * 1000),
    engines: [
      { engine: "gemini", mentionRate: 0.61, avgPosition: 2.8, citations: 9, sentiment: "positive", change: 9 },
      { engine: "chatgpt", mentionRate: 0.52, avgPosition: 3.1, citations: 7, sentiment: "positive", change: 7 },
      { engine: "perplexity", mentionRate: 0.47, avgPosition: 3.6, citations: 8, sentiment: "neutral", change: 5 },
      { engine: "claude", mentionRate: 0.38, avgPosition: 4.0, citations: 1, sentiment: "positive", change: 2 },
      { engine: "aio", mentionRate: 0.29, avgPosition: 4.2, citations: 2, sentiment: "neutral", change: -1 },
    ],
    questions,
    sources: [
      { domain: "reddit.com/r/Coffee", citations: 41, status: "mentionsYou" },
      { domain: "northwindroasters.com", citations: 27, status: "yourSite" },
      { domain: "thekitchn.com", citations: 23, status: "missing" },
      { domain: "seriouseats.com", citations: 19, status: "missing" },
      { domain: "coffeereview.com", citations: 12, status: "missing" },
      { domain: "youtube.com", citations: 9, status: "mentionsYou" },
    ],
  };
}

/* ───────────── Question detail ───────────── */

export type EngineAnswer = {
  engine: Engine;
  /** The model that answered (e.g. "perplexity/sonar"). */
  model?: string;
  position: number | null;
  listed: number;
  /** Answer text; the brand name is highlighted wherever it appears. */
  answer: string;
  citations: string[];
  whyMissing: string | null;
  status: "ok" | "unreachable";
};

export type PlanStep = { id: string; owner: Owner; text: string };

export type QuestionDetail = {
  question: TrackedQuestion;
  market: string;
  language: string;
  checkedAt: string;
  answers: EngineAnswer[];
  plan: PlanStep[];
  /** Engines mentioning you per week, oldest first, out of 5. */
  history: number[];
};

export function questionDetail(brandId: string, id: string): QuestionDetail | null {
  if (isNew(brandId)) return null;
  const question = questions.find((q) => q.id === id);
  if (!question) return null;
  const mentioned = (e: Engine) => question.mentionedBy.includes(e);
  const brand = "Northwind Roasters";
  const answers: EngineAnswer[] = displayEngines.map((engine, i) => {
    const on = mentioned(engine);
    if (engine === "aio" && question.id === "q6") {
      return { engine, position: null, listed: 0, answer: "", citations: [], whyMissing: null, status: "unreachable" };
    }
    return {
      engine,
      position: on ? Math.min(5, (question.rank ?? 2) + (i % 2)) : null,
      listed: 4 + (i % 2),
      answer: on
        ? `Here are some of the best options right now: 1. ${question.topCompetitor}, known for its wide selection and flexible delivery. 2. ${brand}, a good pick if you want small-batch single origins roasted to order within 48 hours. 3. Halfmoon Roastery, popular for espresso blends.`
        : `Popular options include ${question.topCompetitor} for variety, Halfmoon Roastery for espresso drinkers, and Ember & Oak if ethical sourcing matters most to you. Look for a subscription that lets you pause and choose grind size.`,
      citations: on ? ["thekitchn.com", "northwindroasters.com"] : ["thekitchn.com", "seriouseats.com"],
      whyMissing: on
        ? null
        : "This engine leans on review roundups and sourcing pages. You have no page explaining how you source beans, and you're absent from the 2 roundups it read.",
      status: "ok",
    };
  });
  return {
    question,
    market: "US",
    language: "en",
    checkedAt: iso(-50 * 60 * 1000),
    answers,
    plan: [
      {
        id: "p1",
        owner: "rankoya",
        text: 'Publish "How we source our beans" with origin, farm and price data. Rankoya writes it.',
      },
      { id: "p2", owner: "rankoya", text: "Add FAQ and Product schema to the subscription page. Rankoya does it." },
      {
        id: "p3",
        owner: "you",
        text: "Pitch thekitchn.com and seriouseats.com for their next roundup. You send it; Rankoya drafts the email.",
      },
    ],
    history: [1, 1, 2, 2, 2, 3, 3, question.mentionedBy.length],
  };
}

/* ───────────── Rankings ───────────── */

export type Device = "desktop" | "mobile";
export type AiPresence = { engines: number };

export type KeywordRanking = {
  id: string;
  keyword: string;
  position: number | null;
  change: number | null;
  spark: number[];
  volume: number;
  difficulty: number;
  url: string | null;
  aiEngines: number;
  isNew?: boolean;
};

export type RankingsData = {
  tracked: number;
  avgPosition: number;
  avgDelta: number;
  top3: number;
  top3Delta: number;
  top10: number;
  top10Delta: number;
  top100: number;
  top100Delta: number;
  notRanking: number;
  notRankingDelta: number;
  avgSeries: { date: string; value: number }[];
  bands: { key: "top3" | "top10" | "top20" | "top50" | "top100" | "none"; count: number }[];
  keywords: KeywordRanking[];
};

const up = [20, 18, 19, 14, 11, 8, 5];
const down = [6, 8, 7, 11, 14, 15, 18];
const flat = [12, 13, 11, 12, 12, 11, 12];

export function rankingsData(brandId: string, device: Device, days: number): RankingsData {
  if (isNew(brandId)) {
    return {
      tracked: 0,
      avgPosition: 0,
      avgDelta: 0,
      top3: 0,
      top3Delta: 0,
      top10: 0,
      top10Delta: 0,
      top100: 0,
      top100Delta: 0,
      notRanking: 0,
      notRankingDelta: 0,
      avgSeries: [],
      bands: [],
      keywords: [],
    };
  }
  const m = device === "mobile" ? 1 : 0;
  const keywords: KeywordRanking[] = [
    {
      id: "r1",
      keyword: "single origin coffee subscription",
      position: 2 + m,
      change: 3,
      spark: up,
      volume: 2900,
      difficulty: 34,
      url: "/subscriptions",
      aiEngines: 3,
    },
    {
      id: "r2",
      keyword: "fresh roasted coffee beans",
      position: 4 + m,
      change: 5,
      spark: up,
      volume: 6600,
      difficulty: 41,
      url: "/shop/beans",
      aiEngines: 3,
    },
    {
      id: "r3",
      keyword: "best coffee subscription",
      position: 7 + m,
      change: 2,
      spark: up,
      volume: 14800,
      difficulty: 62,
      url: "/subscriptions",
      aiEngines: 1,
    },
    {
      id: "r4",
      keyword: "ethiopian yirgacheffe beans",
      position: 3,
      change: 0,
      spark: flat,
      volume: 1600,
      difficulty: 22,
      url: "/shop/yirgacheffe",
      aiEngines: 1,
    },
    {
      id: "r5",
      keyword: "how to brew pour over coffee",
      position: 14 + m,
      change: -4,
      spark: down,
      volume: 9900,
      difficulty: 48,
      url: "/guides/pour-over",
      aiEngines: 0,
    },
    {
      id: "r6",
      keyword: "coffee gift box",
      position: 11,
      change: 6,
      spark: up,
      volume: 5400,
      difficulty: 39,
      url: "/gifts",
      aiEngines: 0,
    },
    {
      id: "r7",
      keyword: "low acid coffee",
      position: 38 + m,
      change: -2,
      spark: down,
      volume: 12100,
      difficulty: 45,
      url: "/blog/low-acid",
      aiEngines: 0,
    },
    {
      id: "r8",
      keyword: "ethically sourced coffee",
      position: 19,
      change: 8,
      spark: up,
      volume: 3600,
      difficulty: 37,
      url: "/about",
      aiEngines: 1,
    },
    {
      id: "r9",
      keyword: "whole bean coffee online",
      position: null,
      change: null,
      spark: flat,
      volume: 4400,
      difficulty: 51,
      url: null,
      aiEngines: 0,
      isNew: true,
    },
    {
      id: "r10",
      keyword: "coffee of the month club",
      position: 12,
      change: 1,
      spark: up,
      volume: 2900,
      difficulty: 37,
      url: "/subscriptions",
      aiEngines: 1,
    },
    {
      id: "r11",
      keyword: "light roast coffee beans",
      position: 16,
      change: -1,
      spark: flat,
      volume: 3600,
      difficulty: 35,
      url: "/shop/light-roast",
      aiEngines: 0,
    },
    {
      id: "r12",
      keyword: "organic coffee subscription",
      position: 9 + m,
      change: 4,
      spark: up,
      volume: 1300,
      difficulty: 44,
      url: "/subscriptions",
      aiEngines: 2,
    },
  ];
  const avgSeries = Array.from({ length: days }, (_, i) => {
    const t = days === 1 ? 1 : i / (days - 1);
    const wobble = Math.sin(i * 1.7) * 0.8;
    return {
      date: new Date(UI_NOW - (days - 1 - i) * DAY).toISOString().slice(0, 10),
      value: Math.round((31 - 7.6 * t + wobble + m) * 10) / 10,
    };
  });
  return {
    tracked: 62,
    avgPosition: 23.4 + m,
    avgDelta: -7.6,
    top3: 5,
    top3Delta: 2,
    top10: 18 - m,
    top10Delta: 4,
    top100: 49,
    top100Delta: 6,
    notRanking: 13,
    notRankingDelta: -6,
    avgSeries,
    bands: [
      { key: "top3", count: 5 },
      { key: "top10", count: 13 },
      { key: "top20", count: 9 },
      { key: "top50", count: 14 },
      { key: "top100", count: 8 },
      { key: "none", count: 13 },
    ],
    keywords,
  };
}

/* ───────────── Competitors ───────────── */

export type CompetitorRow = {
  id: string;
  name: string;
  domain: string;
  isYou: boolean;
  score: number;
  share: number;
  avgPosition: number;
  citations: number;
  top10: number;
};

export type QuestionGap = { id: string; question: string; winners: { name: string; engines: number }[] };
export type KeywordGap = { id: string; keyword: string; competitor: string; position: number; volume: number };
export type LinkSite = {
  id: string;
  domain: string;
  why: string;
  authority: number;
  kind: "roundup" | "review" | "submission" | "community";
};

export type CompetitorsData = {
  leader: string;
  lead: number;
  rows: CompetitorRow[];
  questionGaps: QuestionGap[];
  keywordGaps: KeywordGap[];
  sites: LinkSite[];
};

export function competitorsData(brandId: string): CompetitorsData {
  if (isNew(brandId)) return { leader: "", lead: 0, rows: [], questionGaps: [], keywordGaps: [], sites: [] };
  return {
    leader: "Bluebird Coffee",
    lead: 8,
    rows: [
      {
        id: "cmp_bluebird",
        name: "Bluebird Coffee",
        domain: "bluebirdcoffee.example",
        isYou: false,
        score: 72,
        share: 0.31,
        avgPosition: 2.1,
        citations: 41,
        top10: 29,
      },
      {
        id: "br_northwind",
        name: "Northwind Roasters",
        domain: "northwindroasters.com",
        isYou: true,
        score: 64,
        share: 0.24,
        avgPosition: 3.4,
        citations: 27,
        top10: 18,
      },
      {
        id: "cmp_halfmoon",
        name: "Halfmoon Roastery",
        domain: "halfmoonroastery.example",
        isYou: false,
        score: 47,
        share: 0.19,
        avgPosition: 3.9,
        citations: 16,
        top10: 22,
      },
      {
        id: "cmp_ember",
        name: "Ember & Oak",
        domain: "emberandoak.example",
        isYou: false,
        score: 37,
        share: 0.14,
        avgPosition: 4.6,
        citations: 9,
        top10: 11,
      },
    ],
    questionGaps: [
      {
        id: "g1",
        question: "best coffee gift for coffee lovers",
        winners: [
          { name: "Bluebird Coffee", engines: 4 },
          { name: "Ember & Oak", engines: 2 },
        ],
      },
      { id: "g2", question: "low acid coffee brands", winners: [{ name: "Halfmoon Roastery", engines: 3 }] },
      {
        id: "g3",
        question: "Bluebird Coffee alternatives",
        winners: [
          { name: "Halfmoon Roastery", engines: 3 },
          { name: "Ember & Oak", engines: 2 },
        ],
      },
      { id: "g4", question: "is a coffee subscription worth it", winners: [{ name: "Bluebird Coffee", engines: 3 }] },
    ],
    keywordGaps: [
      { id: "k1", keyword: "coffee of the month club", competitor: "Bluebird Coffee", position: 3, volume: 8100 },
      { id: "k2", keyword: "decaf coffee beans", competitor: "Halfmoon Roastery", position: 6, volume: 6600 },
      { id: "k3", keyword: "espresso subscription", competitor: "Halfmoon Roastery", position: 4, volume: 2400 },
      { id: "k4", keyword: "coffee for cold brew", competitor: "Bluebird Coffee", position: 8, volume: 5400 },
    ],
    sites: [
      {
        id: "s1",
        domain: "thekitchn.com",
        why: "Cited in 23 answers. Lists Bluebird and Halfmoon in its subscription roundup.",
        authority: 89,
        kind: "roundup",
      },
      {
        id: "s2",
        domain: "seriouseats.com",
        why: "Cited in 19 answers. Reviews beans by origin; you are not reviewed yet.",
        authority: 90,
        kind: "review",
      },
      {
        id: "s3",
        domain: "coffeereview.com",
        why: "Cited in 12 answers. Accepts roaster submissions for scoring.",
        authority: 72,
        kind: "submission",
      },
      {
        id: "s4",
        domain: "reddit.com/r/Coffee",
        why: "Already mentions you. Bluebird gets 3× more recommendations.",
        authority: 96,
        kind: "community",
      },
    ],
  };
}

/* ───────────── Site audit ───────────── */

export type Severity = "critical" | "warning" | "notice";
export type AuditCategory = {
  key: "technical" | "vitals" | "answerFirst" | "citation" | "freshness" | "structured";
  score: number;
  note: string;
};
export type AuditIssue = {
  id: string;
  severity: Severity;
  owner: Owner;
  title: string;
  why: string;
  pages: number | null;
  affected: string[];
  steps: string[];
};

export type AuditData = {
  domain: string;
  pagesChecked: number;
  checkedAt: string;
  seoHealth: number | null;
  aiReadiness: number | null;
  categories: AuditCategory[];
  issues: AuditIssue[];
};

const auditIssues: AuditIssue[] = [
  {
    id: "iss_schema",
    severity: "critical",
    owner: "rankoya",
    title: "Product pages have no Product or FAQ schema",
    why: "AI engines and rich results read structured data first; 6 key pages have none.",
    pages: 6,
    affected: ["/subscriptions", "/shop/yirgacheffe", "/shop/huila", "/shop/house-blend", "/gifts", "/shop/beans"],
    steps: [
      "Add Product schema with price, availability and reviews.",
      "Add an FAQ block with 3–5 real customer questions.",
      "Validate with Google's Rich Results Test.",
    ],
  },
  {
    id: "iss_robots",
    severity: "critical",
    owner: "you",
    title: "robots.txt blocks GPTBot and ClaudeBot",
    why: "ChatGPT and Claude cannot read your site, so they cannot cite it.",
    pages: null,
    affected: ["/robots.txt"],
    steps: [
      "Open robots.txt in your hosting panel or WordPress SEO plugin.",
      "Remove the Disallow rules for GPTBot and ClaudeBot.",
      "Save, then ask Rankoya to recheck. Engines pick it up within a few days.",
    ],
  },
  {
    id: "iss_answer",
    severity: "critical",
    owner: "rankoya",
    title: "Subscription page answers the question after 600 words",
    why: "Lead with a 2–3 sentence answer so engines can quote you directly.",
    pages: 1,
    affected: ["/subscriptions"],
    steps: ["Move a 2–3 sentence summary to the top of the page.", "Keep the detail below it."],
  },
  {
    id: "iss_fresh",
    severity: "warning",
    owner: "rankoya",
    title: "22 guides not updated in over 12 months",
    why: "Freshness matters for both Google and AI answers.",
    pages: 22,
    affected: ["/guides/pour-over", "/guides/french-press", "/guides/grind-size", "/guides/storage"],
    steps: ["Refresh facts, prices and dates.", "Add a visible “Updated” date."],
  },
  {
    id: "iss_authors",
    severity: "warning",
    owner: "you",
    title: "Missing author bios on blog posts",
    why: "Named, credible authors strengthen E-E-A-T and citation odds.",
    pages: 34,
    affected: ["/blog/low-acid", "/blog/single-origin-vs-blends", "/blog/cold-brew"],
    steps: ["Add a short bio and photo for each author.", "Link each post to its author page."],
  },
  {
    id: "iss_alt",
    severity: "warning",
    owner: "rankoya",
    title: "Images without alt text",
    why: "Alt text helps accessibility and image search.",
    pages: 41,
    affected: ["/shop/beans", "/gifts"],
    steps: ["Write descriptive alt text for each product image."],
  },
  {
    id: "iss_meta",
    severity: "notice",
    owner: "rankoya",
    title: "Duplicate meta descriptions",
    why: "Search engines may rewrite them; Rankoya can write unique ones.",
    pages: 18,
    affected: ["/shop/huila", "/shop/house-blend"],
    steps: ["Write a unique 150-character description for each page."],
  },
  {
    id: "iss_links",
    severity: "notice",
    owner: "you",
    title: "2 broken outbound links",
    why: "Broken links waste crawl budget and look neglected.",
    pages: 2,
    affected: ["/about", "/blog/cold-brew"],
    steps: ["Update or remove the links."],
  },
];

export function auditData(brandId: string, domain: string): AuditData {
  if (isNew(brandId)) {
    return {
      domain,
      pagesChecked: 0,
      checkedAt: iso(0),
      seoHealth: null,
      aiReadiness: null,
      categories: [],
      issues: [],
    };
  }
  return {
    domain,
    pagesChecked: 148,
    checkedAt: iso(-3.5 * 60 * 60 * 1000),
    seoHealth: 76,
    aiReadiness: 58,
    categories: [
      { key: "technical", score: 84, note: "Fast pages, 2 broken links" },
      { key: "vitals", score: 78, note: "LCP 2.1 s on mobile" },
      { key: "answerFirst", score: 66, note: "41 pages bury the answer" },
      { key: "citation", score: 52, note: "Few stats, sources or authors" },
      { key: "freshness", score: 45, note: "22 guides older than 12 months" },
      { key: "structured", score: 41, note: "No FAQ or Product schema" },
    ],
    issues: auditIssues,
  };
}
