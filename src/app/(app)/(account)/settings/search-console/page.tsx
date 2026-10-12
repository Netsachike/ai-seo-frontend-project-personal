import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SearchConsoleReturn } from "./search-console-return";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("searchConsoleReturn");
  return { title: t("metaTitle") };
}

/** The backend's Google OAuth callback redirects here (`FRONTEND_URL/settings/search-console?connected=1`). */
export default function SearchConsoleReturnPage() {
  return (
    <Suspense>
      <SearchConsoleReturn />
    </Suspense>
  );
}
