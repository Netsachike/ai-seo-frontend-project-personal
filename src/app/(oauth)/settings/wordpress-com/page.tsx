import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { WpcomReturn } from "./wpcom-return";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("integrations.wpcom");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * The backend's WordPress.com callback redirects here
 * (`?connected=pending&pending_key=…&site_id=…`); this page forwards on to
 * the setup step or the site's WordPress.com page, where the site is picked.
 */
export default function WordpressComReturnPage() {
  return (
    <Suspense>
      <WpcomReturn />
    </Suspense>
  );
}
