import api from "./api/api";
import { sitePath } from "./api/helpers";
import type { ApiSuccess, RssFeedSettings, UpdateRssFeedPayload } from "@/types/types";

/**
 * The site's private RSS feed (one per site), served by Laravel at
 * `feed_url` (`{api}/rss/{token}.xml`). The link holds a secret token, so it
 * is treated like a password and never built on the frontend.
 */
const rssService = {
  /** `{ exists: false, is_active: false }` when the site has no feed yet. */
  get: async (siteId: number) => {
    const response = await api.get<ApiSuccess<RssFeedSettings>>(sitePath(siteId, "publishing/rss"));
    return response.data;
  },

  /** Creates the feed with defaults (active, full content, 50 items). Returns the existing one if there is one. */
  create: async (siteId: number) => {
    const response = await api.post<ApiSuccess<Pick<RssFeedSettings, "id" | "name" | "is_active" | "feed_url">>>(
      sitePath(siteId, "publishing/rss"),
    );
    return response.data;
  },

  /** Send only the fields to change. */
  update: async (siteId: number, payload: UpdateRssFeedPayload) => {
    const response = await api.patch<ApiSuccess<UpdateRssFeedPayload & { feed_url: string }>>(
      sitePath(siteId, "publishing/rss/settings"),
      payload,
    );
    return response.data;
  },

  /** Replaces the secret link. The old one stops working straight away. */
  regenerate: async (siteId: number) => {
    const response = await api.post<ApiSuccess<{ feed_url: string }>>(sitePath(siteId, "publishing/rss/regenerate"));
    return response.data;
  },

  /** Flips the feed on or off. While off, the link answers 404; the link itself stays the same. */
  toggle: async (siteId: number) => {
    const response = await api.post<ApiSuccess<{ is_active: boolean }>>(sitePath(siteId, "publishing/rss/toggle"));
    return response.data;
  },
};

export default rssService;
