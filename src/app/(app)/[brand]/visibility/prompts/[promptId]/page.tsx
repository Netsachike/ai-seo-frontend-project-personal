import { getTranslations } from "next-intl/server";

import { PromptView } from "./prompt-view";

export async function generateMetadata() {
  const t = await getTranslations("prompt");
  return { title: t("metaTitle") };
}

export default async function PromptPage({ params }: PageProps<"/[brand]/visibility/prompts/[promptId]">) {
  const { promptId } = await params;
  return <PromptView promptId={promptId} />;
}
