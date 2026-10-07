import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { IntegrationsView } from "./integrations-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("integrations");
  return { title: t("title") };
}

export default function IntegrationsPage() {
  return <IntegrationsView />;
}
