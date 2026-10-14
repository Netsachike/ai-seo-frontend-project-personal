"use client";

import { useQuery } from "@tanstack/react-query";
import { useNow } from "next-intl";

import type { AiVisibilityResultWithPrompt, Engine, GscQuery, Site } from "@/types/types";
import type { BrandSeries } from "@/lib/mocks/types";
import type { ShareItem } from "@/components/charts/share-of-voice";
import { aiVisibilityKeys, contentKeys, publishingKeys } from "@/lib/api/query-keys";
import { toNumber } from "@/services/api/helpers";
import aiVisibilityService from "@/services/ai-visibility";
import articleService from "@/services/articles";
import publishingService from "@/services/publishing";
import { useGscOverview } from "@/features/search-console/hooks";
import { engineOf } from "@/features/visibility/model";

const DAY = 86_400_000;

export const OVERVIEW_PLATFORMS = ["google", "chatgpt", "claude", "gemini", "perplexity"] as const;
export type OverviewPlatform = (typeof OVERVIEW_PLATFORMS)[number];

/** One platform card: a 0–1 rate for the range, its change against the previous range, and a daily series. */
export type PlatformGlance = { platform: OverviewPlatform; value: number; delta: number; spark: number[] };

export type ActivityItem = {
  id: string;
  kind: "crawl" | "test" | "article" | "published";
  at: string;
  title: string;
};

const dateOf = (r: AiVisibilityResultWithPrompt) => r.tested_at ?? r.created_at;
const inWindow = (iso: string, from: number, to: number) => {
  const t = new Date(iso).getTime();
  return t >= from && t < to;
};

/** Share of answers that mention the site. 0 when there are none. */
const mentionRate = (rows: AiVisibilityResultWithPrompt[]) =>
  rows.length ? rows.filter((r) => r.business_mentioned).length / rows.length : 0;

/** Daily values over the range, oldest first; days with no rows are skipped. */
function daily<T>(rows: T[], dateOfRow: (row: T) => string, value: (rows: T[]) => number) {
  const byDay = new Map<string, T[]>();
  for (const row of rows) {
    const day = dateOfRow(row).slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), row]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, value: value(list) }));
}

/** Share of distinct Search Console queries whose average position is in the top 10. */
function top10Share(rows: GscQuery[]) {
  const byQuery = new Map<string, { sum: number; weight: number }>();
  for (const row of rows) {
    const position = toNumber(row.position);
    if (position === null) continue;
    const weight = Math.max(1, row.impressions);
    const current = byQuery.get(row.query) ?? { sum: 0, weight: 0 };
    byQuery.set(row.query, { sum: current.sum + position * weight, weight: current.weight + weight });
  }
  const positions = [...byQuery.values()].map((v) => v.sum / v.weight);
  return positions.length ? positions.filter((p) => p <= 10).length / positions.length : 0;
}

const nameOf = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["name", "domain", "url"]) if (typeof record[key] === "string") return record[key] as string;
  }
  return null;
};

/**
 * Everything the overview shows, from live data only: AI answers (mention
 * rate per engine, the daily trend and share of voice), Search Console (the
 * Google card) and recent work (crawls, tests, articles, publications). Empty
 * data gives zeros, never sample values.
 */
export function useOverview(site: Site | undefined, days: number) {
  const id = site?.id ?? 0;
  const enabled = Boolean(site);
  const results = useQuery({
    queryKey: aiVisibilityKeys.results(id),
    enabled,
    queryFn: async () => (await aiVisibilityService.results(id)).data.data,
  });
  const gsc = useGscOverview(site?.id);
  const articles = useQuery({
    queryKey: contentKeys.articles(id),
    enabled,
    queryFn: async () => (await articleService.list(id, { per_page: 100 })).data.data,
  });
  const publications = useQuery({
    queryKey: publishingKeys.publications(id),
    enabled,
    queryFn: async () => (await publishingService.publications(id)).data,
  });

  const now = useNow({ updateInterval: 60_000 }).getTime();
  const from = now - days * DAY;
  const previousFrom = from - days * DAY;
  const all = results.data ?? [];
  const current = all.filter((r) => inWindow(dateOf(r), from, now + DAY));
  const previous = all.filter((r) => inWindow(dateOf(r), previousFrom, from));
  const queries = gsc.data?.queries ?? [];
  const gscCurrent = queries.filter((q) => inWindow(q.date, from, now + DAY));
  const gscPrevious = queries.filter((q) => inWindow(q.date, previousFrom, from));

  const forEngine = (rows: AiVisibilityResultWithPrompt[], engine: Engine) =>
    rows.filter((r) => engineOf(r.model) === engine);
  const platforms: PlatformGlance[] = OVERVIEW_PLATFORMS.map((platform) => {
    if (platform === "google") {
      const value = top10Share(gscCurrent);
      return {
        platform,
        value,
        delta: gscPrevious.length ? Math.round((value - top10Share(gscPrevious)) * 100) : 0,
        spark: daily(gscCurrent, (q) => q.date, top10Share).map((p) => p.value),
      };
    }
    const rows = forEngine(current, platform);
    const before = forEngine(previous, platform);
    const value = mentionRate(rows);
    return {
      platform,
      value,
      delta: before.length ? Math.round((value - mentionRate(before)) * 100) : 0,
      spark: daily(rows, dateOf, mentionRate).map((p) => p.value),
    };
  });

  const trend: BrandSeries[] = [
    {
      brandId: "you",
      name: site?.name ?? "",
      isYou: true,
      points: daily(current, dateOf, (rows) => Math.round(mentionRate(rows) * 100)),
    },
  ];

  // Every mention in the range: the site's, and each competitor named in the same answers.
  const mentions = new Map<string, number>();
  for (const row of current) {
    if (row.business_mentioned) mentions.set("you", (mentions.get("you") ?? 0) + 1);
    for (const competitor of row.competitors_mentioned ?? []) {
      const name = nameOf(competitor);
      if (name) mentions.set(name, (mentions.get(name) ?? 0) + 1);
    }
  }
  const totalMentions = [...mentions.values()].reduce((a, b) => a + b, 0);
  const others = [...mentions.entries()]
    .filter(([name]) => name !== "you")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const shareOfVoice: ShareItem[] = totalMentions
    ? [
        {
          brandId: "you",
          name: site?.name ?? "",
          isYou: true,
          share: (mentions.get("you") ?? 0) / totalMentions,
          delta: { value: 0, unit: "points" },
        },
        ...others.map(([name, count]) => ({
          brandId: name,
          name,
          isYou: false,
          share: count / totalMentions,
          delta: { value: 0, unit: "points" as const },
        })),
      ]
    : [];

  const activity: ActivityItem[] = [
    ...(site?.last_crawled_at
      ? [{ id: "crawl", kind: "crawl" as const, at: site.last_crawled_at, title: site.domain }]
      : []),
    ...(all[0]
      ? [{ id: `test-${all[0].id}`, kind: "test" as const, at: dateOf(all[0]), title: String(current.length) }]
      : []),
    ...(publications.data?.data ?? []).map((p) => ({
      id: `pub-${p.id}`,
      kind: "published" as const,
      at: p.published_at ?? p.created_at,
      title: p.article?.title ?? p.published_url ?? "",
    })),
    ...(articles.data ?? []).map((a) => ({
      id: `art-${a.id}`,
      kind: "article" as const,
      at: a.created_at,
      title: a.title,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const queriesList = [results, gsc, articles, publications];
  return {
    platforms,
    trend,
    shareOfVoice,
    activity,
    hasResults: current.length > 0,
    isPending: !site || results.isPending || gsc.isPending,
    activityPending: articles.isPending || publications.isPending,
    isError: queriesList.some((q) => q.isError),
    refetch: () => Promise.all(queriesList.map((q) => q.refetch())),
  };
}
