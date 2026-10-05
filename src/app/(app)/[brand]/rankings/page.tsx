import { getTranslations } from "next-intl/server";

import { RankingsView } from "./rankings-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("rankings") };
}

export default function RankingsPage() {
  return <RankingsView />;
}
