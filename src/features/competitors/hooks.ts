"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AiVisibilityPromptWithKeyword,
  AiVisibilityResultWithPrompt,
  BacklinkOpportunity,
  Competitor,
  ContentGap,
  Keyword,
  SerpResult,
  Site,
} from "@/types/types";
import type { CompetitorRow, CompetitorsData, LinkSite, QuestionGap } from "@/lib/mocks/ui-data";
import { aiVisibilityKeys, authorityKeys, keywordKeys, serpKeys, siteKeys } from "@/lib/api/query-keys";
import { toNumber } from "@/services/api/helpers";
import aiVisibilityService from "@/services/ai-visibility";
import authorityService from "@/services/authority";
import keywordService from "@/services/keywords";
import serpService from "@/services/serp";
import { engineOf } from "@/features/visibility/model";

const bare = (domain: string) => domain.replace(/^www\./, "").toLowerCase();

function hostOf(url: string | null) {
  if (!url) return null;
  try {
    return bare(new URL(url).hostname);
  } catch {
    return null;
  }
}

/** Competitors and citations arrive as strings or objects, depending on the provider. */
function nameOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["name", "domain", "url"]) if (typeof record[key] === "string") return record[key] as string;
  }
  return null;
}

function rowsFor(
  site: Site,
  competitors: Competitor[],
  serp: SerpResult[],
  results: AiVisibilityResultWithPrompt[],
): CompetitorRow[] {
  const positions = new Map<string, number[]>();
  for (const result of serp) {
    const domain = bare(result.domain);
    positions.set(domain, [...(positions.get(domain) ?? []), result.position]);
  }
  const citations = new Map<string, number>();
  for (const result of results) {
    for (const citation of result.citations ?? []) {
      const domain = hostOf(nameOf(citation)) ?? bare(nameOf(citation) ?? "");
      if (domain) citations.set(domain, (citations.get(domain) ?? 0) + 1);
    }
  }
  const avg = (domain: string) => {
    const list = positions.get(domain) ?? [];
    return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
  };

  const own = bare(site.domain);
  const ownSerp = serp.filter((r) => r.is_target_site);
  const ownScore = results.length ? (results.filter((r) => r.business_mentioned).length / results.length) * 100 : 0;
  const rows: CompetitorRow[] = [
    {
      id: "you",
      name: site.name,
      domain: own,
      isYou: true,
      score: ownScore,
      share: 0,
      avgPosition: ownSerp.length ? ownSerp.reduce((a, r) => a + r.position, 0) / ownSerp.length : 0,
      citations: citations.get(own) ?? 0,
      top10: ownSerp.filter((r) => r.position <= 10).length,
    },
    ...competitors.map((c) => ({
      id: String(c.id),
      name: c.name ?? c.domain,
      domain: bare(c.domain),
      isYou: false,
      score: toNumber(c.visibility_score) ?? 0,
      share: 0,
      avgPosition: avg(bare(c.domain)),
      citations: citations.get(bare(c.domain)) ?? 0,
      top10: c.top_10_count,
    })),
  ];
  const total = rows.reduce((sum, r) => sum + r.score, 0);
  return rows.map((r) => ({ ...r, share: total ? r.score / total : 0 }));
}

/** Prompts where competitors were named and the site was not, with how many engines named each. */
function questionGaps(
  prompts: AiVisibilityPromptWithKeyword[],
  results: AiVisibilityResultWithPrompt[],
): QuestionGap[] {
  return prompts
    .map((prompt) => {
      const rows = results.filter((r) => r.ai_visibility_prompt_id === prompt.id);
      if (rows.length === 0 || rows.some((r) => r.business_mentioned)) return null;
      const engines = new Map<string, Set<string>>();
      for (const row of rows) {
        const engine = engineOf(row.model) ?? row.model ?? row.provider;
        for (const competitor of row.competitors_mentioned ?? []) {
          const name = nameOf(competitor);
          if (name) engines.set(name, (engines.get(name) ?? new Set()).add(engine));
        }
      }
      if (engines.size === 0) return null;
      return {
        id: String(prompt.id),
        question: prompt.prompt,
        winners: [...engines.entries()]
          .map(([name, set]) => ({ name, engines: set.size }))
          .sort((a, b) => b.engines - a.engines)
          .slice(0, 3),
      };
    })
    .filter((gap): gap is QuestionGap => gap !== null)
    .slice(0, 8);
}

/** A competitor's page in Google for one keyword. */
export type RankedPage = { domain: string; position: number; url: string | null; title: string | null };

/**
 * A keyword competitors rank for and the site doesn't (or only past page one),
 * from `GET /content-gaps`: `no_target_page` or `weak_position`.
 */
export type ContentGapRow = {
  id: string;
  keyword: string;
  keywordId: number | null;
  kind: "noPage" | "weak" | "other";
  /** The site's own position when it ranks at all. */
  yourPosition: number | null;
  competitors: RankedPage[];
  competitorCount: number;
  volume: number | null;
  score: number;
};

/** One researched keyword: where the site ranks and who's above it. */
export type KeywordResult = {
  keyword: string;
  yourPosition: number | null;
  yourUrl: string | null;
  top: RankedPage[];
  /** Results Google returned for it (how deep "not found" looked). */
  checked: number;
};

export type CompetitorsPageData = Omit<CompetitorsData, "keywordGaps"> & {
  contentGaps: ContentGapRow[];
  results: KeywordResult[];
};

function rankedPage(value: unknown): RankedPage | null {
  if (!value || typeof value !== "object") {
    const name = nameOf(value);
    return name ? { domain: bare(name), position: 0, url: null, title: null } : null;
  }
  const record = value as Record<string, unknown>;
  const domain = nameOf(record);
  if (!domain) return null;
  return {
    domain: hostOf(domain) ?? bare(domain),
    position: toNumber(record.position as number | string | null) ?? 0,
    url: typeof record.url === "string" ? record.url : null,
    title: typeof record.title === "string" ? record.title : null,
  };
}

function contentGaps(gaps: ContentGap[], keywords: Keyword[], serp: SerpResult[]): ContentGapRow[] {
  const volume = new Map(keywords.map((k) => [k.id, k.metrics.search_volume]));
  return gaps.map((gap) => {
    const forKeyword = serp.filter((r) => r.keyword.toLowerCase() === gap.keyword.toLowerCase());
    const own = forKeyword.filter((r) => r.is_target_site).sort((a, b) => a.position - b.position)[0];
    const stored = (gap.competitors ?? []).map(rankedPage).filter((p): p is RankedPage => p !== null);
    const competitors = stored.length
      ? stored
      : forKeyword
          .filter((r) => !r.is_target_site)
          .sort((a, b) => a.position - b.position)
          .map((r) => ({ domain: bare(r.domain), position: r.position, url: r.url, title: r.title }));
    return {
      id: String(gap.id),
      keyword: gap.keyword,
      keywordId: gap.keyword_id,
      kind: gap.gap_type === "no_target_page" ? "noPage" : gap.gap_type === "weak_position" ? "weak" : "other",
      yourPosition: own?.position ?? null,
      competitors: competitors.sort((a, b) => a.position - b.position),
      competitorCount: gap.competitor_count || competitors.length,
      volume: (gap.keyword_id && volume.get(gap.keyword_id)) ?? null,
      score: Math.round(toNumber(gap.opportunity_score) ?? 0),
    };
  });
}

/** SERP results grouped by keyword, newest research first. */
function keywordResults(serp: SerpResult[]): KeywordResult[] {
  const byKeyword = new Map<string, SerpResult[]>();
  for (const result of [...serp].sort((a, b) => b.serp_research_run_id - a.serp_research_run_id)) {
    const key = result.keyword.toLowerCase();
    const list = byKeyword.get(key);
    // Only the latest run for each keyword.
    if (list && list[0].serp_research_run_id !== result.serp_research_run_id) continue;
    byKeyword.set(key, [...(list ?? []), result]);
  }
  return [...byKeyword.values()].map((rows) => {
    const sorted = [...rows].sort((a, b) => a.position - b.position);
    const own = sorted.find((r) => r.is_target_site);
    return {
      keyword: sorted[0].keyword,
      yourPosition: own?.position ?? null,
      yourUrl: own?.url ?? null,
      top: sorted
        .filter((r) => !r.is_target_site)
        .slice(0, 3)
        .map((r) => ({ domain: bare(r.domain), position: r.position, url: r.url, title: r.title })),
      checked: sorted.length,
    };
  });
}

const LINK_KINDS: Record<string, LinkSite["kind"]> = {
  roundup: "roundup",
  listicle: "roundup",
  review: "review",
  directory: "submission",
  citation: "submission",
  community: "community",
  forum: "community",
};

function linkSites(opportunities: BacklinkOpportunity[]): LinkSite[] {
  if (!Array.isArray(opportunities)) return [];
  return opportunities
    .filter((o) => o.status !== "rejected" && o.status !== "acquired")
    .slice(0, 8)
    .map((o) => ({
      id: String(o.id),
      domain: hostOf(o.source_url) ?? hostOf(o.target_url) ?? o.title,
      why: o.description ?? o.recommended_action ?? o.title,
      authority: Math.round(toNumber(o.opportunity_score) ?? 0),
      kind: LINK_KINDS[o.type] ?? "submission",
    }));
}

export function useCompetitors(site: Site | undefined) {
  const id = site?.id ?? 0;
  const enabled = Boolean(site);
  const competitors = useQuery({
    queryKey: serpKeys.competitors(id),
    enabled,
    queryFn: async () => (await serpService.competitors(id)).data,
  });
  const gaps = useQuery({
    queryKey: serpKeys.contentGaps(id),
    enabled,
    queryFn: async () => (await serpService.contentGaps(id)).data,
  });
  const serp = useQuery({
    queryKey: serpKeys.results(id),
    enabled,
    queryFn: async () => (await serpService.results(id)).data.data,
  });
  const keywords = useQuery({
    // Same key and cached shape as `useKeywordsPage` (the whole page); take the rows here.
    queryKey: keywordKeys.list(id),
    enabled,
    queryFn: () => keywordService.list(id),
    select: (page) => page.data,
  });
  const prompts = useQuery({
    queryKey: aiVisibilityKeys.prompts(id),
    enabled,
    queryFn: async () => (await aiVisibilityService.prompts(id)).data,
  });
  const results = useQuery({
    queryKey: aiVisibilityKeys.results(id),
    enabled,
    queryFn: async () => (await aiVisibilityService.results(id)).data.data,
  });
  const authority = useQuery({
    // Its own key: the Authority page caches whole paginator pages under `opportunities(id, page)`,
    // and sharing page 1 handed this hook a paginator instead of a list.
    queryKey: [...authorityKeys.opportunities(id), "competitors-top"],
    enabled,
    queryFn: async () => (await authorityService.opportunities(id, { per_page: 20 })).data,
  });
  const queries = [competitors, gaps, serp, keywords, prompts, results, authority];

  let data: CompetitorsPageData | undefined;
  if (site && queries.every((q) => q.data)) {
    const rows = rowsFor(site, competitors.data!, serp.data!, results.data!);
    const others = rows.filter((r) => !r.isYou).sort((a, b) => b.score - a.score);
    const you = rows.find((r) => r.isYou)!;
    data = {
      leader: others[0]?.name ?? site.name,
      lead: Math.max(0, Math.round((others[0]?.score ?? 0) - you.score)),
      // Only the site itself means no competitors were found yet.
      rows: rows.length > 1 ? rows : [],
      questionGaps: questionGaps(prompts.data!, results.data!),
      contentGaps: contentGaps(gaps.data!, keywords.data!, serp.data!),
      results: keywordResults(serp.data!),
      sites: linkSites(authority.data!),
    };
  }

  return {
    data,
    isPending: !site || queries.some((q) => q.isPending),
    isError: queries.some((q) => q.isError),
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  };
}

/** Most keywords one research run takes. The backend allows 10; 5 keeps a run quick. */
export const MAX_RESEARCH_KEYWORDS = 5;

/** SERP research for the keywords the user picked: finds who ranks for them, and the content gaps. */
export function useResearchCompetitors(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (keywordIds: number[]) =>
      (await serpService.research(siteId, { keyword_ids: keywordIds.slice(0, MAX_RESEARCH_KEYWORDS) })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) }),
  });
}
