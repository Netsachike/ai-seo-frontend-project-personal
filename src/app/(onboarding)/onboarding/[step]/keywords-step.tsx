"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/store/ui";
import { keywordSuggestions, questionSuggestions } from "@/features/onboarding/data";
import { useOnboarding } from "@/features/onboarding/store";
import { useUsage } from "@/features/workspace/hooks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StepFrame } from "@/components/layout/onboarding-shell";

/** Used until the usage API answers, so the step is never blocked on it. */
const FALLBACK_LIMIT = 25;

type Row = { id: string; text: string; volume?: number; difficulty?: number; custom?: boolean };

export function KeywordsStep() {
  const t = useTranslations("onboarding.keywords");
  const router = useRouter();
  const workspaceId = useUiStore((s) => s.workspaceId);
  const usage = useUsage(workspaceId ?? undefined);
  const s = useOnboarding();

  const prompts = usage.data?.breakdown.prompts;
  const limit = prompts ? Math.max(0, prompts.limit - prompts.used) : FALLBACK_LIMIT;
  const total = s.selectedKeywords.length + s.selectedQuestions.length;
  const atLimit = total >= limit;
  const over = total > limit;

  const keywords: Row[] = [...keywordSuggestions, ...s.customKeywords.map((k) => ({ ...k, custom: true }))];
  const questions: Row[] = [...questionSuggestions, ...s.customQuestions.map((q) => ({ ...q, custom: true }))];

  return (
    <StepFrame
      step="keywords"
      back="competitors"
      wide
      title={t("title")}
      description={t("description", { count: keywordSuggestions.length + questionSuggestions.length })}
      continueDisabled={total === 0 || over}
      onContinue={() => {
        s.complete("keywords");
        router.push("/onboarding/connect");
      }}
      hint={over ? <span className="text-danger">{t("overLimit", { count: total - limit })}</span> : undefined}
    >
      <UsageMeter total={total} limit={limit} plan={usage.data?.plan.name} loading={usage.isPending && !!workspaceId} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PickList
          title={t("keywordsTitle")}
          caption={t("keywordsCaption")}
          rows={keywords}
          selected={s.selectedKeywords}
          atLimit={atLimit}
          onChange={(selectedKeywords) => s.set({ selectedKeywords })}
          addLabel={t("addKeyword")}
          addPlaceholder={t("addKeywordPlaceholder")}
          onAdd={(text) => {
            const id = `ck_${Date.now()}`;
            s.set({
              customKeywords: [...s.customKeywords, { id, text }],
              selectedKeywords: [...s.selectedKeywords, id],
            });
          }}
        />
        <PickList
          title={t("questionsTitle")}
          caption={t("questionsCaption")}
          rows={questions}
          selected={s.selectedQuestions}
          atLimit={atLimit}
          onChange={(selectedQuestions) => s.set({ selectedQuestions })}
          addLabel={t("addQuestion")}
          addPlaceholder={t("addQuestionPlaceholder")}
          onAdd={(text) => {
            const id = `cq_${Date.now()}`;
            s.set({
              customQuestions: [...s.customQuestions, { id, text }],
              selectedQuestions: [...s.selectedQuestions, id],
            });
          }}
        />
      </div>
    </StepFrame>
  );
}

function UsageMeter({
  total,
  limit,
  plan,
  loading,
}: {
  total: number;
  limit: number;
  plan?: string;
  loading: boolean;
}) {
  const t = useTranslations("onboarding.keywords");
  if (loading) return <Skeleton className="h-16 w-full rounded-lg" />;
  const pct = limit > 0 ? Math.min(1, total / limit) : 1;
  const tone = total > limit ? "bg-danger" : pct >= 0.8 ? "bg-warning" : "bg-ink";
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-small font-medium text-fg">
          <span className="num">{t("meter", { total, limit })}</span>
        </p>
        <p className="text-caption font-normal text-fg-3">{plan ? t("planNote", { plan }) : t("planNoteGeneric")}</p>
      </div>
      <div
        role="meter"
        aria-label={t("meterLabel")}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={total}
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-200", tone)}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

function PickList({
  title,
  caption,
  rows,
  selected,
  atLimit,
  onChange,
  addLabel,
  addPlaceholder,
  onAdd,
}: {
  title: string;
  caption: string;
  rows: Row[];
  selected: string[];
  atLimit: boolean;
  onChange: (ids: string[]) => void;
  addLabel: string;
  addPlaceholder: string;
  onAdd: (text: string) => void;
}) {
  const t = useTranslations("onboarding.keywords");
  const format = useFormatter();
  const [draft, setDraft] = React.useState("");
  const allOn = rows.every((r) => selected.includes(r.id));
  const headingId = React.useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col rounded-lg border border-border bg-surface shadow-card"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <h2 id={headingId} className="text-h3">
            {title}
          </h2>
          <p className="text-caption font-normal text-fg-3">{caption}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange(
              allOn
                ? selected.filter((id) => !rows.some((r) => r.id === id))
                : [...new Set([...selected, ...rows.map((r) => r.id)])],
            )
          }
        >
          {allOn ? t("clear") : t("selectAll")}
        </Button>
      </header>
      <ul className="flex flex-col py-1">
        {rows.map((row) => {
          const on = selected.includes(row.id);
          const id = `pick-${row.id}`;
          const disabled = !on && atLimit;
          return (
            <li key={row.id}>
              <label
                htmlFor={id}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-surface-2",
                  disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                )}
              >
                <Checkbox
                  id={id}
                  checked={on}
                  disabled={disabled}
                  onCheckedChange={(v) => onChange(v ? [...selected, row.id] : selected.filter((s) => s !== row.id))}
                />
                <span className="min-w-0 flex-1 text-small text-fg">{row.text}</span>
                {row.custom && <span className="text-caption font-normal text-fg-3">{t("custom")}</span>}
                {row.volume !== undefined && (
                  <span className="shrink-0 num text-caption text-fg-2" title={t("volumeTitle")}>
                    {t("volume", { volume: format.number(row.volume, "compact") })}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      <form
        className="mt-auto flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text) return;
          onAdd(text);
          setDraft("");
        }}
      >
        <Input
          aria-label={addLabel}
          placeholder={addPlaceholder}
          value={draft}
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          className="h-9"
        />
        <Button type="submit" variant="secondary" size="sm" className="h-9" disabled={!draft.trim() || atLimit}>
          <PlusIcon />
          {t("add")}
        </Button>
      </form>
    </section>
  );
}
