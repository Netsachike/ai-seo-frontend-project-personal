import { getTranslations } from "next-intl/server";

import { TopicsView } from "./topics-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("topics") };
}

export default function TopicsPage() {
  return <TopicsView />;
}
