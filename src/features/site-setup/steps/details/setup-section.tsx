"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { dur, ease } from "../../motion";

export type SectionStatus = "idle" | "loading" | "streaming" | "review" | "editing" | "confirmed";

/**
 * One row of the details accordion. Only one is open at a time; rows not
 * reached yet are muted and can't be opened, confirmed rows show a check and
 * can be reopened.
 */
export function SetupSection({
  index,
  title,
  status,
  open,
  onOpen,
  children,
}: {
  index: number;
  title: string;
  status: SectionStatus;
  open: boolean;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const bodyId = React.useId();
  const locked = status === "idle" && !open;
  const busy = status === "loading" || status === "streaming";

  return (
    <div className="border-b border-border last:border-b-0">
      <h3>
        <button
          type="button"
          disabled={locked || !onOpen || open}
          onClick={onOpen}
          aria-expanded={open}
          aria-controls={bodyId}
          className={cn(
            "flex w-full items-center justify-between gap-4 px-6 py-5 text-start text-h2 transition-colors",
            locked ? "text-fg-3" : "text-fg",
            onOpen && !open && !locked && "hover:bg-surface-2/60",
          )}
        >
          <span>
            {index}. {title}
          </span>
          <span className="grid size-5 shrink-0 place-items-center">
            <AnimatePresence mode="wait" initial={false}>
              {busy && (
                <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2Icon aria-hidden className="size-5 animate-spin text-signal" />
                </motion.span>
              )}
              {status === "confirmed" && (
                <motion.svg
                  key="check"
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-5 text-success"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M4 12.5l5 5L20 6.5"
                    initial={{ pathLength: reduce ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, ease: ease.out }}
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: { height: { duration: dur.base, ease: ease.inOut }, opacity: { delay: 0.1, duration: 0.25 } },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { height: { duration: 0.3, ease: ease.inOut }, opacity: { duration: 0.15 } },
            }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
