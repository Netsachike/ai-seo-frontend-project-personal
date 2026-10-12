import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  ApiSuccess,
  ArticleListParams,
  ArticleWithRelations,
  LaravelPaginator,
  UpdateArticlePayload,
} from "@/types/types";

/** AI-generated article drafts. */
const articleService = {
  /** Generates or regenerates from a research brief with `status = completed`. Synchronous LLM call. */
  generate: async (siteId: number, researchId: number) => {
    const response = await api.post<ApiSuccess<{ article: ArticleWithRelations }>>(
      sitePath(siteId, `articles/generate/${researchId}`),
      null,
      { timeout: LONG_REQUEST_TIMEOUT_MS },
    );
    return response.data;
  },

  /** With keyword, crawl_page and research. */
  list: async (siteId: number, params: ArticleListParams = {}) => {
    const response = await api.get<ApiSuccess<LaravelPaginator<ArticleWithRelations>>>(sitePath(siteId, "articles"), {
      params,
    });
    return response.data;
  },

  /** Revisions newest first. */
  get: async (siteId: number, articleId: number) => {
    const response = await api.get<ApiSuccess<{ article: ArticleWithRelations }>>(
      sitePath(siteId, `articles/${articleId}`),
    );
    return response.data;
  },

  /**
   * Saves draft edits after snapshotting a revision. Changing `title`
   * without `slug` regenerates the slug. 422 for published/publishing articles.
   */
  update: async (siteId: number, articleId: number, payload: UpdateArticlePayload) => {
    const response = await api.put<ApiSuccess<{ article: ArticleWithRelations }>>(
      sitePath(siteId, `articles/${articleId}`),
      payload,
    );
    return response.data;
  },
};

export default articleService;
