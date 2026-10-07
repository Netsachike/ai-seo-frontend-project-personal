import { SitesShell } from "@/components/layout/sites-shell";

export default function SitesLayout({ children }: LayoutProps<"/">) {
  return <SitesShell>{children}</SitesShell>;
}
