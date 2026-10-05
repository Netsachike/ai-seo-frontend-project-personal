import { getTranslations } from "next-intl/server";

import { AuditView } from "./audit-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("audit") };
}

export default function AuditPage() {
  return <AuditView />;
}
