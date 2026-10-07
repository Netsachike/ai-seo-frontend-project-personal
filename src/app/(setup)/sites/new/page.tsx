import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { DomainStep } from "@/features/site-setup/steps/domain-step";

export async function generateMetadata() {
  const t = await getTranslations("siteSetup.domain");
  return { title: t("metaTitle") };
}

export default function NewSitePage() {
  return (
    <Suspense>
      <DomainStep />
    </Suspense>
  );
}
