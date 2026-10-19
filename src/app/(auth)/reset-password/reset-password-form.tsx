"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { getErrorMessage } from "@/lib/errors";
import { isApiConfigured } from "@/services/api/api";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { AuthHeading, FormAlert } from "../auth-ui";

/**
 * Step 2 of the reset, opened from the emailed link
 * (`/reset-password?token=…&email=…`). The email comes from the link and
 * can't be changed. Password rules are the backend's: its message is shown
 * as is. The reset doesn't sign the user in.
 */
export function ResetPasswordForm() {
  const t = useTranslations("auth.reset");
  const tErr = useTranslations("auth.errors");
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const schema = z
    .object({
      password: z.string().min(1, t("passwordRequired")),
      confirm: z.string().min(1, t("passwordRequired")),
    })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: t("mismatch") });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password, confirm }) => {
    setError(null);
    if (!isApiConfigured) {
      setError(tErr("apiUnavailable"));
      return;
    }
    try {
      await authService.resetPassword({ email, token, password, password_confirmation: confirm });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, t("failed")));
    }
  });

  if (!token || !email) {
    return (
      <div className="flex flex-col gap-6">
        <AuthHeading title={t("invalidTitle")} description={t("invalidBody")} />
        <Button asChild variant="primary" size="lg" className="w-full">
          <Link href="/forgot-password">{t("requestNew")}</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <span className="grid size-12 place-items-center rounded-full bg-success-bg text-success">
          <CircleCheckIcon aria-hidden className="size-6" />
        </span>
        <AuthHeading title={t("doneTitle")} description={t("doneBody")} />
        <Button variant="primary" size="lg" className="w-full" onClick={() => router.push("/sign-in")}>
          {t("continue")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t("title")} description={t("description")} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && (
          <FormAlert>
            {error}{" "}
            <Link href="/forgot-password" className="font-medium underline">
              {t("requestNew")}
            </Link>
          </FormAlert>
        )}
        <FormField label={t("email")}>
          {(props) => (
            <Input {...props} value={email} readOnly size="lg" dir="ltr" className="text-start text-fg-2" />
          )}
        </FormField>
        <FormField label={t("password")} error={errors.password?.message}>
          {(props) => (
            <PasswordInput {...props} {...form.register("password")} size="lg" autoComplete="new-password" autoFocus />
          )}
        </FormField>
        <FormField label={t("confirm")} error={errors.confirm?.message}>
          {(props) => <PasswordInput {...props} {...form.register("confirm")} size="lg" autoComplete="new-password" />}
        </FormField>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}
