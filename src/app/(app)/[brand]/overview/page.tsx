import { getTranslations } from "next-intl/server";

import { OverviewView } from "./overview-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("overview") };
}

export default function OverviewPage() {
  return <OverviewView />;
}
