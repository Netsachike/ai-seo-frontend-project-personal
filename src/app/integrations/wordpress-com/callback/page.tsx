import { Suspense } from "react";

import { WpcomCallbackView } from "./wpcom-callback-view";

/** WordPress.com OAuth return page. The backend's WordPress.com redirect URI must point here. */
export default function WordpressComCallbackPage() {
  return (
    <Suspense>
      <WpcomCallbackView />
    </Suspense>
  );
}
