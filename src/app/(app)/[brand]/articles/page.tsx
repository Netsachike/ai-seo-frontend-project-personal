import { getTranslations } from "next-intl/server";

import { ArticlesView } from "./articles-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("articles") };
}

export default function ArticlesPage() {
  return <ArticlesView />;
}
