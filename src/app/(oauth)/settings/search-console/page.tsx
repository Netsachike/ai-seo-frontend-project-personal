import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SearchConsoleReturn } from "./search-console-return";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("searchConsoleReturn");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** The backend's Google callback redirects here (`?connected={siteId}`); this page forwards on. */
export default function SearchConsoleReturnPage() {
  return (
    <Suspense>
      <SearchConsoleReturn />
    </Suspense>
  );
}
