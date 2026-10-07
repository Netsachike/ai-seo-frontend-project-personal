import { redirect } from "next/navigation";

import { setupPath } from "@/features/site-setup/steps";

export default async function SetupIndex({ params }: PageProps<"/sites/[siteId]/setup">) {
  const { siteId } = await params;
  redirect(setupPath(siteId, "details"));
}
