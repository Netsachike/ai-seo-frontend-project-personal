"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  DOMAIN_PATTERN,
  contentLanguages,
  guessProfile,
  industries,
  markets,
  type Industry,
} from "@/features/onboarding/data";
import { useOnboarding } from "@/features/onboarding/store";
import { Input } from "@/components/ui/input";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { OrbitAvatar } from "@/components/brand/logo";
import { StepFrame } from "@/components/layout/onboarding-shell";

const CRAWL_MS = 1800;

export function BrandStep() {
  const t = useTranslations("onboarding.brand");
  const locale = useLocale();
  const router = useRouter();
  const { domain, crawl, pages, profile, set, complete } = useOnboarding();
  const [touched, setTouched] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const regions = React.useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const languages = React.useMemo(() => new Intl.DisplayNames([locale], { type: "language" }), [locale]);

  const validDomain = DOMAIN_PATTERN.test(domain);

  // Reading the site is faked: a short wait, then the profile is "learned".
  const startCrawl = (value: string) => {
    clearTimeout(timer.current);
    if (!DOMAIN_PATTERN.test(value)) return set({ crawl: "idle" });
    set({ crawl: "reading" });
    timer.current = setTimeout(() => {
      const guess = guessProfile(value);
      set({
        crawl: "done",
        pages: guess.pages,
        profile: {
          name: guess.name,
          industry: guess.industry,
          market: guess.market,
          contentLanguage: guess.contentLanguage,
          description: guess.description,
        },
      });
    }, CRAWL_MS);
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const nameMissing = crawl === "done" && !profile.name.trim();
  const domainError = touched && domain && !validDomain ? t("domainInvalid") : undefined;

  const status =
    crawl === "reading" ? (
      <span className="flex items-center gap-1.5 text-fg-2">
        <Loader2Icon aria-hidden className="size-4 animate-spin" />
        <span className="hidden sm:inline">{t("reading")}</span>
      </span>
    ) : crawl === "done" ? (
      <span className="flex items-center gap-1.5 text-success">
        <CheckIcon aria-hidden className="size-4" strokeWidth={2.2} />
        <span className="hidden num sm:inline">{t("read", { pages })}</span>
      </span>
    ) : undefined;

  const setProfile = (patch: Partial<typeof profile>) => set({ profile: { ...profile, ...patch } });

  return (
    <StepFrame
      step="brand"
      title={t("title")}
      description={t("description")}
      hint={t("hint")}
      continueDisabled={crawl !== "done" || nameMissing}
      onContinue={() => {
        complete("brand");
        router.push("/onboarding/competitors");
      }}
    >
      <FormField label={t("website")} error={domainError}>
        {(props) => (
          <DomainInput
            {...props}
            size="lg"
            autoFocus
            value={domain}
            status={status}
            onBlur={() => setTouched(true)}
            onChange={(value) => {
              set({ domain: value });
              startCrawl(value);
            }}
          />
        )}
      </FormField>
      <p aria-live="polite" className="sr-only">
        {crawl === "reading" ? t("reading") : crawl === "done" ? t("read", { pages }) : ""}
      </p>

      {crawl === "reading" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-5 text-body text-fg-2">
          <OrbitAvatar size={24} />
          {t("readingLong")}
        </div>
      )}

      {crawl === "done" && (
        <section
          aria-labelledby="learned"
          className="flex animate-in flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-card duration-320 fade-in-0 slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-2.5">
            <OrbitAvatar size={24} />
            <h2 id="learned" className="text-h3">
              {t("learned")}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("name")} error={nameMissing ? t("nameRequired") : undefined}>
              {(props) => (
                <Input {...props} value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} />
              )}
            </FormField>
            <SelectField
              label={t("industry")}
              value={profile.industry}
              onChange={(v) => setProfile({ industry: v as Industry })}
              options={industries.map((i) => ({ value: i, label: t(`industries.${i}`) }))}
            />
            <SelectField
              label={t("market")}
              value={profile.market}
              onChange={(market) => setProfile({ market })}
              options={markets.map((m) => ({ value: m, label: regions.of(m) ?? m }))}
            />
            <SelectField
              label={t("contentLanguage")}
              helper={t("contentLanguageHelper")}
              value={profile.contentLanguage}
              onChange={(contentLanguage) => setProfile({ contentLanguage })}
              options={contentLanguages.map((l) => ({ value: l, label: languages.of(l) ?? l }))}
            />
          </div>
          <FormField label={t("descriptionLabel")} helper={t("descriptionHelper")}>
            {(props) => (
              <Input
                {...props}
                value={profile.description}
                maxLength={160}
                placeholder={t("descriptionPlaceholder")}
                onChange={(e) => setProfile({ description: e.target.value })}
              />
            )}
          </FormField>
        </section>
      )}
    </StepFrame>
  );
}
