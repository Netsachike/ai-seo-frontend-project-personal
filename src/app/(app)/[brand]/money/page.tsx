import { redirect } from "next/navigation";

import { brandHref } from "@/components/layout/nav";

/** Money pages are a tab on Site audit now; old links land there. */
export default async function MoneyPagesPage({ params }: PageProps<"/[brand]/money">) {
  const { brand } = await params;
  redirect(brandHref(brand, "audit?view=money"));
}
