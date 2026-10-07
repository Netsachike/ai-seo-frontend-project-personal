import type { Metadata } from "next";

import { privacyPolicy } from "@/content/legal";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: privacyPolicy.title, description: privacyPolicy.description };

export default function Page() {
  return <LegalPage document={privacyPolicy} />;
}
