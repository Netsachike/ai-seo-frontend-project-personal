"use client";

import { useTranslations } from "next-intl";

import type { Engine } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Neutral monograms until official marks are licensed. Not translated. */
export const engineMonogram: Record<Engine, string> = {
  chatgpt: "GPT",
  gemini: "GEM",
  perplexity: "PPX",
  claude: "CLD",
  aio: "AIO",
};

export function EngineIcon({
  engine,
  size = 24,
  className,
  decorative = true,
}: {
  engine: Engine;
  size?: 20 | 24 | 28 | 32;
  className?: string;
  /** When false the tile is labelled with the engine name. */
  decorative?: boolean;
}) {
  const t = useTranslations("engines");
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : t(engine)}
      translate="no"
      className={cn(
        "grid shrink-0 place-items-center rounded-[6px] border border-border bg-surface-2 font-mono leading-none font-medium text-fg-2",
        size <= 24 ? "text-[9px]" : "text-[10px]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {engineMonogram[engine]}
    </span>
  );
}

export function EngineName({ engine, className }: { engine: Engine; className?: string }) {
  const t = useTranslations("engines");
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <EngineIcon engine={engine} />
      <span className="truncate">{t(engine)}</span>
    </span>
  );
}
