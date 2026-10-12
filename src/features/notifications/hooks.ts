"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Notification } from "@/lib/mocks/types";
import { listNotifications, markAllNotificationsRead } from "@/lib/mocks/store";
import { notificationKeys } from "@/lib/api/query-keys";

export function useNotifications(workspaceId: number | undefined) {
  return useQuery({
    queryKey: notificationKeys.all(workspaceId ?? 0),
    enabled: Boolean(workspaceId),
    queryFn: listNotifications,
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead(workspaceId: number) {
  const queryClient = useQueryClient();
  const key = notificationKeys.all(workspaceId);
  return useMutation({
    mutationFn: markAllNotificationsRead,
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
