import { faker } from "@faker-js/faker";

import type { Engine } from "@/types/types";
import type { AgentThread, BrandSeries, BrandSummary, Me, Notification, Usage } from "@/lib/mocks/types";

/** Deterministic so the server and browser mock instances agree. */
faker.seed(4021);

const DAY = 24 * 60 * 60 * 1000;
/** Mocks anchor "today" to a fixed date so screenshots and tests are stable. */
export const MOCK_NOW = new Date("2026-10-04T09:30:00Z").getTime();
const iso = (offsetMs: number) => new Date(MOCK_NOW + offsetMs).toISOString();

export const me: Me = {
  id: "usr_fvo",
  name: "Favour Odili",
  email: "favourto91@gmail.com",
  avatarUrl: null,
  locale: "en",
  theme: "system",
  timezone: "America/New_York",
  telegram: { handle: "fvo_northwind", connected: true },
};

/** Usage meters have no backend endpoint yet. One record serves every workspace. */
export const usage: Usage = {
  plan: { id: "plan_reseller", name: "Enterprise", tier: "agency", isTopTier: true },
  credits: { remaining: 1380, total: 2000 },
  breakdown: {
    scans: { used: 22, limit: 30 },
    articles: { used: 7, limit: 12 },
    prompts: { used: 50, limit: 100 },
  },
  renewsAt: iso(26 * DAY),
};

const engineScores: Record<Engine, number> = {
  chatgpt: 0.52,
  gemini: 0.61,
  perplexity: 0.47,
  claude: 0.38,
  aio: 0.29,
};

function walk(start: number, end: number, days: number, jitter: number): number[] {
  return Array.from({ length: days }, (_, i) => {
    const t = days === 1 ? 1 : i / (days - 1);
    const base = start + (end - start) * t;
    const noise = i === 0 || i === days - 1 ? 0 : faker.number.float({ min: -jitter, max: jitter });
    return Math.round((base + noise) * 10) / 10;
  });
}

function series(days: number): BrandSeries[] {
  const dates = Array.from({ length: days }, (_, i) =>
    new Date(MOCK_NOW - (days - 1 - i) * DAY).toISOString().slice(0, 10),
  );
  const make = (brandId: string, name: string, isYou: boolean, values: number[]): BrandSeries => ({
    brandId,
    name,
    isYou,
    points: dates.map((date, i) => ({ date, value: values[i] })),
  });
  return [
    make("br_northwind", "Northwind Roasters", true, walk(48, 64, days, 1.6)),
    make("cmp_bluebird", "Bluebird Coffee", false, walk(69, 72, days, 1.2)),
    make("cmp_halfmoon", "Halfmoon Roastery", false, walk(46, 47, days, 1.4)),
    make("cmp_ember", "Ember & Oak", false, walk(33, 37, days, 1.0)),
  ];
}

const rangeDays = { "7d": 7, "30d": 30, "90d": 90, custom: 30 } as const;

export function brandSummary(brandId: string, range: keyof typeof rangeDays): BrandSummary {
  if (brandId === "br_new") {
    return {
      status: "first_scan_running",
      firstScanJobId: "job_first_scan",
      visibility: {
        score: null,
        delta: { value: 0, unit: "points" },
        rank: null,
        brandCount: 0,
        questionCount: 20,
      },
      engines: [],
      kpis: [],
      trend: [],
      shareOfVoice: [],
    };
  }
  const days = rangeDays[range];
  return {
    status: "ready",
    firstScanJobId: null,
    visibility: {
      score: 64,
      delta: { value: 8, unit: "points" },
      rank: 2,
      brandCount: 4,
      questionCount: 50,
    },
    engines: (Object.keys(engineScores) as Engine[]).map((engine) => ({
      engine,
      mentionRate: engineScores[engine],
    })),
    kpis: [
      {
        key: "mentionRate",
        value: 0.45,
        total: null,
        delta: { value: 6.2, unit: "points" },
        spark: [32, 30, 31, 26, 24, 25, 18, 14, 10].map((v) => 40 - v),
      },
      {
        key: "avgAiPosition",
        value: 3.4,
        total: null,
        delta: { value: -0.8, unit: "rank" },
        spark: [28, 29, 26, 27, 22, 20, 21, 16, 14].map((v) => 40 - v),
      },
      {
        key: "googleTop10",
        value: 18,
        total: 62,
        delta: { value: 4, unit: "count" },
        spark: [30, 30, 27, 27, 24, 22, 22, 18, 16].map((v) => 40 - v),
      },
      {
        key: "aiCitations",
        value: 27,
        total: null,
        delta: { value: 9, unit: "count" },
        spark: [34, 33, 30, 31, 25, 21, 19, 15, 9].map((v) => 40 - v),
      },
    ],
    trend: series(days),
    shareOfVoice: [
      {
        brandId: "cmp_bluebird",
        name: "Bluebird Coffee",
        isYou: false,
        share: 0.31,
        delta: { value: -2.1, unit: "points" },
      },
      {
        brandId: "br_northwind",
        name: "Northwind Roasters",
        isYou: true,
        share: 0.24,
        delta: { value: 4.3, unit: "points" },
      },
      {
        brandId: "cmp_halfmoon",
        name: "Halfmoon Roastery",
        isYou: false,
        share: 0.19,
        delta: { value: -0.9, unit: "points" },
      },
      {
        brandId: "cmp_ember",
        name: "Ember & Oak",
        isYou: false,
        share: 0.14,
        delta: { value: 0.6, unit: "points" },
      },
      {
        brandId: "others",
        name: "Others",
        isYou: false,
        share: 0.12,
        delta: { value: -1.9, unit: "points" },
      },
    ],
  };
}

export const notifications: Notification[] = [
  {
    id: "ntf_1",
    kind: "approval_waiting",
    createdAt: iso(-18 * 60 * 1000),
    read: false,
    href: "/northwind-roasters/actions",
    params: { title: "Add FAQ and Product schema to 6 pages" },
  },
  {
    id: "ntf_2",
    kind: "agent_event",
    createdAt: iso(-40 * 60 * 1000),
    read: false,
    href: "/northwind-roasters/content",
    params: {
      title: "Single-origin vs blends: what to buy",
      site: "WordPress",
    },
  },
  {
    id: "ntf_3",
    kind: "scan_finished",
    createdAt: iso(-50 * 60 * 1000),
    read: false,
    href: "/northwind-roasters/visibility",
    params: { gained: 3, engine: "gemini" },
  },
  {
    id: "ntf_4",
    kind: "team_invite",
    createdAt: iso(-2 * DAY),
    read: true,
    href: "/northwind-roasters/settings/team",
    params: { name: "Sam Rivera" },
  },
];

export const agentThread: AgentThread = {
  id: "thr_main",
  messages: [
    {
      id: "msg_1",
      role: "user",
      createdAt: iso(-38 * 60 * 1000),
      source: "telegram",
      body: "Where do we rank on ChatGPT and Claude for coffee subscriptions?",
      approval: null,
      task: null,
    },
    {
      id: "msg_2",
      role: "agent",
      createdAt: iso(-37 * 60 * 1000),
      source: "web",
      body: "I asked both engines 12 questions about coffee subscriptions this morning.\n\n| Engine | Mentions you | Avg. position | Leader |\n|---|---:|---:|---|\n| ChatGPT | 7 of 12 | #2.6 | Bluebird (10 of 12) |\n| Claude | 3 of 12 | #3.7 | Bluebird (9 of 12) |\n\nClaude skips you mostly because you have no page about how you source beans. I can write that page and add FAQ schema to your 6 product pages. Want me to?",
      approval: null,
      task: null,
    },
    {
      id: "msg_3",
      role: "user",
      createdAt: iso(-36 * 60 * 1000),
      source: "web",
      body: "Yes, do both.",
      approval: null,
      task: null,
    },
    {
      id: "msg_4",
      role: "agent",
      createdAt: iso(-35 * 60 * 1000),
      source: "web",
      body: "Started the article. The schema change touches your live site, so I need your go-ahead first.",
      approval: {
        id: "apr_schema",
        title: "Add FAQ and Product schema to 6 pages",
        status: "pending",
        items: [
          "/subscriptions · FAQ (5 questions) + Product",
          "/shop/yirgacheffe, /shop/huila, /shop/house-blend · Product",
          "/gifts, /shop/beans · Product",
        ],
        channels: ["web", "telegram"],
      },
      task: {
        id: "tsk_article",
        title: 'Writing "How we source our beans"',
        status: "working",
        jobId: "job_article",
        detail: "1,240 words",
      },
    },
  ],
};
