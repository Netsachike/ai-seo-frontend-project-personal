import { cookies } from "next/headers";

import { BRAND_COOKIE, SIDEBAR_COOKIE } from "@/lib/store/ui";
import { brandsByWorkspace } from "@/lib/mocks/fixtures";
import { AppShell } from "@/components/layout/app-shell";
import { PaddleProvider } from "@/providers/paddle-provider";

/**
 * Account-level pages (settings, upgrade, workspace details, resellers,
 * agency) sit outside any one brand but keep the app shell, opened on the
 * last-used brand so the sidebar and switcher still work.
 */
export default async function AccountLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const known = Object.values(brandsByWorkspace).flat();
  const saved = cookieStore.get(BRAND_COOKIE)?.value;
  const brandSlug = known.find((b) => b.slug === saved)?.slug ?? known[0].slug;

  return (
    <AppShell brandSlug={brandSlug} initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "1"}>
      <PaddleProvider>{children}</PaddleProvider>
    </AppShell>
  );
}
