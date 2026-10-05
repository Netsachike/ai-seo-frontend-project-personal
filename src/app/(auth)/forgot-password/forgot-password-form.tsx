"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { fakeRequest } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { AuthHeading } from "../auth-ui";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const tErr = useTranslations("auth.errors");
  const router = useRouter();
  const schema = z.object({ email: z.email(tErr("emailInvalid")) });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    await fakeRequest();
    router.push(`/verify?purpose=reset&email=${encodeURIComponent(email)}`);
  });

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t("title")} description={t("description")} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField label={t("email")} error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...form.register("email")}
              type="email"
              size="lg"
              autoComplete="email"
              autoFocus
              dir="ltr"
              className="text-start"
            />
          )}
        </FormField>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
          {t("submit")}
        </Button>
      </form>
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 self-center text-body font-medium text-blue hover:underline"
      >
        <ArrowLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
        {t("back")}
      </Link>
    </div>
  );
}
