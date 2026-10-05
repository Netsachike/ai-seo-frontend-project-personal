import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { isOnboardingStep } from "@/features/onboarding/data";
import { BrandStep } from "./brand-step";
import { CompetitorsStep } from "./competitors-step";
import { ConnectStep } from "./connect-step";
import { KeywordsStep } from "./keywords-step";
import { ScanStep } from "./scan-step";

export async function generateMetadata({ params }: PageProps<"/onboarding/[step]">) {
  const { step } = await params;
  if (!isOnboardingStep(step)) return {};
  const t = await getTranslations("onboarding");
  return { title: t(`steps.${step}`) };
}

export default async function OnboardingStepPage({ params }: PageProps<"/onboarding/[step]">) {
  const { step } = await params;
  if (!isOnboardingStep(step)) notFound();
  switch (step) {
    case "brand":
      return <BrandStep />;
    case "competitors":
      return <CompetitorsStep />;
    case "keywords":
      return <KeywordsStep />;
    case "connect":
      return <ConnectStep />;
    case "scan":
      return <ScanStep />;
  }
}
