"use client";

import { CheckIcon, CircleAlertIcon, ClockIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { TaskRef } from "@/lib/api/types";
import { useJob } from "@/lib/api/use-job";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

/**
 * A running agent task. When it has a job, progress is polled and shown as a
 * real bar with an ETA; never a frozen spinner.
 */
export function TaskRow({ task, className }: { task: TaskRef; className?: string }) {
  const t = useTranslations("task");
  const format = useFormatter();
  const job = useJob(task.status === "working" ? task.jobId : null);

  const status = job.data?.status === "done" ? "done" : job.data?.status === "failed" ? "failed" : task.status;
  const progress = job.data?.progress ?? (status === "done" ? 1 : 0);
  const eta = job.data?.etaSeconds;

  return (
    <div className={cn("flex flex-col gap-2 rounded-md bg-bg px-3 py-2.5 text-small", className)}>
      <div className="flex items-center gap-2.5">
        <StatusGlyph status={status} />
        <span className="min-w-0 flex-1 truncate text-fg">{task.title}</span>
        {task.detail && <span className="shrink-0 num text-caption font-normal text-fg-3">{task.detail}</span>}
      </div>
      {status === "working" && (
        <div className="flex items-center gap-3">
          <Progress value={progress * 100} aria-label={task.title} className="flex-1" />
          <span className="shrink-0 num text-caption font-normal text-fg-3">
            {eta !== null && eta !== undefined
              ? t("eta", { minutes: Math.max(1, Math.ceil(eta / 60)) })
              : format.number(progress, "percent")}
          </span>
        </div>
      )}
    </div>
  );
}

function StatusGlyph({ status }: { status: TaskRef["status"] }) {
  const t = useTranslations("task");
  const label = t(`status.${status}`);
  if (status === "done")
    return (
      <span
        role="img"
        aria-label={label}
        className="grid size-4 shrink-0 place-items-center rounded-full bg-success text-surface"
      >
        <CheckIcon className="size-2.5 stroke-[3]" />
      </span>
    );
  if (status === "failed")
    return <CircleAlertIcon role="img" aria-label={label} className="size-4 shrink-0 text-danger" />;
  if (status === "waiting") return <ClockIcon role="img" aria-label={label} className="size-4 shrink-0 text-warning" />;
  return (
    <span
      role="img"
      aria-label={label}
      className="size-3.5 shrink-0 rounded-full border-2 border-border-strong border-t-blue motion-safe:animate-spin"
    />
  );
}
