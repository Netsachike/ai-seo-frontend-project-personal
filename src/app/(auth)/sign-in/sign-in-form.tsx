"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { signIn } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/errors";
import { isApiConfigured } from "@/services/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { AuthHeading, FormAlert } from "../auth-ui";

export function SignInForm({ next }: { next: string }) {
  const t = useTranslations("auth.signIn");
  const tErr = useTranslations("auth.errors");
  const [error, setError] = React.useState<string | null>(null);

  const schema = z.object({
    email: z.email(tErr("emailInvalid")),
    password: z.string().min(1, tErr("passwordRequired")),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    if (!isApiConfigured) {
      setError(tErr("apiUnavailable"));
      return;
    }
    try {
      await signIn(values);
      window.location.assign(next);
    } catch (err) {
      // 401 carries "Invalid credentials or email not verified"; anything else is shown as the server says it.
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(status === 401 ? tErr("invalidCredentials") : getErrorMessage(err, tErr("generic")));
      form.setFocus("password");
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t("title")} description={t("description")} />
      {/* Google sign-in and sign-up are off for now: accounts are created on the backend.
      <GoogleButton />
      <OrDivider />
      */}
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
              dir="ltr"
              className="text-start"
            />
          )}
        </FormField>
        <FormField
          label={t("password")}
          error={errors.password?.message}
          labelAction={
            <Link href="/forgot-password" className="text-small font-medium text-blue hover:underline">
              {t("forgot")}
            </Link>
          }
        >
          {(props) => (
            <PasswordInput {...props} {...form.register("password")} size="lg" autoComplete="current-password" />
          )}
        </FormField>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
          {t("submit")}
        </Button>
      </form>
      {/* Sign-up is off for now: accounts are created on the backend.
      <p className="text-center text-body text-fg-2">
        {t.rich("noAccount", {
          link: (chunks) => (
            <Link href="/sign-up" className="font-medium text-blue hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
      */}
    </div>
  );
}
