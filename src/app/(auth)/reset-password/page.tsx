import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ResetPasswordForm } from "./reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  // The URL carries a reset token: never index it.
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Opened from the reset email: `/reset-password?token=…&email=…`. */
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
