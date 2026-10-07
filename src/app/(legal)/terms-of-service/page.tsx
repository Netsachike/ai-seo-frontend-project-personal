import type { Metadata } from "next";

import { termsOfService } from "@/content/legal";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: termsOfService.title, description: termsOfService.description };

export default function Page() {
  return <LegalPage document={termsOfService} />;
}
