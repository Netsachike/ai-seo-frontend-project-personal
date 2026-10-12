import api from "./api/api";
import { sitePath } from "./api/helpers";
import type { CreateSitePayload, Platform, ResourceEnvelope, Site } from "@/types/types";

/** Websites in the active workspace. Responses are API Resources (`{ data }`, no `success`). */
const siteService = {
  /** Not paginated. */
  list: async () => {
    const response = await api.get<ResourceEnvelope<Site[]>>("/sites");
    return response.data;
  },

  /** `201`. A URL the backend cannot parse fails with 422 on `errors.url`. */
  create: async (payload: CreateSitePayload) => {
    const response = await api.post<ResourceEnvelope<Site>>("/sites", payload);
    return response.data;
  },

  /** Includes `settings`. */
  get: async (siteId: number) => {
    const response = await api.get<ResourceEnvelope<Site>>(sitePath(siteId));
    return response.data;
  },

  /** Confirms or overrides the detected CMS platform. */
  confirmPlatform: async (siteId: number, platform: Platform) => {
    const response = await api.patch<ResourceEnvelope<Site>>(sitePath(siteId, "platform"), { platform });
    return response.data;
  },
};

export default siteService;
