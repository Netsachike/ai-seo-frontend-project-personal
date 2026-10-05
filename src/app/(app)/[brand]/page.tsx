import { redirect } from "next/navigation";

export default async function BrandIndex({ params }: PageProps<"/[brand]">) {
  const { brand } = await params;
  redirect(`/${brand}/overview`);
}
