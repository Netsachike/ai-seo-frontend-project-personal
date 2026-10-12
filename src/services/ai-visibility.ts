import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  AiTestPayload,
  AiTestResult,
  AiVisibilityOverview,
  AiVisibilityPromptWithKeyword,
  AiVisibilityResultWithPrompt,
  ApiSuccess,
  GeneratePromptsPayload,
  GeneratePromptsResult,
  LaravelPaginator,
  PageParams,
} from "@/types/types";

/** How the brand appears in AI assistant answers. */
const aiVisibilityService = {
  /** Generates test prompts from keywords. */
  generatePrompts: async (siteId: number, payload: GeneratePromptsPayload = {}) => {
    const response = await api.post<ApiSuccess<GeneratePromptsResult>>(
      sitePath(siteId, "ai-visibility/prompts/generate"),
      payload,
      { timeout: LONG_REQUEST_TIMEOUT_MS },
    );
    return response.data;
  },

  /** Active prompts with their keyword. Not paginated. */
  prompts: async (siteId: number) => {
    const response = await api.get<ApiSuccess<AiVisibilityPromptWithKeyword[]>>(
      sitePath(siteId, "ai-visibility/prompts"),
    );
    return response.data;
  },

  /** Runs prompts against an AI provider. Synchronous and slow with many prompts. */
  test: async (siteId: number, payload: AiTestPayload = {}) => {
    const response = await api.post<ApiSuccess<AiTestResult>>(sitePath(siteId, "ai-visibility/test"), payload, {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },

  /** 100 per page, newest first. */
  results: async (siteId: number, params: PageParams = {}) => {
    const response = await api.get<ApiSuccess<LaravelPaginator<AiVisibilityResultWithPrompt>>>(
      sitePath(siteId, "ai-visibility/results"),
      { params },
    );
    return response.data;
  },

  /** Mention rate and visibility score overall and per provider. All zeros before the first test. */
  overview: async (siteId: number) => {
    const response = await api.get<ApiSuccess<AiVisibilityOverview>>(sitePath(siteId, "ai-visibility/overview"));
    return response.data;
  },
};

export default aiVisibilityService;
