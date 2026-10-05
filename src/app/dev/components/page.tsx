import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Gallery } from "./gallery";

export async function generateMetadata() {
  const t = await getTranslations("dev");
  return { title: t("title") };
}

/** Internal component gallery. Available while mocks are on (local and preview builds). */
export default function ComponentsPage() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") notFound();
  return <Gallery />;
}
