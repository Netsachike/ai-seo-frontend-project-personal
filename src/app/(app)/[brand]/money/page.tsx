import { getTranslations } from "next-intl/server";

import { MoneyView } from "./money-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("money") };
}

export default function MoneyPagesPage() {
  return <MoneyView />;
}
