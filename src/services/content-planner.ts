import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  ApiSuccess,
  ContentCalendarItem,
  ContentCalendarParams,
  ContentPlanWithItems,
  GenerateContentPlanPayload,
  GenerateContentPlanResult,
  LaravelPaginator,
  PageParams,
  ReschedulePayload,
} from "@/types/types";

/** Monthly content plans and the calendar. */
const contentPlannerService = {
  generate: async (siteId: number, payload: GenerateContentPlanPayload) => {
    const response = await api.post<ApiSuccess<GenerateContentPlanResult>>(
      sitePath(siteId, "content-planner/generate"),
      payload,
      { timeout: LONG_REQUEST_TIMEOUT_MS },
    );
    return response.data;
  },

  /** Plans with their items, 20 per page. */
  plans: async (siteId: number, params: PageParams = {}) => {
    const response = await api.get<ApiSuccess<LaravelPaginator<ContentPlanWithItems>>>(
      sitePath(siteId, "content-plans"),
      {
        params,
      },
    );
    return response.data;
  },

  /** Calendar items by date, 100 per page. */
  calendar: async (siteId: number, params: ContentCalendarParams = {}) => {
    const response = await api.get<ApiSuccess<LaravelPaginator<ContentCalendarItem>>>(
      sitePath(siteId, "content-calendar"),
      { params },
    );
    return response.data;
  },

  reschedule: async (siteId: number, itemId: number, payload: ReschedulePayload) => {
    const response = await api.patch<ApiSuccess<ContentCalendarItem>>(
      sitePath(siteId, `content-calendar/${itemId}/reschedule`),
      payload,
    );
    return response.data;
  },

  /** The keyword must belong to this site. */
  swapKeyword: async (siteId: number, itemId: number, keywordId: number) => {
    const response = await api.patch<ApiSuccess<ContentCalendarItem>>(
      sitePath(siteId, `content-calendar/${itemId}/swap-keyword`),
      { keyword_id: keywordId },
    );
    return response.data;
  },

  /** Soft-removes the item (status becomes `removed`). */
  remove: async (siteId: number, itemId: number) => {
    const response = await api.patch<ApiSuccess<ContentCalendarItem>>(
      sitePath(siteId, `content-calendar/${itemId}/remove`),
    );
    return response.data;
  },
};

export default contentPlannerService;
