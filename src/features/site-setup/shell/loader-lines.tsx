"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { dur } from "../motion";

/**
 * A named wait: a title that shimmers and a subline that can change as time
 * passes. The subline sits in a fixed-height row so a change never shifts the
 * layout.
 */
export function LoaderLines({
  title,
  subline,
  spinner = false,
  size = "md",
  className,
}: {
  title: string;
  subline: string;
  spinner?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div role="status" className={cn("flex gap-3", className)}>
      {spinner && (
        <Loader2Icon
          aria-hidden
          className={cn("shrink-0 animate-spin text-fg-3", size === "lg" ? "mt-1.5 size-5" : "mt-0.5 size-4")}
        />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn("text-shimmer", size === "lg" ? "text-h1" : "text-body-lg")}>{title}</p>
        <div className="relative h-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={subline}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.fast }}
              className="absolute inset-0 truncate text-small text-fg-3"
            >
              {subline}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
