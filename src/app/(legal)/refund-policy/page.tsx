import type { Metadata } from "next";

import { refundPolicy } from "@/content/legal";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: refundPolicy.title, description: refundPolicy.description };

export default function Page() {
  return <LegalPage document={refundPolicy} />;
}
