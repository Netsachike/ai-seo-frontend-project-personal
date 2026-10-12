import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  ApiSuccess,
  LaravelPaginator,
  MoneyPageParams,
  MoneyPageRecommendations,
  MoneyPagesAnalyzeResult,
  MoneyPageWithRelations,
} from "@/types/types";

/** Commercially important pages and their recommendations. */
const moneyPageService = {
  analyze: async (siteId: number) => {
    const response = await api.post<ApiSuccess<MoneyPagesAnalyzeResult>>(
      sitePath(siteId, "money-pages/analyze"),
      null,
      {
        timeout: LONG_REQUEST_TIMEOUT_MS,
      },
    );
    return response.data;
  },

  /** By commercial score. `per_page` defaults to 50, max 100. */
  list: async (siteId: number, params: MoneyPageParams = {}) => {
    const response = await api.get<ApiSuccess<LaravelPaginator<MoneyPageWithRelations>>>(
      sitePath(siteId, "money-pages"),
      {
        params,
      },
    );
    return response.data;
  },

  get: async (siteId: number, moneyPageId: number) => {
    const response = await api.get<ApiSuccess<MoneyPageWithRelations>>(sitePath(siteId, `money-pages/${moneyPageId}`));
    return response.data;
  },

  /** No `success` / `data` envelope. */
  recommendations: async (siteId: number, moneyPageId: number) => {
    const response = await api.get<MoneyPageRecommendations>(
      sitePath(siteId, `money-pages/${moneyPageId}/recommendations`),
    );
    return response.data;
  },
};

export default moneyPageService;
