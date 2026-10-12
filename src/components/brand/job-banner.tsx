"use client";

import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { Job } from "@/lib/mocks/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/** Live progress for a job the user just started. Never a frozen spinner: percent and time left update every poll. */
export function JobBanner({ job, title, onDismiss }: { job: Job | undefined; title: string; onDismiss: () => void }) {
  const t = useTranslations("insights.jobs");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const done = job?.status === "done" || job?.status === "failed";
  const progress = job?.progress ?? 0;

  return (
    <div role="status" className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2.5">
        {done ? (
          <CheckIcon aria-hidden className="size-4 text-success" strokeWidth={2.4} />
        ) : (
          <Loader2Icon aria-hidden className="size-4 animate-spin text-fg-3" />
        )}
        <p className="min-w-0 flex-1 text-small font-medium text-fg">{done ? t("finished", { title }) : title}</p>
        <span className="num text-caption text-fg-2">
          {done
            ? format.number(1, "percent")
            : t("eta", {
                percent: format.number(progress, "percent"),
                minutes: Math.max(1, Math.ceil((job?.etaSeconds ?? 60) / 60)),
              })}
        </span>
        {done && (
          <Button variant="ghost" size="icon-sm" aria-label={tCommon("close")} onClick={onDismiss}>
            <XIcon />
          </Button>
        )}
      </div>
      <Progress value={progress * 100} tone={done ? "success" : "ink"} aria-label={title} />
    </div>
  );
}
