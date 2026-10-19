"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeftIcon, MailCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { isApiConfigured } from "@/services/api/api";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { AuthHeading, FormAlert } from "../auth-ui";

/**
 * Step 1 of the reset: `POST /password/forgot` emails a link to
 * `/reset-password?token=…&email=…`. The user stays signed out throughout.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const tErr = useTranslations("auth.errors");
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);
  const schema = z.object({ email: z.email(tErr("emailInvalid")) });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;

  const send = async (email: string) => {
    if (!isApiConfigured) throw new Error(tErr("apiUnavailable"));
    await authService.forgotPassword({ email });
  };

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await send(email.trim());
      setSentTo(email.trim());
    } catch (err) {
      setError(getErrorMessage(err, tErr("generic")));
    }
  });

  const resend = async () => {
    if (!sentTo || resending) return;
    setResending(true);
    try {
      await send(sentTo);
      toast.success(t("resent"));
    } catch (err) {
      toast.error(getErrorMessage(err, tErr("generic")));
    } finally {
      setResending(false);
    }
  };

  const back = (
    <Link
      href="/sign-in"
      className="inline-flex items-center gap-1.5 self-center text-body font-medium text-blue hover:underline"
    >
      <ArrowLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
      {t("back")}
    </Link>
  );

  if (sentTo) {
    return (
      <div className="flex flex-col gap-6">
        <span className="grid size-12 place-items-center rounded-full bg-blue-bg text-blue">
          <MailCheckIcon aria-hidden className="size-6" />
        </span>
        <AuthHeading
          title={t("sentTitle")}
          description={t.rich("sentBody", {
            email: sentTo,
            strong: (chunks) => <strong className="font-semibold text-fg">{chunks}</strong>,
          })}
        />
        <p className="text-small text-fg-2">{t("sentHelp")}</p>
        <Button variant="secondary" size="lg" className="w-full" loading={resending} onClick={resend}>
          {t("resend")}
        </Button>
        {back}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t("title")} description={t("description")} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && <FormAlert>{error}</FormAlert>}
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
          {isSubmitting ? t("sending") : t("submit")}
        </Button>
      </form>
      {back}
    </div>
  );
}
