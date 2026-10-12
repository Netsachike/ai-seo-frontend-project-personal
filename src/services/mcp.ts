import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import type { McpCallPayload, McpCallResponse, McpToolsResponse } from "@/types/types";

/** Model Context Protocol tool bridge. */
const mcpService = {
  /** Tool definitions with the JSON Schema of their arguments. */
  tools: async () => {
    const response = await api.get<McpToolsResponse>("/mcp/tools");
    return response.data;
  },

  /** Runs a tool against a site. The `result` shape depends on the tool. */
  call: async (siteId: number, payload: McpCallPayload) => {
    const response = await api.post<McpCallResponse>(`/mcp/sites/${siteId}/call`, payload, {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },
};

export default mcpService;
