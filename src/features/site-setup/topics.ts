import type { CrawlPage, TopicalMapDetail } from "@/types/types";
import keywordService from "@/services/keywords";
import topicalMapService from "@/services/topical-maps";
import { abortable, crawledPages } from "./crawl";
import { CORE_TOPIC_COUNT } from "./steps";
import type { TopicSuggestion } from "./store";

/** Thrown when every source came back empty, so the step shows Retry instead of an empty list. */
export class NoTopicsError extends Error {}

/** Page titles that never make a topic. */
const GENERIC = /^(home|homepage|about( us)?|contact( us)?|blog|news|privacy( policy)?|terms.*|cookie.*|login|log in|sign (in|up)|cart|checkout|404.*|page not found)$/i;
const MAX_SEEDS = 25;

/** "SEO audits | Acme" → "seo audits": the brand suffix goes, and anything too long or generic is dropped. */
function seedFrom(text: string | null) {
  if (!text) return null;
  const seed = text
    .split(/\s[|–—-]\s|\s·\s/)[0]
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const words = seed.split(" ").length;
  if (seed.length < 2 || seed.length > 200 || words > 8 || GENERIC.test(seed)) return null;
  return seed;
}

/** Seed keywords from what the pages say they are about: titles, H1s and headings. */
export function seedKeywords(pages: CrawlPage[]) {
  const seeds = new Set<string>();
  for (const page of pages) {
    const headings = (page.headings ?? [])
      .map((h) => (typeof h.text === "string" ? h.text : null))
      .filter((h): h is string => h !== null)
      .slice(0, 3);
    for (const text of [page.title, page.h1, ...headings]) {
      const seed = seedFrom(text);
      if (seed) seeds.add(seed);
      if (seeds.size >= MAX_SEEDS) return [...seeds];
    }
  }
  return [...seeds];
}

/** The biggest clusters (by search volume) are recommended. */
function recommend(topics: Omit<TopicSuggestion, "recommended">[]): TopicSuggestion[] {
  const top = new Set(
    [...topics]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, CORE_TOPIC_COUNT)
      .map((t) => t.id),
  );
  return topics.map((topic) => ({ ...topic, recommended: top.has(topic.id) }));
}

function clusterTopics(map: TopicalMapDetail) {
  return map.clusters.map((cluster) => ({
    id: String(cluster.id),
    label: cluster.core_topic || cluster.name,
    volume: cluster.keywords.reduce((sum, keyword) => sum + (keyword.search_volume ?? 0), 0),
  }));
}

/** The newest topical map that has clusters, if the site already has one. */
async function existingMapTopics(siteId: number) {
  const { data: maps } = await topicalMapService.list(siteId);
  const latest = [...maps].sort((a, b) => b.id - a.id).find((map) => map.clusters.length > 0);
  if (!latest) return [];
  const { data: map } = await topicalMapService.get(siteId, latest.id);
  return clusterTopics(map);
}

/** Without a map: the site's keywords grouped by cluster name, or the top keywords themselves. */
async function keywordTopics(siteId: number) {
  const { data: keywords } = await keywordService.list(siteId);
  const groups = new Map<string, number>();
  for (const keyword of keywords) {
    if (keyword.quality.status === "rejected") continue;
    const label = keyword.cluster || keyword.keyword;
    groups.set(label, (groups.get(label) ?? 0) + (keyword.metrics.search_volume ?? 0));
  }
  return [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([label, volume]) => ({ id: `kw:${label}`, label, volume }));
}

/**
 * Core-topic suggestions from the backend. An existing topical map is used as
 * it stands. Otherwise, once the crawl is done: discover keywords (seeded from
 * the crawled pages' titles and headings), score and cluster them, build the
 * topical map and offer its clusters. When the map comes back empty (a small
 * site), the site's own keywords are offered instead.
 */
export async function discoverTopics(siteId: number, signal?: AbortSignal): Promise<TopicSuggestion[]> {
  const existing = await abortable(existingMapTopics(siteId), signal);
  if (existing.length > 0) return recommend(existing);

  const pages = await abortable(crawledPages(siteId), signal);
  const seeds = seedKeywords(pages);
  await abortable(keywordService.discover(siteId, seeds.length ? { seed_keywords: seeds } : {}), signal);
  await abortable(keywordService.analyze(siteId), signal);
  const { data: built } = await abortable(topicalMapService.build(siteId), signal);

  if (built.topical_map) {
    const { data: map } = await abortable(topicalMapService.get(siteId, built.topical_map.id), signal);
    const topics = clusterTopics(map);
    if (topics.length > 0) return recommend(topics);
  }

  const fromKeywords = await abortable(keywordTopics(siteId), signal);
  if (fromKeywords.length > 0) return recommend(fromKeywords);
  throw new NoTopicsError("No keywords or clusters were found for this site.");
}
