import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { VerifyForm } from "./verify-form";

export async function generateMetadata() {
  const t = await getTranslations("auth.verify");
  return { title: t("metaTitle") };
}

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const { email, purpose } = await searchParams;
  if (typeof email !== "string" || !email) redirect("/sign-in");
  return <VerifyForm email={email} purpose={purpose === "reset" ? "reset" : "signup"} />;
}
