import { getTranslations } from "next-intl/server";

import { AuthorityView } from "./authority-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("authority") };
}

export default function AuthorityPage() {
  return <AuthorityView />;
}
