import api from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  ApiSuccess,
  CreatePublishingConnectionPayload,
  LaravelPaginator,
  PageParams,
  Publication,
  PublicationWithRelations,
  PublishArticlePayload,
  PublishingConnection,
  PublishingTestResult,
  ShopifyBlog,
  WordpressComAuthorizeResponse,
  WordpressComCallbackResponse,
  WordpressComCompletePayload,
  Article,
} from "@/types/types";

/** CMS connections and publishing. Credentials are write-only and never returned. */
const publishingService = {
  connections: async (siteId: number) => {
    const response = await api.get<ApiSuccess<PublishingConnection[]>>(sitePath(siteId, "publishing/connections"));
    return response.data;
  },

  /**
   * `manual` connections are created `active`; API connections are created
   * `pending` and need `test` to activate. WordPress.com must use OAuth.
   */
  createConnection: async (siteId: number, payload: CreatePublishingConnectionPayload) => {
    const response = await api.post<ApiSuccess<PublishingConnection>>(
      sitePath(siteId, "publishing/connections"),
      payload,
    );
    return response.data;
  },

  /** Sets status to `active` or `error`. A 200 can carry `data.success: false`; always check it. */
  testConnection: async (siteId: number, connectionId: number) => {
    const response = await api.post<ApiSuccess<PublishingTestResult>>(
      sitePath(siteId, `publishing/connections/${connectionId}/test`),
    );
    return response.data;
  },

  /** Publishes, or prepares the article for manual publishing on a `manual` connection. */
  publishArticle: async (siteId: number, articleId: number, payload: PublishArticlePayload) => {
    const response = await api.post<ApiSuccess<Publication & { article: Article; connection: PublishingConnection }>>(
      sitePath(siteId, `publishing/articles/${articleId}/publish`),
      payload,
    );
    return response.data;
  },

  /**
   * The blogs in a Shopify store (up to 100), for picking where articles go.
   * Shopify API connections only; a bad token comes back as 422 with Shopify's message.
   */
  shopifyBlogs: async (siteId: number, connectionId: number) => {
    const response = await api.get<ApiSuccess<ShopifyBlog[]>>(
      sitePath(siteId, `publishing/connections/${connectionId}/shopify-blogs`),
    );
    return response.data;
  },

  /** 25 per page. */
  publications: async (siteId: number, params: PageParams = {}) => {
    const response = await api.get<ApiSuccess<LaravelPaginator<PublicationWithRelations>>>(
      sitePath(siteId, "publishing/publications"),
      { params },
    );
    return response.data;
  },

  /** WordPress.com OAuth step 1: redirect the browser to `authorization_url` (valid 10 minutes). */
  wordpressComAuthorize: async (siteId: number) => {
    const response = await api.get<WordpressComAuthorizeResponse>(
      sitePath(siteId, "publishing/wordpress-com/authorize"),
    );
    return response.data;
  },

  /** WordPress.com OAuth step 2: forward the `code` and `state` the redirect page received. Public route. */
  wordpressComCallback: async (params: { code: string; state: string }) => {
    const response = await api.get<WordpressComCallbackResponse>("/publishing/wordpress-com/callback", { params });
    return response.data;
  },

  /** WordPress.com OAuth step 3: the chosen site becomes a `pending` connection; call `testConnection` next. */
  wordpressComComplete: async (siteId: number, payload: WordpressComCompletePayload) => {
    const response = await api.post<ApiSuccess<PublishingConnection>>(
      sitePath(siteId, "publishing/wordpress-com/complete"),
      payload,
    );
    return response.data;
  },
};

export default publishingService;
