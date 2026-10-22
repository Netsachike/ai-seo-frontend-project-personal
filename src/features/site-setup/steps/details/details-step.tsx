"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { detectLocale } from "../../detect-locale";
import { patchDraft, useDraft } from "../../store";
import { StepHeading } from "../step-heading";
import { AiSection } from "./ai-section";
import { DomainCard } from "./domain-card";
import { LanguageFields } from "./language-fields";
import { SetupSection, type SectionStatus } from "./setup-section";
import { countryCode, faviconFor } from "@/features/sites/site-utils";

type SectionKey = "description" | "audience" | "language";

/**
 * Step 2b. Three sections confirmed one at a time: Rankoya writes the
 * description, then the audience (reading the confirmed description), then
 * the user reviews the country and language chosen when the site was added. Confirming ticks a section,
 * collapses it and opens the next.
 */
export function DetailsStep({
  site,
  onComplete,
  completing,
}: {
  site: Site;
  onComplete: (value: { country: string; language: string }) => void;
  completing: boolean;
}) {
  const t = useTranslations("siteSetup.details");
  const draft = useDraft(site.id);
  const firstOpen: SectionKey = !draft.descriptionConfirmed
    ? "description"
    : !draft.audienceConfirmed
      ? "audience"
      : "language";
  const [open, setOpen] = React.useState<SectionKey>(firstOpen);
  const [live, setLive] = React.useState<Record<"description" | "audience", SectionStatus>>({
    description: "idle",
    audience: "idle",
  });

  const onDescriptionStatus = React.useCallback((s: SectionStatus) => setLive((l) => ({ ...l, description: s })), []);
  const onAudienceStatus = React.useCallback((s: SectionStatus) => setLive((l) => ({ ...l, audience: s })), []);
  const saveDescription = React.useCallback((text: string) => patchDraft(site.id, { description: text }), [site.id]);
  const saveAudience = React.useCallback((text: string) => patchDraft(site.id, { audience: text }), [site.id]);

  const statusOf = (key: "description" | "audience"): SectionStatus =>
    open === key ? live[key] : draft[`${key}Confirmed`] ? "confirmed" : "idle";
  const languageStatus: SectionStatus = draft.audienceConfirmed ? (open === "language" ? "review" : "idle") : "idle";

  const confirm = (key: "description" | "audience", text: string) => {
    patchDraft(site.id, { [key]: text, [`${key}Confirmed`]: true });
    // Next unconfirmed section, so reopening and re-confirming the description doesn't skip ahead.
    setOpen(key === "description" && !draft.audienceConfirmed ? "audience" : "language");
  };

  // What the site was created with; the draft and the TLD cover older sites saved without them.
  const locale = {
    country: countryCode(site.location.country) ?? draft.country ?? detectLocale(site).country,
    language: site.language ?? draft.language ?? detectLocale(site).language,
  };

  return (
    <div className="flex flex-col gap-8">
      <StepHeading title={t("title")} description={t("description")} />
      {/* The backend has no endpoint to change a site's domain, so the card is read-only. */}
      <DomainCard domain={site.domain} faviconUrl={faviconFor(site.domain)} editable={false} />

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <SetupSection
          index={1}
          title={t("sections.description")}
          status={statusOf("description")}
          open={open === "description"}
          onOpen={draft.descriptionConfirmed ? () => setOpen("description") : undefined}
        >
          <AiSection
            key={site.domain}
            site={site}
            section="description"
            saved={draft.description}
            onStatus={onDescriptionStatus}
            onWritten={saveDescription}
            onConfirm={(text) => confirm("description", text)}
          />
        </SetupSection>
        <SetupSection
          index={2}
          title={t("sections.audience")}
          status={statusOf("audience")}
          open={open === "audience"}
          onOpen={draft.audienceConfirmed ? () => setOpen("audience") : undefined}
        >
          <AiSection
            key={site.domain}
            site={site}
            section="audience"
            description={draft.description}
            saved={draft.audience}
            onStatus={onAudienceStatus}
            onWritten={saveAudience}
            onConfirm={(text) => confirm("audience", text)}
          />
        </SetupSection>
        <SetupSection
          index={3}
          title={t("sections.language")}
          status={languageStatus}
          open={open === "language"}
          onOpen={draft.audienceConfirmed ? () => setOpen("language") : undefined}
        >
          <LanguageFields
            values={locale}
            saving={completing}
            onContinue={(value) => {
              patchDraft(site.id, value);
              onComplete(value);
            }}
          />
        </SetupSection>
      </div>
    </div>
  );
}
