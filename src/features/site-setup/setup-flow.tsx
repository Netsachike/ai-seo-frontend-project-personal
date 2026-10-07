"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { SITE_SETUP_STEPS, type Brand, type SiteSetupStep } from "@/lib/api/types";
import { workspaceKeys } from "@/lib/api/query-keys";
import { faviconFor, getSite, nameFromDomain, updateSite } from "@/lib/mocks/store";
import { useUiStore } from "@/lib/store/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { crawledName } from "./fake-ai";
import { useStepNav } from "./hooks/use-step-nav";
import { Interstitial } from "./shell/interstitial";
import { StepTransition } from "./shell/step-transition";
import { SITES_PATH } from "./steps";
import { patchDraft } from "./store";
import { BillingStep } from "./steps/billing-step";
import { CoreTopicsStep } from "./steps/core-topics/core-topics-step";
import { DetailsStep } from "./steps/details/details-step";
import { DoneStep } from "./steps/done-step";
import { GscStep } from "./steps/gsc-step";
import { IntegrationStep } from "./steps/integration-step";
import { PreferencesStep } from "./steps/preferences-step";
import { topicsQuery } from "./topics-query";

/** "Setting up your site" stays up at least this long. */
const INTERSTITIAL_MIN_MS = 900;

const order = (step: SiteSetupStep) => SITE_SETUP_STEPS.indexOf(step);
export const siteSetupKey = (siteId: string) => ["site-setup", siteId, "site"] as const;

/**
 * Steps 2b–8 for one site, inside the persistent setup shell. The step comes
 * from the URL; moving on saves progress to the site first, then pushes the
 * next URL, so a refresh or a later visit resumes at the furthest step
 * reached. Jumping ahead of it by URL lands back on it.
 */
export function SetupFlow({ siteId }: { siteId: string }) {
  const t = useTranslations("siteSetup.flow");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { step, direction, go } = useStepNav(siteId);
  const query = useQuery({ queryKey: siteSetupKey(siteId), queryFn: () => getSite(siteId) });
  const [interstitial, setInterstitial] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const site = query.data?.site;
  const workspaceId = query.data?.workspaceId;
  const current: SiteSetupStep = step === "account" ? "details" : step;

  React.useEffect(() => {
    if (!site) return;
    if (!site.setupStep) {
      router.replace(`/${site.slug}/overview`);
    } else if (order(current) > order(site.setupStep)) {
      go(site.setupStep, { replace: true });
    }
  }, [site, current, go, router]);

  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-h1 text-fg">{t("notFound.title")}</h1>
        <p className="text-body-lg text-fg-2">{t("notFound.body")}</p>
        <Button asChild variant="primary">
          <Link href={SITES_PATH}>{t("notFound.cta")}</Link>
        </Button>
      </div>
    );
  }

  if (!site || !workspaceId) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const save = async (patch: Partial<Omit<Brand, "id" | "slug">>) => {
    const updated = await updateSite(siteId, patch);
    queryClient.setQueryData(siteSetupKey(siteId), { site: updated, workspaceId });
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.brands(workspaceId) });
    return updated;
  };

  /** Records the furthest step reached, then moves to `next`. */
  const advance = async (next: SiteSetupStep, patch: Partial<Brand> = {}) => {
    const furthest = site.setupStep && order(site.setupStep) > order(next) ? site.setupStep : next;
    await save({ ...patch, setupStep: furthest });
    go(next);
  };

  const finishDetails = async ({ country, language }: { country: string; language: string }) => {
    setBusy(true);
    const named = { ...site, name: crawledName(site) };
    // Topic generation starts now, so step 4 often opens with topics ready.
    void queryClient.prefetchQuery(topicsQuery(named));
    setInterstitial(true);
    await Promise.all([
      advance("google-search-console", { name: named.name, market: country, contentLanguage: language }),
      new Promise((resolve) => setTimeout(resolve, INTERSTITIAL_MIN_MS)),
    ]);
    setInterstitial(false);
    setBusy(false);
  };

  const changeDomain = async (domain: string) => {
    await save({ domain, faviconUrl: faviconFor(domain), name: nameFromDomain(domain), setupStep: "details" });
    patchDraft(siteId, {
      description: null,
      descriptionConfirmed: false,
      audience: null,
      audienceConfirmed: false,
      country: null,
      language: null,
      topicSuggestions: null,
      coreTopics: [],
    });
    return null;
  };

  // Clearing setupStep marks the site finished; the guard above then opens its dashboard.
  const finish = async () => {
    setBusy(true);
    const ui = useUiStore.getState();
    ui.setWorkspace(workspaceId);
    ui.setBrand(site.slug);
    await save({ setupStep: null });
  };

  const body = (() => {
    if (interstitial) return <Interstitial />;
    switch (current) {
      case "details":
        return (
          <DetailsStep site={site} onChangeDomain={changeDomain} onComplete={finishDetails} completing={busy} />
        );
      case "google-search-console":
        return <GscStep site={site} onContinue={() => void advance("core-topics")} />;
      case "core-topics":
        return <CoreTopicsStep site={site} onContinue={() => void advance("billing")} />;
      case "billing":
        return <BillingStep site={site} onContinue={() => void advance("integration")} />;
      case "integration":
        return <IntegrationStep site={site} onContinue={() => void advance("preferences")} />;
      case "preferences":
        return <PreferencesStep site={site} onContinue={() => void advance("done")} />;
      case "done":
        return <DoneStep site={site} finishing={busy} onFinish={() => void finish()} />;
    }
  })();

  return (
    <StepTransition stepKey={interstitial ? "interstitial" : current} direction={direction}>
      {body}
    </StepTransition>
  );
}
