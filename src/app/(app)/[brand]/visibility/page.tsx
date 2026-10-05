import { getTranslations } from "next-intl/server";

import { VisibilityView } from "./visibility-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("visibility") };
}

export default function VisibilityPage() {
  return <VisibilityView />;
}
