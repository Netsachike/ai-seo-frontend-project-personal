import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  AnalyzeOpportunitiesResult,
  ApiSuccess,
  LaravelPaginator,
  PageParams,
  SeoOpportunity,
  SeoOpportunityStatus,
} from "@/types/types";

/** Prioritised SEO opportunities. */
const opportunityService = {
  analyze: async (siteId: number) => {
    const response = await api.post<ApiSuccess<AnalyzeOpportunitiesResult>>(
      sitePath(siteId, "opportunities/analyze"),
      null,
      {
        timeout: LONG_REQUEST_TIMEOUT_MS,
      },
    );
    return response.data;
  },

  /** Open opportunities, 50 per page. */
  list: async (siteId: number, params: PageParams = {}) => {
    const response = await api.get<ApiSuccess<LaravelPaginator<SeoOpportunity>>>(sitePath(siteId, "opportunities"), {
      params,
    });
    return response.data;
  },

  get: async (siteId: number, opportunityId: number) => {
    const response = await api.get<ApiSuccess<SeoOpportunity>>(sitePath(siteId, `opportunities/${opportunityId}`));
    return response.data;
  },

  /** `resolved_at` is set when the status becomes `completed` or `ignored`. */
  updateStatus: async (siteId: number, opportunityId: number, status: SeoOpportunityStatus) => {
    const response = await api.patch<ApiSuccess<SeoOpportunity>>(sitePath(siteId, `opportunities/${opportunityId}`), {
      status,
    });
    return response.data;
  },
};

export default opportunityService;
