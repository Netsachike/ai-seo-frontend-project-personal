import { notFound } from "next/navigation";

import { PROVIDERS, isIntegrationProvider } from "@/features/integrations/catalog";
import { IntegrationSelectView } from "./select-view";

/**
 * Landing page for the OAuth popup. The provider's consent screen redirects
 * back here (through the backend) with `?workspace_id=&brand=[&error=]`; the
 * page reports to the window that opened it and closes.
 */
export default async function IntegrationSelectPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ provider }, query] = await Promise.all([params, searchParams]);
  if (!isIntegrationProvider(provider) || PROVIDERS[provider].method !== "oauth") notFound();
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;
  return (
    <IntegrationSelectView
      provider={provider}
      workspaceId={one(query.workspace_id)}
      brand={one(query.brand)}
      error={one(query.error)}
    />
  );
}
