import { getTranslations } from "next-intl/server";

import { ArticleView } from "./article-view";

export async function generateMetadata() {
  const t = await getTranslations("editor");
  return { title: t("metaTitlePage") };
}

export default async function ArticlePage({ params }: PageProps<"/[brand]/articles/[articleId]">) {
  const { articleId } = await params;
  return <ArticleView articleId={articleId} />;
}
