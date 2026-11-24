"use client";

// Make connects as a saved webhook connection (platform `make`) and publishes from the article page.
import * as React from "react";
import { CheckCircle2Icon, ChevronDownIcon, EyeIcon, PlugZapIcon /* , SendIcon */ } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
// import { useArticlesPage } from "@/features/content/hooks";
import { useCreateConnection } from "@/features/publishing/hooks";
import {
  builderPrompt,
  newWebhookSecret,
  // publishToWebhook,
  readWebhookUrl,
  rememberWebhookUrl,
  sendWebhookTest,
  type WebhookProvider,
  type WebhookResult,
} from "@/features/publishing/webhook";
import { CopyButton } from "@/components/brand/copy-button";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Make, Lovable and Replit: the user gives a URL and Rankoya sends a test
 * article to it. Lovable and Replit get a prompt that builds the receiving
 * endpoint and the blog pages, sign every request with a secret, and save the
 * connection (platform `custom`, method `webhook`, config.provider).
 *
 * Make: one "Connect" button. It saves the webhook as a connection
 * (platform `make`, method `webhook`, credentials.webhook_url,
 * config.send_full_content) and the backend's /test activates it. Articles are
 * then published to it from the article page like any other connection.
 * No signing secret for Make.
 */
export function WebhookConnect({
  provider,
  site,
  name,
  onSaved,
  onDelivered,
}: {
  provider: WebhookProvider;
  site: Site;
  name: string;
  onSaved: () => void;
  /** A test or an article reached the webhook (site setup uses it to let the user continue). */
  onDelivered?: () => void;
}) {
  const t = useTranslations("integrations.webhook");
  const createConnection = useCreateConnection(site.id);
  const isBuilder = provider !== "make";
  const [builderSecret] = React.useState(newWebhookSecret);
  // Make's signing secret is off for now: its requests go unsigned.
  const secret = isBuilder ? builderSecret : undefined;
  const [url, setUrl] = React.useState(() => readWebhookUrl(site.id, provider));
  // Read by the manual test button, which is commented out below.
  const [, setTesting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // The URL that passed the test; editing the URL means testing again.
  const [testedUrl, setTestedUrl] = React.useState<string | null>(null);
  const tested = testedUrl !== null && testedUrl === url.trim();
  const prompt = builderPrompt();
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Make: the connection was saved and passed the backend's test.
  const [connected, setConnected] = React.useState(false);

  // Sending one article from here is off: Make is a saved connection now and publishes from the article page.
  // const articles = useArticlesPage(site.id, 1);
  // const written = (articles.data?.data ?? []).filter((a) => a.status !== "generating");
  // const [articleId, setArticleId] = React.useState("");
  // const [publishing, setPublishing] = React.useState(false);
  // const [sentTitle, setSentTitle] = React.useState<string | null>(null);

  const failure = (result: Extract<WebhookResult, { ok: false }>) =>
    // Make answers 410 when no scenario is listening on the webhook.
    result.error === "webhook_rejected" && result.status === 410 && provider === "make"
      ? t("errors.make_not_listening")
      : result.error === "webhook_rejected"
        ? t("errors.webhook_rejected", { status: result.status ?? 0 })
        : t(`errors.${result.error}`);

  const test = async () => {
    setError(null);
    setTesting(true);
    const result = await sendWebhookTest({ siteId: site.id, url, secret });
    setTesting(false);
    if (result.ok) {
      setTestedUrl(url.trim());
      rememberWebhookUrl(site.id, provider, url.trim());
      onDelivered?.();
      return;
    }
    setTestedUrl(null);
    setError(failure(result));
  };

  /** Make: save the webhook as a connection; the backend tests it and makes it active. */
  const connectMake = () => {
    const webhookUrl = url.trim();
    if (!webhookUrl) return;
    setError(null);
    setConnected(false);
    createConnection.mutate(
      {
        name: `${name} · ${site.domain}`,
        platform: "make",
        method: "webhook",
        credentials: { webhook_url: webhookUrl },
        config: { send_full_content: true },
      },
      {
        onSuccess: () => {
          rememberWebhookUrl(site.id, provider, webhookUrl);
          setConnected(true);
          toast.success(t("saved", { name }));
          onDelivered?.();
          onSaved();
        },
        onError: (err) => setError(getErrorMessage(err, t("errors.connect"))),
      },
    );
  };

  /* Sending one article from the modal (stopgap), off now that Make publishes from the article page.
  const publish = async () => {
    const article = written.find((a) => String(a.id) === articleId);
    if (!article || !url.trim()) return;
    setError(null);
    setSentTitle(null);
    setPublishing(true);
    const result = await publishToWebhook({ siteId: site.id, articleId: article.id, url, secret });
    setPublishing(false);
    if (result.ok) {
      rememberWebhookUrl(site.id, provider, url.trim());
      setSentTitle(article.title);
      toast.success(t("published", { name }));
      onDelivered?.();
      return;
    }
    setError(failure(result));
  };
  */

  const save = () => {
    if (!secret) return;
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

      {/* The signing secret is off for Make for now (its requests go unsigned); Lovable and Replit still use it.
          To bring it back for Make, show this block for every provider and pass the secret for Make above. */}
      {secret && (
        <div className="flex flex-col gap-2 rounded-md border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-small font-semibold text-fg">{t("secretTitle")}</p>
            <CopyButton value={secret} label={t("copySecret")} />
          </div>
          <code dir="ltr" className="truncate rounded bg-surface-2 px-2 py-1.5 font-mono text-[12px] text-fg">
            {secret}
          </code>
          <p className="text-caption font-normal text-fg-3">{t("secretBuilder")}</p>
        </div>
      )}

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!url.trim()) return;
          if (isBuilder) void test();
          else connectMake();
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
              onChange={(event) => {
                setUrl(event.target.value);
                setConnected(false);
              }}
            />
          )}
        </FormField>

        {/* Article picker, off: Make publishes from the article page now.
        <FormField label={t("articleLabel")} helper={t("articleHelper")}>
          {(props) => (
            <Select value={articleId} onValueChange={setArticleId} disabled={written.length === 0}>
              <SelectTrigger {...props} className="w-full">
                <SelectValue
                  placeholder={
                    articles.isPending
                      ? t("articleLoading")
                      : written.length === 0
                        ? t("articleEmpty")
                        : t("articlePlaceholder")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {written.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        */}

        {isBuilder && tested && (
          <p className="flex items-center gap-2 rounded-md bg-success-bg/40 px-3 py-2.5 text-small text-fg">
            <CheckCircle2Icon aria-hidden className="size-4 shrink-0 text-success" />
            {t("delivered")}
          </p>
        )}
        {!isBuilder && connected && (
          <p className="flex items-center gap-2 rounded-md bg-success-bg/40 px-3 py-2.5 text-small text-fg">
            <CheckCircle2Icon aria-hidden className="size-4 shrink-0 text-success" />
            {t("connectedMake", { name })}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2.5 text-small text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {/* Manual "Send test article" is off: connections are tested automatically on their details page.
          Lovable and Replit (the only builders) don't use this form any more; Enter still runs the test.
          {isBuilder ? (
            <Button type="submit" variant="secondary" loading={testing} disabled={!url.trim()}>
              <SendIcon />
              {tested ? t("testAgain") : t("test")}
            </Button>
          ) : ( */}
          {!isBuilder && (
            <Button type="submit" variant="primary" loading={createConnection.isPending} disabled={!url.trim()}>
              <PlugZapIcon />
              {t("testAndConnect")}
            </Button>
          )}
          {/* Sending one article from here is off: Make publishes from the article page now.
          <Button type="button" variant="primary" loading={publishing} disabled={!url.trim() || !articleId || testing} onClick={() => void publish()}>
            <UploadIcon />
            {t("publish", { name })}
          </Button> */}
          {/* Make saves through "Connect" above; Lovable and Replit save after their test. */}
          {isBuilder && (
            <Button
              type="button"
              variant="secondary"
              disabled={!tested}
              loading={createConnection.isPending}
              onClick={save}
            >
              {t("save")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
