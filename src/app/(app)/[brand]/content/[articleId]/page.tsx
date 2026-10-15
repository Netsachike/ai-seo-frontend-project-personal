import { redirect } from "next/navigation";

/** Articles moved to /articles; old links (and calendar items) still land on them. */
export default async function ArticleRedirect({ params }: PageProps<"/[brand]/content/[articleId]">) {
  const { brand, articleId } = await params;
  redirect(`/${brand}/articles/${articleId}`);
}
