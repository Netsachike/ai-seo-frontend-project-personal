import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type { ApiSuccess, BuildTopicalMapResult, TopicalMapDetail, TopicalMapSummary } from "@/types/types";

/** Topic clusters built from a site's keywords. */
const topicalMapService = {
  /** Builds or rebuilds the map. `topical_map` is null when the site has no usable keywords. */
  build: async (siteId: number) => {
    const response = await api.post<ApiSuccess<BuildTopicalMapResult>>(sitePath(siteId, "topical-map/build"), null, {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },

  /** Not paginated. Each cluster has `keywords_count` and `target_page`. */
  list: async (siteId: number) => {
    const response = await api.get<ApiSuccess<TopicalMapSummary[]>>(sitePath(siteId, "topical-maps"));
    return response.data;
  },

  /** With clusters, target pages and keywords. */
  get: async (siteId: number, topicalMapId: number) => {
    const response = await api.get<ApiSuccess<TopicalMapDetail>>(sitePath(siteId, `topical-maps/${topicalMapId}`));
    return response.data;
  },
};

export default topicalMapService;
