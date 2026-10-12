"use client";

import * as React from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { NEW_ACCOUNT_START, signUp } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/errors";
import { isApiConfigured } from "@/services/api/api";
import workspaceService from "@/services/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { PasswordHints, PasswordInput, passwordIsValid } from "@/components/forms/password-input";
import { AuthHeading, FormAlert, GoogleButton, OrDivider } from "../auth-ui";

/** Creates the account (signed in straight away) and its first workspace, then starts site setup. */
export function SignUpForm() {
  const t = useTranslations("auth.signUp");
  const tErr = useTranslations("auth.errors");
  const hintsId = React.useId();
  const [error, setError] = React.useState<string | null>(null);

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

  const onSubmit = form.handleSubmit(async ({ name, email, password, workspace }) => {
    setError(null);
    if (!isApiConfigured) {
      setError(tErr("apiUnavailable"));
      return;
    }
    try {
      const session = await signUp({ name, email, password });
      // Register takes no workspace; create the named one only if the backend did not make a default.
      if (session.no_of_workspaces === 0) {
        const slug =
          workspace
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "workspace";
        await workspaceService.createWorkspace({ name: workspace, slug, is_default: 1, logo: null });
      }
      window.location.assign(NEW_ACCOUNT_START);
    } catch (err) {
      setError(getErrorMessage(err, tErr("generic")));
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t("title")} description={t("description")} />
      <GoogleButton />
      <OrDivider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && <FormAlert>{error}</FormAlert>}
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
