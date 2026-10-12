"use client";

import { useTranslations } from "next-intl";

import type { Engine } from "@/types/types";
import { cn } from "@/lib/utils";
import { EngineIcon } from "./engine-icon";

/** Toggle chip for engine filters. `engine="all"` renders the "All engines" chip. */
export function EngineChip({
  engine,
  pressed,
  onPressedChange,
  className,
}: {
  engine: Engine | "all";
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  className?: string;
}) {
  const t = useTranslations("engines");
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "press inline-flex h-8 shrink-0 items-center gap-2 rounded-full border ps-1 pe-3 text-[13px] leading-[18px] font-medium transition-colors duration-120",
        pressed ? "border-ink bg-ink text-ink-fg" : "border-border-strong bg-surface text-fg hover:bg-surface-hover",
        className,
      )}
    >
      {engine === "all" ? (
        <span
          aria-hidden
          translate="no"
          className={cn(
            "grid size-6 place-items-center rounded-full font-mono text-[9px] font-medium",
            pressed ? "bg-signal text-signal-ink" : "bg-surface-2 text-fg-2",
          )}
        >
          {t("allMonogram")}
        </span>
      ) : (
        <EngineIcon
          engine={engine}
          className={cn("rounded-full", pressed && "border-transparent bg-signal text-signal-ink")}
        />
      )}
      {engine === "all" ? t("all") : t(engine)}
    </button>
  );
}
