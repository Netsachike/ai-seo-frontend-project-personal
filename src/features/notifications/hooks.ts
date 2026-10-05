"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Notification } from "@/lib/api/types";
import { api, unwrap } from "@/lib/api/client";
import { notificationKeys } from "@/lib/api/query-keys";

export function useNotifications(workspaceId: string | undefined) {
  return useQuery({
    queryKey: notificationKeys.all(workspaceId ?? "none"),
    enabled: Boolean(workspaceId),
    queryFn: async () => unwrap(await api.GET("/notifications")),
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead(workspaceId: string) {
  const queryClient = useQueryClient();
  const key = notificationKeys.all(workspaceId);
  return useMutation({
    mutationFn: async () => {
      await api.POST("/notifications/read-all");
    },
    onMutate: () => {
      const previous = queryClient.getQueryData<Notification[]>(key);
      queryClient.setQueryData<Notification[]>(key, (list) => list?.map((n) => ({ ...n, read: true })));
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
  });
}
