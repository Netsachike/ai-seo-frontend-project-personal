import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { WpcomCallbackView } from "@/app/integrations/wordpress-com/callback/wpcom-callback-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("integrations.wpcom");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * The backend's WordPress.com callback redirects here:
 * `/settings/wordpress-com?connected=pending&pending_key=…&sites_id=…`.
 * The user picks the WordPress.com site, and the connection is created and tested.
 */
export default function WordpressComReturnPage() {
  return (
    <div className="grid place-items-center py-10">
      <Suspense>
        <WpcomCallbackView />
      </Suspense>
    </div>
  );
}
