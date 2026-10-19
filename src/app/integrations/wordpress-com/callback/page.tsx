import { Suspense } from "react";

import { WpcomCallbackView } from "./wpcom-callback-view";

/**
 * WordPress.com's own redirect (`code` + `state`), from before the backend
 * redirected to /settings/wordpress-com. Kept so older redirect URIs still work.
 */
export default function WordpressComCallbackPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-4">
      <Suspense>
        <WpcomCallbackView />
      </Suspense>
    </main>
  );
}
