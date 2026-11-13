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

  /**
   * Permanently deletes a connection of any platform; confirm with the user
   * first. Past publications are kept. 409 when something still references it.
   */
  deleteConnection: async (siteId: number, connectionId: number) => {
    const response = await api.delete<ApiSuccess<{ id: number; platform: string }>>(
      sitePath(siteId, `publishing/connections/${connectionId}`),
    );
    return response.data;
  },

  /**
   * Wix install step 1: send the browser to `authorization_url` (valid 15
   * minutes, works once). Laravel's callback then creates and tests the
   * connection and redirects to `{return_to}?connected=wix&connection_id=…`
   * or `?error=<message>`. `returnTo` is a path with no query string.
   */
  wixAuthorize: async (siteId: number, returnTo: string) => {
    const response = await api.post<{ success: boolean; authorization_url: string }>(
      sitePath(siteId, "publishing/wix/authorize"),
      { return_to: returnTo },
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

  /** Saves the Shopify blog that articles go to on the connection (`config.blog_id`). */
  selectShopifyBlog: async (siteId: number, connectionId: number, payload: { blog_id: string; blog_name: string }) => {
    const response = await api.patch<ApiSuccess<PublishingConnection>>(
      sitePath(siteId, `publishing/connections/${connectionId}/shopify-blog`),
      payload,
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
