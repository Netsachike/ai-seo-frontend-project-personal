import { redirect } from "next/navigation";

/** The content plan moved to the Content calendar page. */
export default async function ContentRedirect({ params }: PageProps<"/[brand]/content">) {
  const { brand } = await params;
  redirect(`/${brand}/calendar`);
}
