"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { dur, ease } from "../motion";
import { TOTAL_STEPS } from "../steps";

/** "Step N of 8" over eight segments; reached segments fill from the start edge. */
export function StepProgress({ current, className }: { current: number; className?: string }) {
  const t = useTranslations("siteSetup.shell");
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="flex h-5 items-center text-small font-medium text-fg">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: dur.fast, ease: ease.out }}
          >
            {t("stepOf", { step: current, total: TOTAL_STEPS })}
          </motion.span>
        </AnimatePresence>
      </p>
      <div
        role="progressbar"
        aria-label={t("progressLabel")}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={current}
        className="flex gap-1.5"
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-border">
            <motion.span
              className="block h-full bg-fg ltr:origin-left rtl:origin-right"
              initial={false}
              animate={{ scaleX: i < current ? 1 : 0 }}
              transition={{ duration: dur.slow, ease: ease.out }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
