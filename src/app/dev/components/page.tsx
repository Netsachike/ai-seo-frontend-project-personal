import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Gallery } from "./gallery";

export async function generateMetadata() {
  const t = await getTranslations("dev");
  return { title: t("title") };
}

/** Internal component gallery. Development builds only. */
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
