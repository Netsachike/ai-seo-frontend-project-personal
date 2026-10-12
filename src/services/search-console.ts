import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  ApiSuccess,
  GscOverview,
  GscProperty,
  GscSelectPropertyResult,
  GscSyncPayload,
  GscSyncResult,
} from "@/types/types";

/**
 * Google Search Console. Flow: `connect` → redirect the browser to
 * `authorization_url` → Google calls the backend callback, which redirects
 * to `{FRONTEND_URL}/settings/search-console?connected=1` → `properties` →
 * `selectProperty` → `sync`.
 */
const searchConsoleService = {
  connect: async (siteId: number) => {
    const response = await api.get<ApiSuccess<{ authorization_url: string }>>(
      sitePath(siteId, "search-console/connect"),
    );
    return response.data;
  },

  /** 404 when Search Console is not connected for this site. */
  properties: async (siteId: number) => {
    const response = await api.get<ApiSuccess<GscProperty[]>>(sitePath(siteId, "search-console/properties"));
    return response.data;
  },

  selectProperty: async (siteId: number, property: string) => {
    const response = await api.post<ApiSuccess<GscSelectPropertyResult>>(sitePath(siteId, "search-console/property"), {
      property,
    });
    return response.data;
  },

  /** Pulls query and page data. 500 when not connected or no property is selected. */
  sync: async (siteId: number, payload: GscSyncPayload = {}) => {
    const response = await api.post<ApiSuccess<GscSyncResult>>(sitePath(siteId, "search-console/sync"), payload, {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },

  /** Connection status, totals and the latest 100 query rows. */
  overview: async (siteId: number) => {
    const response = await api.get<ApiSuccess<GscOverview>>(sitePath(siteId, "search-console/overview"));
    return response.data;
  },
};

export default searchConsoleService;
