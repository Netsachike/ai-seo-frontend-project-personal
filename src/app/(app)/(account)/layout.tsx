import { cookies } from "next/headers";

import { BRAND_COOKIE, SIDEBAR_COOKIE } from "@/lib/store/ui";
import { AppShell } from "@/components/layout/app-shell";
import { PaddleProvider } from "@/providers/paddle-provider";

/**
 * Account-level pages (settings, upgrade, workspace details, resellers,
 * agency) sit outside any one brand but keep the app shell, opened on the
 * last-used site so the sidebar and switcher still work. Without one (or
 * when it has left the active workspace) the shell runs with no site open.
 */
export default async function AccountLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const brandSlug = cookieStore.get(BRAND_COOKIE)?.value ?? "";

  return (
    <AppShell brandSlug={brandSlug} accountMode initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "1"}>
      <PaddleProvider>{children}</PaddleProvider>
    </AppShell>
  );
}
