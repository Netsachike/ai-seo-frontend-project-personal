"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { SITE_SETUP_STEPS, type SiteSetupStep } from "@/types/types";
import { useUiStore } from "@/lib/store/ui";
import contentPlannerService from "@/services/content-planner";
import keywordService from "@/services/keywords";
import { useSite, useWorkspaces } from "@/features/workspace/hooks";
import { siteSlug } from "@/features/sites/site-utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStepNav } from "./hooks/use-step-nav";
import { setSetupStep, useSetupStep } from "./progress";
import { Interstitial } from "./shell/interstitial";
import { StepTransition } from "./shell/step-transition";
import { SITES_PATH } from "./steps";
import { useSetupStore } from "./store";
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
const thisMonth = () => new Date().toISOString().slice(0, 7);

/**
 * Steps 2b–8 for one site, inside the persistent setup shell. The site comes
 * from `GET /sites/{site}`; the step from the URL. Moving on records the
 * furthest step reached (in this browser, see progress.ts), then pushes the
 * next URL, so a refresh resumes at it. Jumping ahead by URL lands back on it.
 */
export function SetupFlow({ siteId: siteParam }: { siteId: string }) {
  const t = useTranslations("siteSetup.flow");
  const router = useRouter();
  const queryClient = useQueryClient();
  const siteId = Number(siteParam);
  const { step, direction, go } = useStepNav(siteParam);
  const query = useSite(Number.isInteger(siteId) ? siteId : undefined);
  const workspaces = useWorkspaces();
  const furthest = useSetupStep(siteId);
  const [interstitial, setInterstitial] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const site = query.data;
  const current: SiteSetupStep = step === "account" ? "details" : step;

  React.useEffect(() => {
    if (!site) return;
    if (!furthest) {
      router.replace(`/${siteSlug(site)}/overview`);
    } else if (order(current) > order(furthest)) {
      go(furthest, { replace: true });
    }
  }, [site, furthest, current, go, router]);

  if (query.isError || !Number.isInteger(siteId)) {
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

  if (!site) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  /** Records the furthest step reached, then moves to `next`. */
  const advance = (next: SiteSetupStep) => {
    if (!furthest || order(next) > order(furthest)) setSetupStep(site.id, next);
    go(next);
  };

  const finishDetails = async () => {
    setBusy(true);
    // Topic discovery starts now, so step 4 often opens with topics ready.
    void queryClient.prefetchQuery(topicsQuery(site));
    setInterstitial(true);
    await new Promise((resolve) => setTimeout(resolve, INTERSTITIAL_MIN_MS));
    advance("google-search-console");
    setInterstitial(false);
    setBusy(false);
  };

  /**
   * Generates this month's content plan from the preferences step, then
   * marks setup finished; the guard above opens the dashboard.
   */
  const finish = async () => {
    setBusy(true);
    const draft = useSetupStore.getState().drafts[site.id];
    const preferences = draft?.preferences;
    // The backend has no field for core topics, so they go in as seed keywords the plan can draw on.
    const coreTopics = (draft?.topicSuggestions ?? [])
      .filter((topic) => draft?.coreTopics.includes(topic.id))
      .map((topic) => topic.label.trim().slice(0, 200))
      .filter((label) => label.length >= 2);
    if (coreTopics.length > 0) {
      try {
        await keywordService.discover(site.id, { seed_keywords: coreTopics });
      } catch {
        // The plan still generates from the keywords the site already has.
      }
    }
    try {
      await contentPlannerService.generate(site.id, {
        month: thisMonth(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cadence: "weekly",
        articles_target: Math.max(1, Math.min(100, (preferences?.articlesPerWeek ?? 2) * 4)),
        autopilot_enabled: preferences?.publishMode === "auto",
      });
    } catch {
      // The plan can be generated later from the content calendar; setup still finishes.
    }
    const ui = useUiStore.getState();
    const workspaceId = workspaces.data?.active?.work_space_id;
    if (workspaceId) ui.setWorkspace(String(workspaceId));
    ui.setBrand(siteSlug(site));
    setSetupStep(site.id, null);
  };

  const body = (() => {
    if (interstitial) return <Interstitial />;
    switch (current) {
      case "details":
        return <DetailsStep site={site} onComplete={() => void finishDetails()} completing={busy} />;
      case "google-search-console":
        return <GscStep site={site} onContinue={() => advance("core-topics")} />;
      case "core-topics":
        return <CoreTopicsStep site={site} onContinue={() => advance("billing")} />;
      case "billing":
        return <BillingStep site={site} onContinue={() => advance("integration")} />;
      case "integration":
        return <IntegrationStep site={site} onContinue={() => advance("preferences")} />;
      case "preferences":
        return <PreferencesStep site={site} onContinue={() => advance("done")} />;
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
