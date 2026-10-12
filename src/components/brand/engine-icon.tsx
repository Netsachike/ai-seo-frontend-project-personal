"use client";

import { useTranslations } from "next-intl";

import type { Engine } from "@/types/types";
import { cn } from "@/lib/utils";
import { PlatformLogo, platformLogos } from "./platform-logo";

/** Monograms for engines without a logo file. Not translated. */
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
  const logo = Boolean(platformLogos[engine]);
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : t(engine)}
      translate="no"
      className={cn(
        "grid shrink-0 place-items-center rounded-[6px] border border-border font-mono leading-none font-medium text-fg-2",
        logo ? "bg-white" : "bg-surface-2",
        size <= 24 ? "text-[9px]" : "text-[10px]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {logo ? <PlatformLogo platform={engine} size={Math.round(size * 0.66)} /> : engineMonogram[engine]}
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
