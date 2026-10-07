import { useTranslations } from "next-intl";

import type { Engine } from "@/lib/api/types";
import { OrbitMark } from "@/components/brand/logo";
import { EngineIcon } from "@/components/brand/engine-icon";

/** Engines placed on the rings: [engine, ring radius, angle in degrees]. */
const placements: Array<[Engine, number, number]> = [
  ["chatgpt", 150, -62],
  ["gemini", 220, 18],
  ["perplexity", 150, 128],
  ["claude", 220, 206],
  ["aio", 290, -118],
];

/**
 * The fixed pane beside the setup column. Navy in both themes and never
 * animated: the steps move, this stays put.
 */
export function SetupVisual() {
  const t = useTranslations("siteSetup.shell.visual");
  return (
    <aside
      aria-label={t("label")}
      className="dark relative hidden overflow-hidden border-s border-nav-border bg-nav text-fg lg:flex lg:flex-1 lg:flex-col"
    >
      <div className="absolute inset-0 grid place-items-center" aria-hidden>
        <div className="relative size-[640px]">
          <svg viewBox="-320 -320 640 640" className="absolute inset-0 size-full text-nav-border">
            {[80, 150, 220, 290].map((r) => (
              <circle key={r} r={r} fill="none" stroke="currentColor" strokeWidth={1} />
            ))}
          </svg>
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-20 place-items-center rounded-full border border-nav-border bg-nav-card">
              <OrbitMark size={40} className="text-white" />
            </span>
          </span>
          {placements.map(([engine, r, deg]) => {
            const a = (deg * Math.PI) / 180;
            return (
              <span
                key={engine}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg bg-nav p-1.5 ring-1 ring-nav-border"
                style={{ left: 320 + r * Math.cos(a), top: 320 + r * Math.sin(a) }}
              >
                <EngineIcon engine={engine} size={28} />
              </span>
            );
          })}
        </div>
      </div>
      <div className="relative mt-auto flex max-w-[460px] flex-col gap-3 bg-gradient-to-t from-nav via-nav/90 to-transparent p-12 pt-24">
        <span className="flex items-center gap-2 text-overline text-nav-muted">
          <span aria-hidden className="size-2 rounded-full bg-signal" />
          {t("overline")}
        </span>
        <p className="text-h1 text-white">{t("headline")}</p>
        <p className="text-body-lg text-nav-fg">{t("body")}</p>
      </div>
    </aside>
  );
}
