import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BRAND_COOKIE } from "@/lib/store/ui";
import { RootRedirect } from "./root-redirect";

/** Signed in (proxy.ts guarantees it): open the last brand, or work out which one. */
export default async function Home() {
  const brand = (await cookies()).get(BRAND_COOKIE)?.value;
  if (brand) redirect(`/${brand}/overview`);
  return <RootRedirect />;
}
