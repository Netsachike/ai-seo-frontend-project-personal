import { getTranslations } from "next-intl/server";

import { IssueView } from "./issue-view";

export async function generateMetadata() {
  const t = await getTranslations("audit.issue");
  return { title: t("metaTitle") };
}

export default async function IssuePage({ params }: PageProps<"/[brand]/audit/[issueId]">) {
  const { issueId } = await params;
  return <IssueView issueId={issueId} />;
}
