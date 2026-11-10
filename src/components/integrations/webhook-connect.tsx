"use client";

import * as React from "react";
import { CheckCircle2Icon, ChevronDownIcon, EyeIcon, SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { useCreateConnection } from "@/features/publishing/hooks";
import { builderPrompt, newWebhookSecret, sendWebhookTest, type WebhookProvider } from "@/features/publishing/webhook";
import { CopyButton } from "@/components/brand/copy-button";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";

/**
 * Make, Lovable and Replit: the user gives a URL, Rankoya sends a signed test
 * article to it, and only once that arrives can the connection be saved
 * (platform `custom`, method `webhook`, config.provider). Lovable and Replit
 * get a prompt that builds the receiving endpoint and the blog pages.
 */
export function WebhookConnect({
  provider,
  site,
  name,
  onSaved,
}: {
  provider: WebhookProvider;
  site: Site;
  name: string;
  onSaved: () => void;
}) {
  const t = useTranslations("integrations.webhook");
  const createConnection = useCreateConnection(site.id);
  const [secret] = React.useState(newWebhookSecret);
  const [url, setUrl] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // The URL that passed the test; editing the URL means testing again.
  const [testedUrl, setTestedUrl] = React.useState<string | null>(null);
  const tested = testedUrl !== null && testedUrl === url.trim();
  const isBuilder = provider !== "make";
  const prompt = builderPrompt();
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const test = async () => {
    setError(null);
    setTesting(true);
    const result = await sendWebhookTest({ siteId: site.id, url, secret });
    setTesting(false);
    if (result.ok) {
      setTestedUrl(url.trim());
      return;
    }
    setTestedUrl(null);
    setError(
      // Make answers 410 when no scenario is listening on the webhook.
      result.error === "webhook_rejected" && result.status === 410 && provider === "make"
        ? t("errors.make_not_listening")
        : result.error === "webhook_rejected"
          ? t("errors.webhook_rejected", { status: result.status ?? 0 })
          : t(`errors.${result.error}`),
    );
  };

  const save = () => {
    setError(null);
    createConnection.mutate(
      {
        name: `${name} · ${site.domain}`,
        platform: "custom",
        method: "webhook",
        credentials: { webhook_url: url.trim(), secret },
        config: { provider },
      },
      {
        onSuccess: () => {
          toast.success(t("saved", { name }));
          onSaved();
        },
        onError: (err) => setError(getErrorMessage(err, t("errors.save"))),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {isBuilder && (
        <Collapsible
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          className="flex flex-col gap-2 rounded-md border border-border p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-small font-semibold text-fg">{t("promptTitle", { name })}</p>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button type="button" size="sm" variant="ghost" className="group">
                  <EyeIcon />
                  {previewOpen ? t("hidePrompt") : t("previewPrompt")}
                  <ChevronDownIcon className="transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CopyButton value={prompt} label={t("copyPrompt")} />
            </div>
          </div>
          <p className="text-small text-fg-2">{t("promptBody", { name })}</p>
          <CollapsibleContent>
            <pre
              dir="ltr"
              tabIndex={0}
              aria-label={t("promptTitle", { name })}
              className="max-h-72 overflow-y-auto rounded-md bg-surface-2 p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-fg"
            >
              {prompt}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex flex-col gap-2 rounded-md border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-small font-semibold text-fg">{t("secretTitle")}</p>
          <CopyButton value={secret} label={t("copySecret")} />
        </div>
        <code dir="ltr" className="truncate rounded bg-surface-2 px-2 py-1.5 font-mono text-[12px] text-fg">
          {secret}
        </code>
        <p className="text-caption font-normal text-fg-3">{isBuilder ? t("secretBuilder") : t("secretMake")}</p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (url.trim()) void test();
        }}
      >
        <FormField label={t(`urlLabel.${provider}`)} helper={t("urlHelper")}>
          {(props) => (
            <Input
              {...props}
              dir="ltr"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          )}
        </FormField>

        {tested && (
          <p className="flex items-center gap-2 rounded-md bg-success-bg/40 px-3 py-2.5 text-small text-fg">
            <CheckCircle2Icon aria-hidden className="size-4 shrink-0 text-success" />
            {t("delivered")}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2.5 text-small text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="submit" variant={tested ? "secondary" : "primary"} loading={testing} disabled={!url.trim()}>
            <SendIcon />
            {tested ? t("testAgain") : t("test")}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!tested}
            loading={createConnection.isPending}
            onClick={save}
          >
            {t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
