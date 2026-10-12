import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  AuthorityAnalyzeResponse,
  AuthorityProfile,
  BacklinkOpportunity,
  BacklinkOpportunityWithRelations,
  LaravelPaginator,
  PerPageParams,
  UpdateBacklinkPayload,
} from "@/types/types";

/**
 * Authority profile and backlink opportunities. These routes currently have
 * no auth middleware; the token is sent anyway because they will be locked
 * down. Responses are not wrapped in `success` / `data`.
 */
const authorityService = {
  analyze: async (siteId: number) => {
    const response = await api.post<AuthorityAnalyzeResponse>(sitePath(siteId, "authority/analyze"), null, {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },

  /** `profile` is null until `analyze` has run. */
  profile: async (siteId: number) => {
    const response = await api.get<{ profile: AuthorityProfile | null }>(sitePath(siteId, "authority/profile"));
    return response.data;
  },

  /** Bare Laravel paginator. */
  opportunities: async (siteId: number, params: PerPageParams = {}) => {
    const response = await api.get<LaravelPaginator<BacklinkOpportunity>>(sitePath(siteId, "authority/opportunities"), {
      params,
    });
    return response.data;
  },

  opportunity: async (siteId: number, opportunityId: number) => {
    const response = await api.get<{ opportunity: BacklinkOpportunityWithRelations }>(
      sitePath(siteId, `authority/opportunities/${opportunityId}`),
    );
    return response.data;
  },

  /** Setting `status: acquired` also sets `completed_at`. */
  updateOpportunity: async (siteId: number, opportunityId: number, payload: UpdateBacklinkPayload) => {
    const response = await api.patch<{ opportunity: BacklinkOpportunity }>(
      sitePath(siteId, `authority/opportunities/${opportunityId}`),
      payload,
    );
    return response.data;
  },
};

export default authorityService;
