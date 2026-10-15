import { getTranslations } from "next-intl/server";

import { ContentView } from "./content-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("calendar") };
}

export default function Page() {
  return <ContentView />;
}
