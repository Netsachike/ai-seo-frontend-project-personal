"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** ⌘ on Apple devices, Ctrl elsewhere. Renders the Ctrl form on the server. */
export function useIsMac() {
  return useSyncExternalStore(subscribe, isMac, () => false);
}

export function Shortcut({ letter, className }: { letter: "K" | "J"; className?: string }) {
  const t = useTranslations("shell.shortcut");
  const mac = useIsMac();
  return (
    <kbd dir="ltr" className={cn("font-mono text-[11px] font-medium", className)}>
      {mac ? t("mac", { key: letter }) : t("other", { key: letter })}
    </kbd>
  );
}
