import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type { ApiSuccess, ArticleResearchWithRelations, LaravelPaginator, ResearchListParams } from "@/types/types";

/** Research briefs per keyword. */
const articleResearchService = {
  /** Synchronous: calls SERP and LLM providers. */
  researchKeyword: async (siteId: number, keywordId: number) => {
    const response = await api.post<ApiSuccess<{ research: ArticleResearchWithRelations }>>(
      sitePath(siteId, `articles/research/keywords/${keywordId}`),
      null,
      { timeout: LONG_REQUEST_TIMEOUT_MS },
    );
    return response.data;
  },

  /** The paginator is nested at `data.research`. */
  list: async (siteId: number, params: ResearchListParams = {}) => {
    const response = await api.get<ApiSuccess<{ research: LaravelPaginator<ArticleResearchWithRelations> }>>(
      sitePath(siteId, "articles/research"),
      { params },
    );
    return response.data;
  },

  get: async (siteId: number, researchId: number) => {
    const response = await api.get<ApiSuccess<{ research: ArticleResearchWithRelations }>>(
      sitePath(siteId, `articles/research/${researchId}`),
    );
    return response.data;
  },
};

export default articleResearchService;
