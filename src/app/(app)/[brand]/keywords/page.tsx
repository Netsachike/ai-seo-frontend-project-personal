import { getTranslations } from "next-intl/server";

import { KeywordsView } from "./keywords-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("keywords") };
}

export default function KeywordsPage() {
  return <KeywordsView />;
}
