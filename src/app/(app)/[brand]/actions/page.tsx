import { getTranslations } from "next-intl/server";

import { ActionsView } from "./actions-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("actions") };
}

export default function Page() {
  return <ActionsView />;
}
