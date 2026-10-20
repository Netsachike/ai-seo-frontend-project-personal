"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon, KeyRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ShopifyToken = { storeDomain: string; accessToken: string; expiresIn: number | null };

/**
 * Gets an Admin API access token from a Dev Dashboard app's Client ID and
 * secret, so the user doesn't have to call Shopify themselves. Shopify's
 * endpoint can't be called from the browser, so this goes through
 * `/api/shopify/access-token`. The secret is only used for that one call.
 */
export function ShopifyTokenGenerator({
  defaultDomain = "",
  onToken,
}: {
  defaultDomain?: string;
  onToken: (token: ShopifyToken) => void;
}) {
  const t = useTranslations("integrations.shopifyToken");
  const [storeDomain, setStoreDomain] = React.useState(defaultDomain);
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");

  const generate = useMutation({
    mutationFn: async (): Promise<ShopifyToken> => {
      const response = await fetch("/api/shopify/access-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_domain: storeDomain, client_id: clientId, client_secret: clientSecret }),
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        store_domain?: string;
        access_token?: string;
        expires_in?: number | null;
      } | null;
      if (!response.ok || !data?.access_token) throw new Error(data?.message ?? t("failed"));
      return {
        storeDomain: data.store_domain ?? storeDomain,
        accessToken: data.access_token,
        expiresIn: data.expires_in ?? null,
      };
    },
    onSuccess: (token) => {
      setClientSecret("");
      onToken(token);
    },
  });

  const ready = storeDomain.trim() && clientId.trim() && clientSecret.trim();

  return (
    // A div, not a form: it sits inside the connect forms, and forms can't nest.
    <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-small font-semibold text-fg">{t("title")}</span>
        <span className="text-caption font-normal text-fg-3">{t("body")}</span>
      </div>
      <FormField label={t("storeDomain")} helper={t("storeDomainHelp")}>
        {(props) => (
          <Input
            {...props}
            dir="ltr"
            autoComplete="off"
            placeholder={t("storeDomainPlaceholder")}
            value={storeDomain}
            onChange={(e) => setStoreDomain(e.target.value)}
          />
        )}
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t("clientId")}>
          {(props) => (
            <Input
              {...props}
              dir="ltr"
              autoComplete="off"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          )}
        </FormField>
        <FormField label={t("clientSecret")}>
          {(props) => (
            <PasswordInput
              {...props}
              dir="ltr"
              autoComplete="off"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          )}
        </FormField>
      </div>
      {generate.isError && (
        <p role="alert" className="text-small text-danger">
          {generate.error.message}
        </p>
      )}
      {generate.isSuccess && (
        <p role="status" className="flex items-start gap-2 text-small text-success">
          <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("generated")}
        </p>
      )}
      <Button
        type="button"
        onClick={() => generate.mutate()}
        size="sm"
        variant="secondary"
        className="self-start"
        loading={generate.isPending}
        disabled={!ready}
      >
        <KeyRoundIcon />
        {t("generate")}
      </Button>
    </div>
  );
}
