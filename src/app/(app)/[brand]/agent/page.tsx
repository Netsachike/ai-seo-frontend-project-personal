import { getTranslations } from "next-intl/server";

import { AgentView } from "./agent-view";

export async function generateMetadata() {
  const t = await getTranslations("shell.nav.items");
  return { title: t("agent") };
}

export default function Page() {
  return <AgentView />;
}
