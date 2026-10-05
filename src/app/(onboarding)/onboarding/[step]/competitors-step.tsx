"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { DOMAIN_PATTERN, MAX_COMPETITORS, guessProfile } from "@/features/onboarding/data";
import { useOnboarding } from "@/features/onboarding/store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { EntityAvatar } from "@/components/layout/avatars";
import { StepFrame } from "@/components/layout/onboarding-shell";

export function CompetitorsStep() {
  const t = useTranslations("onboarding.competitors");
  const router = useRouter();
  const { competitors, selectedCompetitors: selected, set, complete } = useOnboarding();
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string>();
  const full = selected.length >= MAX_COMPETITORS;

  const toggle = (id: string, on: boolean) =>
    set({ selectedCompetitors: on ? [...selected, id] : selected.filter((s) => s !== id) });

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    if (!DOMAIN_PATTERN.test(draft)) return setError(t("domainInvalid"));
    if (competitors.some((c) => c.domain === draft)) return setError(t("duplicate"));
    if (full) return setError(t("limitReached", { max: MAX_COMPETITORS }));
    const id = `custom_${draft}`;
    set({
      competitors: [...competitors, { id, name: guessProfile(draft).name, domain: draft, sharedKeywords: null }],
      selectedCompetitors: [...selected, id],
    });
    setDraft("");
  };

  return (
    <StepFrame
      step="competitors"
      back="brand"
      title={t("title")}
      description={t("description", { max: MAX_COMPETITORS })}
      hint={
        <span aria-live="polite" className="num">
          {t("selected", { count: selected.length, max: MAX_COMPETITORS })}
        </span>
      }
      continueDisabled={selected.length === 0}
      onContinue={() => {
        complete("competitors");
        router.push("/onboarding/keywords");
      }}
    >
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        {competitors.map((c) => {
          const on = selected.includes(c.id);
          const id = `cmp-${c.id}`;
          return (
            <li key={c.id} className={cn("flex items-center gap-3 px-4 py-3", !on && full && "opacity-60")}>
              <EntityAvatar name={c.name} size={32} className={cn(!on && "bg-surface-2 text-fg-2")} />
              <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col">
                <span className="truncate text-body font-medium text-fg">{c.name}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-caption font-normal text-fg-3">
                  <span dir="ltr" className="font-mono">
                    {c.domain}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="num">
                    {c.sharedKeywords === null ? t("addedByYou") : t("shared", { count: c.sharedKeywords })}
                  </span>
                </span>
              </label>
              <Switch id={id} checked={on} disabled={!on && full} onCheckedChange={(v) => toggle(c.id, v)} />
            </li>
          );
        })}
      </ul>
      {full && <p className="-mt-4 text-small text-fg-2">{t("limitNote", { max: MAX_COMPETITORS })}</p>}

      <form onSubmit={add} noValidate className="flex flex-col gap-2">
        <FormField label={t("addLabel")} error={error} helper={error ? undefined : t("addHelper")}>
          {(props) => (
            <div className="flex gap-2">
              <DomainInput
                {...props}
                value={draft}
                placeholder={t("addPlaceholder")}
                onChange={(v) => {
                  setDraft(v);
                  setError(undefined);
                }}
              />
              <Button type="submit" variant="secondary" disabled={!draft}>
                <PlusIcon />
                {t("add")}
              </Button>
            </div>
          )}
        </FormField>
      </form>
    </StepFrame>
  );
}
