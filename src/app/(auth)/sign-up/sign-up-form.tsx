"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { fakeRequest } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { PasswordHints, PasswordInput, passwordIsValid } from "@/components/forms/password-input";
import { AuthHeading, GoogleButton, OrDivider } from "../auth-ui";

/** Creates the account and its first workspace, then asks for the emailed code. */
export function SignUpForm() {
  const t = useTranslations("auth.signUp");
  const tErr = useTranslations("auth.errors");
  const router = useRouter();
  const hintsId = React.useId();

  const schema = z.object({
    name: z.string().trim().min(1, tErr("nameRequired")).max(80, tErr("tooLong")),
    email: z.email(tErr("emailInvalid")),
    password: z.string().refine(passwordIsValid, tErr("passwordWeak")),
    workspace: z.string().trim().min(1, tErr("workspaceRequired")).max(80, tErr("tooLong")),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", workspace: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    await fakeRequest();
    router.push(`/verify?purpose=signup&email=${encodeURIComponent(email)}`);
  });

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t("title")} description={t("description")} />
      <GoogleButton next="/onboarding/brand" />
      <OrDivider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField label={t("name")} error={errors.name?.message}>
          {(props) => <Input {...props} {...form.register("name")} size="lg" autoComplete="name" />}
        </FormField>
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
        <FormField label={t("password")} error={errors.password?.message}>
          {(props) => (
            <div className="flex flex-col gap-2.5">
              <PasswordInput
                {...props}
                {...form.register("password")}
                size="lg"
                autoComplete="new-password"
                aria-describedby={[props["aria-describedby"], hintsId].filter(Boolean).join(" ")}
              />
              <PasswordHints id={hintsId} value={password} />
            </div>
          )}
        </FormField>
        <FormField label={t("workspace")} helper={t("workspaceHelper")} error={errors.workspace?.message}>
          {(props) => (
            <Input
              {...props}
              {...form.register("workspace")}
              size="lg"
              autoComplete="organization"
              placeholder={t("workspacePlaceholder")}
            />
          )}
        </FormField>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
          {t("submit")}
        </Button>
        <p className="text-caption font-normal text-fg-3">
          {t.rich("consent", {
            terms: (chunks) => (
              <a href="#" className="text-fg-2 underline">
                {chunks}
              </a>
            ),
            privacy: (chunks) => (
              <a href="#" className="text-fg-2 underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </form>
      <p className="text-center text-body text-fg-2">
        {t.rich("haveAccount", {
          link: (chunks) => (
            <Link href="/sign-in" className="font-medium text-blue hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
