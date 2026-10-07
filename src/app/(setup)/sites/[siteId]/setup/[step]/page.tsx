import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { isSetupStep } from "@/features/site-setup/steps";
import { SetupFlow } from "@/features/site-setup/setup-flow";

export async function generateMetadata({ params }: PageProps<"/sites/[siteId]/setup/[step]">) {
  const { step } = await params;
  if (!isSetupStep(step)) return {};
  const t = await getTranslations("siteSetup.flow.titles");
  return { title: t(step) };
}

/**
 * Validates the step only. The site lives in the browser-side mock for now,
 * so SetupFlow loads it and sends a jump-ahead back to the furthest step
 * reached; with the real API that check moves here, before render.
 */
export default async function SetupStepPage({ params }: PageProps<"/sites/[siteId]/setup/[step]">) {
  const { siteId, step } = await params;
  if (!isSetupStep(step)) notFound();
  return <SetupFlow siteId={siteId} />;
}
