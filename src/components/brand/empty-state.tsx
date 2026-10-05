import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One line on what the screen shows, one line on how to fill it, one action.
 * Used instead of empty charts so a brand-new workspace never shows "0.0".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "agent" | "danger";
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-lg border border-dashed border-border-strong bg-surface",
        compact ? "p-5" : "px-6 py-10 sm:px-10",
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden
          className={cn(
            "grid size-10 place-items-center rounded-md",
            tone === "agent" && "bg-signal text-signal-ink",
            tone === "neutral" && "bg-surface-2 text-fg-2",
            tone === "danger" && "bg-danger-bg text-danger",
          )}
        >
          <Icon className="size-[18px]" strokeWidth={1.5} />
        </span>
      )}
      <div className="flex max-w-[52ch] flex-col gap-1">
        <p className="text-h3 text-fg">{title}</p>
        {description && <p className="text-body text-fg-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
