"use client";

import * as React from "react";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { create } from "zustand";

type BusyEntry = { id: string; title: string; body?: string };

const useBusyStore = create<{
  entries: BusyEntry[];
  put: (entry: BusyEntry) => void;
  drop: (id: string) => void;
}>()((set) => ({
  entries: [],
  put: (entry) => set((s) => ({ entries: [...s.entries.filter((e) => e.id !== entry.id), entry] })),
  drop: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
}));

/**
 * Covers the app with a blurred overlay saying what's running while `active`
 * is true, e.g. `useBusyOverlay(scan.isPending, t("checking"))`. The newest
 * action wins when two run at once. Gone on unmount, so a page left mid-action
 * never leaves it behind.
 */
export function useBusyOverlay(active: boolean, title: string, body?: string) {
  const id = React.useId();
  React.useEffect(() => {
    if (!active) return;
    useBusyStore.getState().put({ id, title, body });
    return () => useBusyStore.getState().drop(id);
  }, [active, id, title, body]);
}

/** Rendered once by the app shell. */
export function BusyOverlay() {
  const t = useTranslations("busy");
  const entry = useBusyStore((s) => s.entries.at(-1));
  if (!entry) return null;
  return (
    <div
      aria-busy
      className="fixed inset-0 z-[60] grid place-items-center bg-bg/60 p-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0"
    >
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-7 text-center shadow-card"
      >
        <LoaderCircleIcon aria-hidden className="size-8 animate-spin text-blue" />
        <p className="text-body font-semibold text-fg">{entry.title}</p>
        <p className="text-small text-fg-2">{entry.body ?? t("body")}</p>
      </div>
    </div>
  );
}
