import { notFound } from "next/navigation";

import { PROVIDERS, isIntegrationProvider } from "@/features/integrations/catalog";
import { IntegrationDetailsView } from "./integration-details-view";

export default async function IntegrationDetailsPage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isIntegrationProvider(provider) || PROVIDERS[provider].soon) notFound();
  return <IntegrationDetailsView provider={provider} />;
}
