"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CircleAlertIcon, Loader2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { Engine, JobStep } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useJob } from "@/lib/api/use-job";
import { useUiStore } from "@/lib/store/ui";
import { questionSuggestions } from "@/features/onboarding/data";
import { useOnboarding } from "@/features/onboarding/store";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EngineIcon } from "@/components/brand/engine-icon";
import { OrbitAvatar } from "@/components/brand/logo";
import { StepFrame } from "@/components/layout/onboarding-shell";

/** UI-stage partial results: how many questions each engine mentioned the brand in. */
const mentions: Partial<Record<Engine, number>> = { gemini: 12, chatgpt: 9, perplexity: 8, claude: 5 };

export function ScanStep() {
  const t = useTranslations("onboarding.scan");
  const format = useFormatter();
  const router = useRouter();
  const jobId = useOnboarding((s) => s.scanJobId);
  const telegram = useOnboarding((s) => s.telegram);
  const brandSlug = useUiStore((s) => s.brandSlug);
  const job = useJob(jobId);
  const questions = useOnboarding((s) => s.selectedQuestions.length) || questionSuggestions.length;

  const data = job.data;
  const done = data?.status === "done" || data?.status === "failed";
  const finished = data?.steps.filter((s) => s.status === "done") ?? [];
  const totalMentions = finished.reduce((sum, s) => sum + (mentions[s.key as Engine] ?? 0), 0);

  return (
    <StepFrame
      step="scan"
      title={done ? t("doneTitle") : t("title")}
      description={t("description", { engines: 5, questions })}
      continueLabel={t("dashboard")}
      continueDisabled={!done}
      onContinue={() => router.push(`/${brandSlug ?? "northwind-roasters"}/overview`)}
      hint={done ? undefined : telegram === "connected" ? t("telegramHint") : t("leaveHint")}
    >
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
        {!data ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="flex items-center gap-2 text-h3">
                {done ? (
                  <CheckIcon aria-hidden className="size-4 text-success" strokeWidth={2.4} />
                ) : (
                  <Loader2Icon aria-hidden className="size-4 animate-spin text-fg-3" />
                )}
                {done ? t("complete") : t("running")}
              </p>
              <p className="num text-small text-fg-2" aria-live="polite">
                {done
                  ? t("summary", { mentioned: totalMentions, answers: finished.length * questions })
                  : t("progress", {
                      percent: format.number(data.progress, "percent"),
                      minutes: Math.max(1, Math.ceil((data.etaSeconds ?? 0) / 60)),
                    })}
              </p>
            </div>
            <Progress value={data.progress * 100} tone={done ? "success" : "ink"} aria-label={t("progressLabel")} />
          </>
        )}
      </section>

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface shadow-card">
        {(data?.steps ?? []).map((step) => (
          <EngineRow key={step.key} step={step} questions={questions} />
        ))}
        {!data &&
          Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="size-6" />
              <Skeleton className="h-4 flex-1" />
            </li>
          ))}
      </ul>

      {finished.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
          <OrbitAvatar size={28} />
          <p className="text-body-lg text-fg">
            {done ? t("orbitDone", { mentioned: totalMentions }) : t("orbitPartial", { engines: finished.length })}
          </p>
        </div>
      )}
    </StepFrame>
  );
}

function EngineRow({ step, questions }: { step: JobStep; questions: number }) {
  const t = useTranslations("onboarding.scan");
  const tEngine = useTranslations("engines");
  const format = useFormatter();
  const engine = step.key as Engine;
  const name = tEngine(engine);

  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-3">
        <EngineIcon engine={engine} />
        <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{name}</span>
        <span
          className={cn(
            "flex items-center gap-1.5 num text-small",
            step.status === "done" && "text-success",
            step.status === "failed" && "text-danger",
            (step.status === "running" || step.status === "queued") && "text-fg-3",
          )}
        >
          {step.status === "done" && (
            <>
              <CheckIcon aria-hidden className="size-4" />
              {t("mentioned", { mentioned: mentions[engine] ?? 0, questions })}
            </>
          )}
          {step.status === "running" && format.number(step.progress, "percent")}
          {step.status === "queued" && t("queued")}
          {step.status === "failed" && (
            <>
              <CircleAlertIcon aria-hidden className="size-4" />
              {t("failed")}
            </>
          )}
        </span>
      </div>
      {step.status === "running" && (
        <Progress value={step.progress * 100} tone="blue" className="h-1" aria-label={name} />
      )}
      {step.status === "failed" && (
        <p className="text-small text-fg-2">
          {t("engineDown", {
            engine: name,
            time: step.retryAt ? format.dateTime(new Date(step.retryAt), "time") : "—",
          })}
        </p>
      )}
    </li>
  );
}
