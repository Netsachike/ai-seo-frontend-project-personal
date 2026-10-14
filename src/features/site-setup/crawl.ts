import type { CrawlPage, CrawlRun } from "@/types/types";
import crawlerService from "@/services/crawler";
import { patchDraft, useSetupStore } from "./store";

const POLL_MS = 3000;
/** A crawl that has not finished by then is used as it stands. */
const CRAWL_WAIT_MS = 3 * 60_000;
/** How long to wait for the domain step's crawl run id before starting a crawl here. */
const RUN_ID_WAIT_MS = 10_000;

const abortError = () => new DOMException("Aborted", "AbortError");

export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

/** Rejects as soon as `signal` aborts, without cancelling the shared work behind `promise`. */
export function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/** Polls a crawl run until it completes or fails, or the wait runs out. */
export async function waitForCrawl(siteId: number, run: CrawlRun, signal?: AbortSignal) {
  const started = Date.now();
  let current = run;
  while (current.status === "pending" || current.status === "running") {
    if (Date.now() - started > CRAWL_WAIT_MS) return current;
    await sleep(POLL_MS, signal);
    current = (await crawlerService.getRun(siteId, current.id)).data;
  }
  return current;
}

/** The crawl the domain step started (its id lands in the draft shortly after), or a new one. */
export async function firstCrawlRun(siteId: number) {
  const started = Date.now();
  while (Date.now() - started < RUN_ID_WAIT_MS) {
    const runId = useSetupStore.getState().drafts[siteId]?.crawlRunId;
    if (runId) return (await crawlerService.getRun(siteId, runId)).data;
    await sleep(500);
  }
  const { data: run } = await crawlerService.start(siteId);
  patchDraft(siteId, { crawlRunId: run.id });
  return run;
}

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

export const isHomePage = (page: Pick<CrawlPage, "url">) => pathOf(page.url).replace(/\/+$/, "") === "";

/** Pages that loaded and have something to read, homepage first. */
function readablePages(pages: CrawlPage[]) {
  const ok = pages.filter(
    (p) =>
      !p.error_message &&
      (p.status_code === null || (p.status_code >= 200 && p.status_code < 300)) &&
      Boolean(p.title || p.meta_description || p.h1 || p.content_summary || p.content_text),
  );
  return [...ok.filter(isHomePage), ...ok.filter((p) => !isHomePage(p))];
}

/**
 * The first page of the site's first crawl, shared by the profile sections,
 * topic discovery and retries, so the crawl is waited on once. A failed or
 * empty read is dropped so Retry reads again.
 */
const pagesBySite = new Map<number, Promise<CrawlPage[]>>();

export function crawledPages(siteId: number) {
  let pending = pagesBySite.get(siteId);
  if (!pending) {
    pending = (async () => {
      const run = await waitForCrawl(siteId, await firstCrawlRun(siteId));
      const { data } = await crawlerService.listPages(siteId, run.id);
      return readablePages(data);
    })();
    pagesBySite.set(siteId, pending);
    pending.then(
      (pages) => {
        if (pages.length === 0) pagesBySite.delete(siteId);
      },
      () => pagesBySite.delete(siteId),
    );
  }
  return pending;
}
