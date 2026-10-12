"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { CORE_TOPIC_COUNT } from "../../steps";

const CX = 200;
const CY = 150;
const RANKOYA = 115;

/** Flat-top hexagon around the origin. */
const hex = (r: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

/** Slot i sits on the rankoya, starting at the top and going clockwise. */
const slot = (i: number) => {
  const a = ((-90 + i * (360 / CORE_TOPIC_COUNT)) * Math.PI) / 180;
  return { x: CX + RANKOYA * Math.cos(a), y: CY + RANKOYA * Math.sin(a), below: Math.sin(a) > 0.2 };
};

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * The topical map: the site in the middle, five core-topic slots around it.
 * Topics fill the slots in the order they were picked; removing one moves
 * the later ones down a slot, gliding to their new place.
 */
export function TopicMap({
  siteName,
  topics,
  label,
}: {
  siteName: string;
  /** Selected topics, in selection order. */
  topics: Array<{ id: string; label: string }>;
  label: string;
}) {
  const reduce = useReducedMotion();
  const slots = Array.from({ length: CORE_TOPIC_COUNT }, (_, i) => slot(i));

  return (
    <svg viewBox="0 0 400 300" role="img" aria-label={label} className="h-auto w-full max-w-[520px]">
      <circle cx={CX} cy={CY} r={RANKOYA} fill="none" className="stroke-border-strong" strokeDasharray="3 4" />

      {slots.map((s, i) => (
        <polygon
          key={i}
          points={hex(20)}
          transform={`translate(${s.x} ${s.y})`}
          className="fill-surface stroke-border-strong"
          strokeDasharray="3 3"
        />
      ))}

      <AnimatePresence>
        {topics.map((topic, i) => {
          const s = slots[i];
          if (!s) return null;
          return (
            <motion.g
              key={topic.id}
              initial={{ x: s.x, y: s.y, opacity: 1 }}
              animate={{ x: s.x, y: s.y, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.line
                x1={0}
                y1={0}
                x2={CX - s.x}
                y2={CY - s.y}
                className="stroke-signal/50"
                strokeDasharray="3 3"
                initial={{ pathLength: reduce ? 1 : 0 }}
                animate={{ pathLength: 1, x2: CX - s.x, y2: CY - s.y }}
                transition={{ duration: 0.3 }}
              />
              <motion.polygon
                points={hex(20)}
                className="fill-signal/20 stroke-signal"
                strokeWidth={1.5}
                initial={{ scale: reduce ? 1 : 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />
              <motion.text
                y={s.below ? 36 : -30}
                textAnchor="middle"
                className="fill-fg text-[11px] font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.2 }}
              >
                {truncate(topic.label, 24)}
              </motion.text>
            </motion.g>
          );
        })}
      </AnimatePresence>

      <g transform={`translate(${CX} ${CY})`}>
        <polygon points={hex(34)} className="fill-signal" />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-signal-ink text-[7px] font-bold tracking-wide uppercase"
        >
          {truncate(siteName, 12)}
        </text>
      </g>
    </svg>
  );
}
