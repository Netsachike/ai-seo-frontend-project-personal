"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  AiVisibilityPromptWithKeyword,
  AiVisibilityResultWithPrompt,
  GscQuery,
  Keyword,
  SerpResult,
} from "@/types/types";
import type { KeywordRanking, RankingsData } from "@/lib/mocks/ui-data";
import { aiVisibilityKeys, keywordKeys, serpKeys } from "@/lib/api/query-keys";
import { toNumber } from "@/services/api/helpers";
import aiVisibilityService from "@/services/ai-visibility";
import keywordService from "@/services/keywords";
import serpService from "@/services/serp";
import { useGscOverview } from "@/features/search-console/hooks";
import { engineOf } from "@/features/visibility/model";

export type Device = "desktop" | "mobile";

const normalise = (keyword: string) => keyword.trim().toLowerCase();

/** Average Search Console position per query for one device. */
function gscPositions(rows: GscQuery[], device: Device) {
  const byQuery = new Map<string, { sum: number; weight: number; page: string }>();
  for (const row of rows) {
    if (row.device && row.device.toLowerCase() !== device) continue;
    const position = toNumber(row.position);
    if (position === null) continue;
    const key = normalise(row.query);
    const weight = Math.max(1, row.impressions);
    const current = byQuery.get(key) ?? { sum: 0, weight: 0, page: row.page };
    byQuery.set(key, { sum: current.sum + position * weight, weight: current.weight + weight, page: current.page });
  }
  return new Map([...byQuery].map(([key, v]) => [key, { position: v.sum / v.weight, page: v.page }]));
}

/** The site's best organic position per keyword from SERP research. */
function serpPositions(rows: SerpResult[]) {
  const best = new Map<string, { position: number; url: string }>();
  for (const row of rows) {
    if (!row.is_target_site) continue;
    const key = normalise(row.keyword);
    const current = best.get(key);
    if (!current || row.position < current.position) best.set(key, { position: row.position, url: row.url });
  }
  return best;
}

/** AI engines that mentioned the site for prompts generated from each keyword. */
function aiEnginesByKeyword(prompts: AiVisibilityPromptWithKeyword[], results: AiVisibilityResultWithPrompt[]) {
  const keywordOfPrompt = new Map(prompts.filter((p) => p.keyword_id).map((p) => [p.id, p.keyword_id as number]));
  const engines = new Map<number, Set<string>>();
  for (const result of results) {
    const keywordId = keywordOfPrompt.get(result.ai_visibility_prompt_id);
    const engine = engineOf(result.model);
    if (!keywordId || !engine || !result.business_mentioned) continue;
    engines.set(keywordId, (engines.get(keywordId) ?? new Set()).add(engine));
  }
  return engines;
}

/** Daily average position (impression-weighted) over the last `days`, oldest first. */
function averageSeries(rows: GscQuery[], device: Device, days: number) {
  const since = Date.now() - days * 86_400_000;
  const byDay = new Map<string, { sum: number; weight: number }>();
  for (const row of rows) {
    const position = toNumber(row.position);
    if (position === null || new Date(row.date).getTime() < since) continue;
    if (row.device && row.device.toLowerCase() !== device) continue;
    const day = row.date.slice(0, 10);
    const weight = Math.max(1, row.impressions);
    const current = byDay.get(day) ?? { sum: 0, weight: 0 };
    byDay.set(day, { sum: current.sum + position * weight, weight: current.weight + weight });
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, value: Math.round((v.sum / v.weight) * 10) / 10 }));
}

const band = (position: number | null): RankingsData["bands"][number]["key"] =>
  position === null || position > 100
    ? "none"
    : position <= 3
      ? "top3"
      : position <= 10
        ? "top10"
        : position <= 20
          ? "top20"
          : position <= 50
            ? "top50"
            : "top100";

export function buildRankings(
  keywords: Keyword[],
  gsc: GscQuery[],
  serp: SerpResult[],
  prompts: AiVisibilityPromptWithKeyword[],
  results: AiVisibilityResultWithPrompt[],
  device: Device,
  days: number,
): RankingsData {
  const fromGsc = gscPositions(gsc, device);
  const fromSerp = serpPositions(serp);
  const ai = aiEnginesByKeyword(prompts, results);

  const rows: KeywordRanking[] = keywords.map((keyword) => {
    const key = normalise(keyword.keyword);
    const google = fromGsc.get(key);
    const organic = fromSerp.get(key);
    const position = google ? Math.round(google.position) : (organic?.position ?? null);
    return {
      id: String(keyword.id),
      keyword: keyword.keyword,
      position,
      // No position history in the API yet.
      change: null,
      spark: [],
      volume: keyword.metrics.search_volume ?? 0,
      difficulty: Math.round(toNumber(keyword.metrics.keyword_difficulty) ?? 0),
      url: google?.page ?? organic?.url ?? null,
      aiEngines: ai.get(keyword.id)?.size ?? 0,
    };
  });

  const ranked = rows.map((r) => r.position).filter((p): p is number => p !== null && p <= 100);
  const count = (key: RankingsData["bands"][number]["key"]) => rows.filter((r) => band(r.position) === key).length;
  return {
    tracked: rows.length,
    avgPosition: ranked.length ? ranked.reduce((a, b) => a + b, 0) / ranked.length : 0,
    avgDelta: 0,
    top3: ranked.filter((p) => p <= 3).length,
    top3Delta: 0,
    top10: ranked.filter((p) => p <= 10).length,
    top10Delta: 0,
    top100: ranked.length,
    top100Delta: 0,
    notRanking: rows.length - ranked.length,
    notRankingDelta: 0,
    avgSeries: averageSeries(gsc, device, days),
    bands: (["top3", "top10", "top20", "top50", "top100", "none"] as const).map((key) => ({ key, count: count(key) })),
    keywords: rows,
  };
}

/** Google rankings for a site's keywords, from Search Console, SERP research and AI results. */
export function useRankings(siteId: number | undefined, device: Device, days: number) {
  const id = siteId ?? 0;
  const keywords = useQuery({
    // Same key and cached shape as `useKeywordsPage` (the whole page); take the rows here.
    queryKey: keywordKeys.list(id),
    enabled: Boolean(siteId),
    queryFn: () => keywordService.list(id),
    select: (page) => page.data,
  });
  const serp = useQuery({
    queryKey: serpKeys.results(id),
    enabled: Boolean(siteId),
    queryFn: async () => (await serpService.results(id)).data.data,
  });
  const prompts = useQuery({
    queryKey: aiVisibilityKeys.prompts(id),
    enabled: Boolean(siteId),
    queryFn: async () => (await aiVisibilityService.prompts(id)).data,
  });
  const results = useQuery({
    queryKey: aiVisibilityKeys.results(id),
    enabled: Boolean(siteId),
    queryFn: async () => (await aiVisibilityService.results(id)).data.data,
  });
  const gsc = useGscOverview(siteId);
  const queries = [keywords, serp, prompts, results, gsc];

  const ready = keywords.data && serp.data && prompts.data && results.data && gsc.data;
  return {
    data: ready
      ? buildRankings(keywords.data!, gsc.data!.queries, serp.data!, prompts.data!, results.data!, device, days)
      : undefined,
    isPending: !siteId || queries.some((q) => q.isPending),
    isError: queries.some((q) => q.isError),
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  };
}
