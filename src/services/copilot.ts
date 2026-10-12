import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  CopilotAskPayload,
  CopilotAskResponse,
  CopilotConversationDetail,
  CopilotConversationListItem,
  LaravelPaginator,
  PerPageParams,
} from "@/types/types";

/**
 * The conversational SEO assistant ("Ask Rankoya"). Routes have no auth
 * middleware yet; without the token messages are stored with no user, so it
 * is always sent. Responses are not wrapped.
 */
const copilotService = {
  /** Pass the returned `conversation.id` as `conversation_id` to continue the thread. */
  ask: async (siteId: number, payload: CopilotAskPayload) => {
    const response = await api.post<CopilotAskResponse>(sitePath(siteId, "copilot/ask"), payload, {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },

  /** Bare paginator. */
  conversations: async (siteId: number, params: PerPageParams = {}) => {
    const response = await api.get<LaravelPaginator<CopilotConversationListItem>>(
      sitePath(siteId, "copilot/conversations"),
      {
        params,
      },
    );
    return response.data;
  },

  conversation: async (siteId: number, conversationId: number) => {
    const response = await api.get<{ conversation: CopilotConversationDetail }>(
      sitePath(siteId, `copilot/conversations/${conversationId}`),
    );
    return response.data;
  },
};

export default copilotService;
