import type { CrawlRun } from "@/types/types";
import crawlerService from "@/services/crawler";
import keywordService from "@/services/keywords";
import topicalMapService from "@/services/topical-maps";
import { CORE_TOPIC_COUNT } from "./steps";
import type { TopicSuggestion } from "./store";

const POLL_MS = 3000;
/** A crawl that has not finished by then is used as it stands. */
const CRAWL_WAIT_MS = 3 * 60_000;

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/** Polls a crawl run until it completes or fails, or the wait runs out. */
async function waitForCrawl(siteId: number, run: CrawlRun, signal?: AbortSignal) {
  const started = Date.now();
  let current = run;
  while (current.status === "pending" || current.status === "running") {
    if (Date.now() - started > CRAWL_WAIT_MS) return current;
    await sleep(POLL_MS, signal);
    current = (await crawlerService.getRun(siteId, current.id)).data;
  }
  return current;
}

/**
 * Core-topic suggestions from the backend: once the site's crawl is done,
 * discover keywords, score and cluster them, build the topical map, and
 * offer its clusters. The biggest clusters are recommended.
 */
export async function discoverTopics(
  siteId: number,
  crawlRunId: number | null,
  signal?: AbortSignal,
): Promise<TopicSuggestion[]> {
  const run = crawlRunId
    ? (await crawlerService.getRun(siteId, crawlRunId)).data
    : (await crawlerService.start(siteId)).data;
  await waitForCrawl(siteId, run, signal);

  await keywordService.discover(siteId);
  await keywordService.analyze(siteId);
  const { data: built } = await topicalMapService.build(siteId);
  if (!built.topical_map) return [];

  const { data: map } = await topicalMapService.get(siteId, built.topical_map.id);
  const topics = map.clusters.map((cluster) => ({
    id: String(cluster.id),
    label: cluster.core_topic || cluster.name,
    recommended: false,
    volume: cluster.keywords.reduce((sum, keyword) => sum + (keyword.search_volume ?? 0), 0),
  }));

  const top = new Set(
    [...topics]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, CORE_TOPIC_COUNT)
      .map((t) => t.id),
  );
  return topics.map((topic) => ({ ...topic, recommended: top.has(topic.id) }));
}
