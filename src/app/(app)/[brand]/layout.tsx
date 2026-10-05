import { cookies } from "next/headers";

import { SIDEBAR_COOKIE } from "@/lib/store/ui";
import { AppShell } from "@/components/layout/app-shell";

export default async function BrandLayout({ children, params }: LayoutProps<"/[brand]">) {
  const [{ brand }, cookieStore] = await Promise.all([params, cookies()]);
  return (
    <AppShell brandSlug={decodeURIComponent(brand)} initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "1"}>
      {children}
    </AppShell>
  );
}
