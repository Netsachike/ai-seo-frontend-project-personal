import { getTranslations } from "next-intl/server";

import { ONBOARDING_START, safeNext } from "@/lib/auth/session";
import { SignInForm } from "./sign-in-form";

export async function generateMetadata() {
  const t = await getTranslations("auth.signIn");
  return { title: t("metaTitle") };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  // Every login runs onboarding before the dashboard, unless a deep link says otherwise.
  return <SignInForm next={typeof next === "string" ? safeNext(next) : ONBOARDING_START} />;
}
