"use client";

import { motion, useReducedMotion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type ScoreBand = "danger" | "warning" | "success";

export function scoreBand(score: number): ScoreBand {
  if (score < 40) return "danger";
  if (score < 70) return "warning";
  return "success";
}

const bandStroke: Record<ScoreBand, string> = {
  danger: "var(--danger)",
  warning: "var(--warning)",
  success: "var(--success)",
};

const sizes = {
  sm: { box: 64, stroke: 6, number: "text-[20px] leading-6", caption: false },
  md: { box: 120, stroke: 10, number: "text-metric-xl", caption: true },
} as const;

/** 0–100 score. `null` renders a quiet empty ring instead of a broken "0". */
export function ScoreRing({
  score,
  label,
  size = "md",
  className,
}: {
  score: number | null;
  label: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const t = useTranslations("score");
  const format = useFormatter();
  const reduce = useReducedMotion();
  const s = sizes[size];
  const r = (s.box - s.stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = score === null ? 0 : Math.max(0, Math.min(100, score));
  const band = score === null ? null : scoreBand(clamped);

  return (
    <div
      role="img"
      aria-label={score === null ? t("emptyLabel", { label }) : t("label", { label, score: clamped })}
      className={cn("relative shrink-0", className)}
      style={{ width: s.box, height: s.box }}
    >
      <svg
        width={s.box}
        height={s.box}
        viewBox={`0 0 ${s.box} ${s.box}`}
        aria-hidden
        className="-rotate-90 rtl:scale-y-[-1]"
      >
        <circle cx={s.box / 2} cy={s.box / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={s.stroke} />
        {band && (
          <motion.circle
            cx={s.box / 2}
            cy={s.box / 2}
            r={r}
            fill="none"
            stroke={bandStroke[band]}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={reduce ? false : { strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - clamped / 100) }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          />
        )}
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("num font-medium tracking-[-0.02em] text-fg", s.number, score === null && "text-fg-3")}>
          {score === null ? "—" : format.number(clamped, "integer")}
        </span>
        {s.caption && <span className="text-caption font-normal text-fg-3">{t("ofHundred")}</span>}
      </div>
    </div>
  );
}
