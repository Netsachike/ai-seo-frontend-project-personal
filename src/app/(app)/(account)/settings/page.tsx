import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SettingsView } from "./settings-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.settings");
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default function SettingsPage() {
  return <SettingsView />;
}
