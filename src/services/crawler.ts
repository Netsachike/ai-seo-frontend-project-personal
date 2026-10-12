import api from "./api/api";
import { sitePath } from "./api/helpers";
import type { CrawlPagesResponse, CrawlRun, PageParams, ResourceEnvelope, StartCrawlPayload } from "@/types/types";

/** Crawl a site and read the crawled pages. */
const crawlerService = {
  /** Queues a crawl (`202`, no `success` key). Poll `getRun` until `completed` or `failed`. */
  start: async (siteId: number, payload: StartCrawlPayload = {}) => {
    const response = await api.post<ResourceEnvelope<CrawlRun> & { message: string }>(
      sitePath(siteId, "crawl"),
      payload,
    );
    return response.data;
  },

  getRun: async (siteId: number, crawlRunId: number) => {
    const response = await api.get<ResourceEnvelope<CrawlRun>>(sitePath(siteId, `crawl-runs/${crawlRunId}`));
    return response.data;
  },

  /** 50 per page. */
  listPages: async (siteId: number, crawlRunId: number, params: PageParams = {}) => {
    const response = await api.get<CrawlPagesResponse>(sitePath(siteId, `crawl-runs/${crawlRunId}/pages`), {
      params,
    });
    return response.data;
  },
};

export default crawlerService;
