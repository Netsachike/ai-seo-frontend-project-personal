import { getTranslations } from "next-intl/server";

import { ToolsView } from "./tools-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("tools") };
}

export default function ToolsPage() {
  return <ToolsView />;
}
