import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { WorkspaceSiteView } from "./workspace-site-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.site");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function WorkspaceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceSiteView id={decodeURIComponent(id)} />;
}
