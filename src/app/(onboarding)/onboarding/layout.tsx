import { OnboardingShell } from "@/components/layout/onboarding-shell";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return <OnboardingShell>{children}</OnboardingShell>;
}
