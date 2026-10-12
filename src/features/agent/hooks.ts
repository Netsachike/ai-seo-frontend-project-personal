"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CopilotMessage } from "@/types/types";
import type { AgentMessage, AgentThread } from "@/lib/mocks/types";
import { copilotKeys } from "@/lib/api/query-keys";
import copilotService from "@/services/copilot";

/** Copilot messages in the shape the chat components render. Approvals and tasks have no endpoint yet. */
export function toAgentMessage(message: CopilotMessage): AgentMessage {
  return {
    id: String(message.id),
    role: message.role === "assistant" ? "agent" : "user",
    createdAt: message.created_at,
    source: "web",
    body: message.content,
    approval: null,
    task: null,
  };
}

/**
 * The site's thread: its most recent copilot conversation, or an empty
 * thread before the first question.
 */
export function useAgentThread(siteId: number) {
  return useQuery({
    queryKey: copilotKeys.conversations(siteId),
    queryFn: async (): Promise<AgentThread & { conversationId: number | null }> => {
      const page = await copilotService.conversations(siteId, { per_page: 1 });
      const latest = page.data[0];
      if (!latest) return { id: "new", conversationId: null, messages: [] };
      const { conversation } = await copilotService.conversation(siteId, latest.id);
      return {
        id: String(conversation.id),
        conversationId: conversation.id,
        messages: conversation.messages.map(toAgentMessage),
      };
    },
  });
}

/** Asks the copilot in the current conversation (or starts one), showing the question straight away. */
export function useSendAgentMessage(siteId: number) {
  const queryClient = useQueryClient();
  const key = copilotKeys.conversations(siteId);
  type Thread = AgentThread & { conversationId: number | null };

  return useMutation({
    mutationFn: (question: string) => {
      const thread = queryClient.getQueryData<Thread>(key);
      return copilotService.ask(siteId, { question, conversation_id: thread?.conversationId ?? null });
    },
    onMutate: async (question) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Thread>(key);
      queryClient.setQueryData<Thread>(key, (thread) =>
        thread
          ? {
              ...thread,
              messages: [
                ...thread.messages,
                {
                  id: `tmp_${Date.now()}`,
                  role: "user",
                  createdAt: new Date().toISOString(),
                  source: "web",
                  body: question,
                  approval: null,
                  task: null,
                },
              ],
            }
          : thread,
      );
      return { previous };
    },
    onSuccess: (response) => {
      // Replace the optimistic question with the stored pair from the response.
      queryClient.setQueryData<Thread>(key, (thread) => {
        const kept = (thread?.messages ?? []).filter((m) => !m.id.startsWith("tmp_"));
        return {
          id: String(response.conversation.id),
          conversationId: response.conversation.id,
          messages: [...kept, toAgentMessage(response.user_message), toAgentMessage(response.message)],
        };
      });
    },
    onError: (_error, _question, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
  });
}
