"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { fakeRequest, startSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { AuthHeading, FormAlert, GoogleButton, OrDivider } from "../auth-ui";

/** UI stage: any email and password signs in, except this password, which shows the error state. */
const DEMO_WRONG_PASSWORD = "wrong-password";

export function SignInForm({ next }: { next: string }) {
  const t = useTranslations("auth.signIn");
  const tErr = useTranslations("auth.errors");
  const [failed, setFailed] = React.useState(false);

  const schema = z.object({
    email: z.email(tErr("emailInvalid")),
    password: z.string().min(1, tErr("passwordRequired")),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setFailed(false);
    await fakeRequest();
    if (password === DEMO_WRONG_PASSWORD) {
      setFailed(true);
      form.setFocus("password");
      return;
    }
    startSession();
    window.location.assign(next);
  });

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t("title")} description={t("description")} />
      <GoogleButton next={next} />
      <OrDivider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {failed && <FormAlert>{tErr("invalidCredentials")}</FormAlert>}
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
      <p className="text-center text-body text-fg-2">
        {t.rich("noAccount", {
          link: (chunks) => (
            <Link href="/sign-up" className="font-medium text-blue hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
