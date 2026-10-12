import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  AnalyzeKeywordsResult,
  ApiSuccess,
  DiscoverKeywordsPayload,
  DiscoverKeywordsResult,
  Keyword,
  PageParams,
  ResourcePaginated,
} from "@/types/types";

/** Keyword discovery, listing and analysis. */
const keywordService = {
  /** Discovers keywords from the latest crawl, plus optional seeds. */
  discover: async (siteId: number, payload: DiscoverKeywordsPayload = {}) => {
    const response = await api.post<ApiSuccess<DiscoverKeywordsResult>>(
      sitePath(siteId, "keywords/discover"),
      payload,
      {
        timeout: LONG_REQUEST_TIMEOUT_MS,
      },
    );
    return response.data;
  },

  /** 100 per page, by opportunity score. API Resource collection (no `success`). */
  list: async (siteId: number, params: PageParams = {}) => {
    const response = await api.get<ResourcePaginated<Keyword>>(sitePath(siteId, "keywords"), { params });
    return response.data;
  },

  /** Runs quality, scoring and clustering over every keyword. */
  analyze: async (siteId: number) => {
    const response = await api.post<ApiSuccess<AnalyzeKeywordsResult>>(sitePath(siteId, "keywords/analyze"), null, {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },
};

export default keywordService;
