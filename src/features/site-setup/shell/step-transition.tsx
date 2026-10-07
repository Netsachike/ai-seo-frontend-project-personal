"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";

import { dirFor } from "@/i18n/config";
import { dur, ease, SHIFT } from "../motion";
import { SETUP_SCROLL_ID } from "../hooks/use-stick-to-bottom";

/**
 * The "fading carousel": the outgoing step fades and slides away in the
 * direction of travel while the next one fades in from the other side. One
 * view at a time; the column scrolls back to the top on each change.
 */
export function StepTransition({
  stepKey,
  direction,
  children,
}: {
  stepKey: string;
  direction: 1 | -1;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const rtl = dirFor(useLocale()) === "rtl";
  // Forward is toward the inline end, which is leftward in RTL.
  const x = reduce ? 0 : SHIFT * (rtl ? -1 : 1);
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: d * x, filter: reduce ? "none" : "blur(2px)" }),
          center: { opacity: 1, x: 0, filter: reduce ? "none" : "blur(0px)" },
          exit: (d: number) => ({ opacity: 0, x: d * -x, filter: reduce ? "none" : "blur(2px)" }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: dur.base, ease: ease.out }}
        onAnimationStart={(definition) => {
          if (definition === "center") document.getElementById(SETUP_SCROLL_ID)?.scrollTo({ top: 0 });
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
