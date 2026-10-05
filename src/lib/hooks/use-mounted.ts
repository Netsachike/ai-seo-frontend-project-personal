import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True after hydration. For values that only exist in the browser (theme, storage). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
