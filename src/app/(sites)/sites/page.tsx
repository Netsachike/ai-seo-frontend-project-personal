import { getTranslations } from "next-intl/server";

import { SitesView } from "@/features/sites/sites-view";

export async function generateMetadata() {
  const t = await getTranslations("sites");
  return { title: t("metaTitle") };
}

export default function SitesPage() {
  return <SitesView />;
}
