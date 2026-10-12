import api from "./api/api";
import type {
  ApiSuccess,
  BrokenLinksResult,
  KeywordClusteringResult,
  MetaTagsResult,
  RedirectCheckResult,
  RobotsTxtResult,
  SchemaGeneratorPayload,
  SchemaGeneratorResult,
} from "@/types/types";

/**
 * Public SEO utilities (no token needed). For the URL tools, a 200 can carry
 * `data.success: false` when the target page could not be fetched.
 */
const freeToolsService = {
  robotsTxt: async (payload: { url: string; user_agent?: string }) => {
    const response = await api.post<ApiSuccess<RobotsTxtResult>>("/free-tools/robots-txt", payload);
    return response.data;
  },

  redirectChecker: async (payload: { url: string }) => {
    const response = await api.post<ApiSuccess<RedirectCheckResult>>("/free-tools/redirect-checker", payload);
    return response.data;
  },

  metaTags: async (payload: { url: string }) => {
    const response = await api.post<ApiSuccess<MetaTagsResult>>("/free-tools/meta-tags", payload);
    return response.data;
  },

  /** `limit` 1–100, default 100. */
  brokenLinks: async (payload: { url: string; limit?: number }) => {
    const response = await api.post<ApiSuccess<BrokenLinksResult>>("/free-tools/broken-links", payload);
    return response.data;
  },

  /** 1–500 keywords. */
  keywordClustering: async (payload: { keywords: string[] }) => {
    const response = await api.post<ApiSuccess<KeywordClusteringResult>>("/free-tools/keyword-clustering", payload);
    return response.data;
  },

  schemaGenerator: async (payload: SchemaGeneratorPayload) => {
    const response = await api.post<ApiSuccess<SchemaGeneratorResult>>("/free-tools/schema-generator", payload);
    return response.data;
  },
};

export default freeToolsService;
