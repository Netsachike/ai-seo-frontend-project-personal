import { getTranslations } from "next-intl/server";

import { CompetitorsView } from "./competitors-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("competitors") };
}

export default function CompetitorsPage() {
  return <CompetitorsView />;
}
