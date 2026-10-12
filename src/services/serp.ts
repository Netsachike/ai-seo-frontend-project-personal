import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  ApiSuccess,
  Competitor,
  ContentGap,
  LaravelPaginator,
  PageParams,
  SerpResearchPayload,
  SerpResearchResult,
  SerpResearchRun,
  SerpResult,
} from "@/types/types";

/** SERP results, competitors and content gaps. */
const serpService = {
  research: async (siteId: number, payload: SerpResearchPayload = {}) => {
    const response = await api.post<ApiSuccess<SerpResearchResult>>(sitePath(siteId, "serp/research"), payload, {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },

  /** Newest first, not paginated. */
  runs: async (siteId: number) => {
    const response = await api.get<ApiSuccess<SerpResearchRun[]>>(sitePath(siteId, "serp/runs"));
    return response.data;
  },

  /** 100 per page. `keyword` is an exact-match filter. */
  results: async (siteId: number, params: PageParams & { keyword?: string } = {}) => {
    const response = await api.get<ApiSuccess<LaravelPaginator<SerpResult>>>(sitePath(siteId, "serp/results"), {
      params,
    });
    return response.data;
  },

  /** By visibility score, not paginated. */
  competitors: async (siteId: number) => {
    const response = await api.get<ApiSuccess<Competitor[]>>(sitePath(siteId, "competitors"));
    return response.data;
  },

  /** Open gaps by opportunity score, not paginated. */
  contentGaps: async (siteId: number) => {
    const response = await api.get<ApiSuccess<ContentGap[]>>(sitePath(siteId, "content-gaps"));
    return response.data;
  },
};

export default serpService;
