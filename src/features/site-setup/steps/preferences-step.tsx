"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import type { Brand } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { patchDraft, useDraft, type BrandVoice, type PublishMode, type SetupDraft } from "../store";
import { StepHeading } from "./step-heading";

const MODES: PublishMode[] = ["review", "auto"];
const CADENCE = [1, 2, 3, 5, 7] as const;
const VOICES: BrandVoice[] = ["friendly", "professional", "expert", "playful"];

const defaults: NonNullable<SetupDraft["preferences"]> = {
  publishMode: "review",
  articlesPerWeek: 3,
  voice: "friendly",
  voiceNotes: "",
};

/**
 * Step 7. How the content plan runs: cadence, the voice Orbit writes in, and
 * whether articles wait for approval (the default) or go live on schedule.
 */
export function PreferencesStep({ site, onContinue }: { site: Brand; onContinue: () => void }) {
  const t = useTranslations("siteSetup.preferences");
  const draft = useDraft(site.id);
  const [prefs, setPrefs] = React.useState(draft.preferences ?? defaults);
  const set = (patch: Partial<typeof prefs>) => setPrefs((p) => ({ ...p, ...patch }));
  const cadenceId = React.useId();

  return (
    <div className="flex flex-col gap-8">
      <StepHeading title={t("title")} description={t("description")} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-h3 text-fg">{t("mode.label")}</legend>
        <div role="radiogroup" aria-label={t("mode.label")} className="grid gap-3 sm:grid-cols-2">
          {MODES.map((mode) => {
            const on = prefs.publishMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set({ publishMode: mode })}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border bg-surface p-4 text-start transition-[border-color,box-shadow] duration-200",
                  on ? "border-fg shadow-[inset_0_0_0_1px_var(--text)]" : "border-border hover:border-border-strong",
                )}
              >
                <span className="flex items-center gap-2 text-h3 text-fg">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-4 place-items-center rounded-full border",
                      on ? "border-fg" : "border-border-strong",
                    )}
                  >
                    {on && <span className="size-2 rounded-full bg-fg" />}
                  </span>
                  {t(`mode.${mode}.title`)}
                </span>
                <span className="ps-6 text-small text-fg-3">{t(`mode.${mode}.body`)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <Label id={cadenceId} className="text-h3">
          {t("cadence.label")}
        </Label>
        <div role="radiogroup" aria-labelledby={cadenceId} className="flex flex-wrap gap-2">
          {CADENCE.map((n) => {
            const on = prefs.articlesPerWeek === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set({ articlesPerWeek: n })}
                className={cn(
                  "num h-10 min-w-14 rounded-md border px-3 text-body font-medium transition-colors duration-200",
                  on ? "border-fg bg-fg text-surface" : "border-border-strong bg-surface text-fg hover:bg-surface-2",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="text-small text-fg-3">{t("cadence.helper", { count: prefs.articlesPerWeek * 4 })}</p>
      </div>

      <div className="grid gap-4">
        <FormField label={t("voice.label")}>
          {(props) => (
            <Select value={prefs.voice} onValueChange={(voice) => set({ voice: voice as BrandVoice })}>
              <SelectTrigger {...props} className="h-12 w-full text-body-lg sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((voice) => (
                  <SelectItem key={voice} value={voice}>
                    {t(`voice.options.${voice}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label={t("voice.notesLabel")} helper={t("voice.notesHelper")}>
          {(props) => (
            <Textarea
              {...props}
              value={prefs.voiceNotes}
              onChange={(e) => set({ voiceNotes: e.target.value })}
              placeholder={t("voice.notesPlaceholder")}
              className="min-h-24"
            />
          )}
        </FormField>
      </div>

      <Button
        variant="primary"
        size="lg"
        className="mt-2"
        onClick={() => {
          patchDraft(site.id, { preferences: prefs });
          onContinue();
        }}
      >
        {t("continue")}
      </Button>
    </div>
  );
}
