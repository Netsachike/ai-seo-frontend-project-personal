import { getTranslations } from "next-intl/server";

import { safeNext } from "@/lib/auth/session";
import { SignInForm } from "./sign-in-form";

export async function generateMetadata() {
  const t = await getTranslations("auth.signIn");
  return { title: t("metaTitle") };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  return <SignInForm next={safeNext(typeof next === "string" ? next : null)} />;
}
