"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";

const steps = [
  { key: "discover", path: "keywords" },
  { key: "analyze", path: "keywords" },
  { key: "research", path: "articles?view=research" },
  { key: "write", path: "articles" },
] as const;

/**
 * The content pipeline, in the order the backend requires it: discover
 * keywords, analyze them (only accepted ones can be researched), research a
 * keyword, then write the article from the completed research.
 */
export function PipelineSteps({ page, className }: { page: "keywords" | "articles"; className?: string }) {
  const t = useTranslations("shared.pipeline");
  const { brandSlug } = useShell();
  return (
    <ol aria-label={t("label")} className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {steps.map((step, i) => {
        const here = step.path.startsWith(page);
        return (
          <li key={step.key}>
            <Link
              href={brandHref(brandSlug, step.path)}
              aria-current={here ? "step" : undefined}
              className={cn(
                "flex h-full items-start gap-2.5 rounded-lg border p-3 transition-colors duration-120",
                here ? "border-ink/20 bg-surface" : "border-border bg-surface-2/50 hover:bg-surface",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full num text-caption font-semibold",
                  here ? "bg-ink text-ink-fg" : "bg-border text-fg-2",
                )}
              >
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn("text-small font-medium", here ? "text-fg" : "text-fg-2")}>
                  {t(`${step.key}.title`)}
                </span>
                <span className="text-caption font-normal text-fg-3">{t(`${step.key}.body`)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
