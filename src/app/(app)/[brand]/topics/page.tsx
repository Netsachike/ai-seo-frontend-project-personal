import { redirect } from "next/navigation";

/** The topical map moved into the Keywords page. */
export default async function TopicsRedirect({ params }: PageProps<"/[brand]/topics">) {
  const { brand } = await params;
  redirect(`/${brand}/keywords?view=map`);
}
