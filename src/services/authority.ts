import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  AuthorityAnalyzeResponse,
  AuthorityProfile,
  BacklinkOpportunity,
  BacklinkList,
  BacklinkListParams,
  BacklinkOpportunityWithRelations,
  BacklinkProspectsPayload,
  BacklinkProspectsResponse,
  BacklinkSummaryResponse,
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

  /** Live backlink metrics (DataForSEO), also saved to the profile. Each call costs money. */
  backlinkSummary: async (siteId: number) => {
    const response = await api.get<BacklinkSummaryResponse>(sitePath(siteId, "authority/backlinks/summary"), {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },

  /** Live backlinks, one per referring domain. Paged by `limit` + `offset`. Each call costs money. */
  backlinks: async (siteId: number, params: BacklinkListParams = {}) => {
    const response = await api.get<{ backlinks: BacklinkList }>(sitePath(siteId, "authority/backlinks"), {
      params,
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data.backlinks;
  },

  /** Saves a competitor's backlinks as outreach prospects (`status = prospect`). */
  backlinkProspects: async (siteId: number, payload: BacklinkProspectsPayload) => {
    const response = await api.post<BacklinkProspectsResponse>(
      sitePath(siteId, "authority/backlink-prospects"),
      payload,
      {
        timeout: LONG_REQUEST_TIMEOUT_MS,
      },
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
