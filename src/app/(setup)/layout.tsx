import { SetupShell } from "@/features/site-setup/shell/setup-shell";

/**
 * Site setup, from domain entry to done. One layout for both routes, so
 * going from /sites/new to /sites/{id}/setup/details keeps the frame mounted.
 */
export default function SetupLayout({ children }: LayoutProps<"/">) {
  return <SetupShell>{children}</SetupShell>;
}
