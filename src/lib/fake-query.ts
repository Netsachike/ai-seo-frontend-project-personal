"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * UI-stage data hook for screens without a mock endpoint. It behaves like a
 * real request (pending, then data) so loading skeletons are exercised. Swap
 * the queryFn for an API call when the backend lands; keys stay the same.
 */
export function useFakeQuery<T>(key: readonly unknown[], load: () => T, { delay = 450, enabled = true } = {}) {
  return useQuery({
    queryKey: ["ui", ...key],
    enabled,
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return load();
    },
  });
}
