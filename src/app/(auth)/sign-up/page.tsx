import { getTranslations } from "next-intl/server";

import { SignUpForm } from "./sign-up-form";

export async function generateMetadata() {
  const t = await getTranslations("auth.signUp");
  return { title: t("metaTitle") };
}

export default function SignUpPage() {
  return <SignUpForm />;
}
