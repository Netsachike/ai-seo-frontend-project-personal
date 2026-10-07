import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UpgradeView } from "./upgrade-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.upgrade");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default function UpgradePage() {
  return <UpgradeView />;
}
