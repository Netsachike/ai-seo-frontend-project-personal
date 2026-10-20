"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  FilePenLineIcon,
  LoaderCircleIcon,
  SendIcon,
} from "lucide-react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { ArticleWithRelations, PublishingConnection } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import {
  ITEM_PREFIX,
  isCalendarItemId,
  toArticleDetail,
  useArticle,
  isStillWriting,
  useCalendarItem,
  useSaveArticle,
  useWriteArticle,
} from "@/features/content/hooks";
import {
  isManualPublication,
  useArticlePublications,
  usePublishArticle,
  usePublishingConnections,
  useShopifyBlogs,
  type PublishMode,
} from "@/features/publishing/hooks";
import { siteLanguage } from "@/features/sites/site-utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/brand/error-state";
import { EmptyState } from "@/components/brand/empty-state";
import { RankoyaAvatar } from "@/components/brand/logo";
import { PlatformLogo } from "@/components/brand/platform-logo";
import { ScoreRing } from "@/components/brand/score-ring";
import { StatusBadge } from "@/components/brand/status-badge";
import { ArticleEditor } from "@/components/editor/article-editor";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { brandHref } from "@/components/layout/nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";
import {
  InternalLinksCard,
  ManualPublishCard,
  ManualPublishFields,
  PublicationCard,
  internalLinksOf,
} from "./publish-panels";

/** Where a connection publishes to, when the API tells us (Webflow and Shopify connections don't). */
const connectionUrl = (c: PublishingConnection) =>
  typeof c.config?.site_url === "string" ? c.config.site_url.replace(/^https?:\/\//, "").replace(/\/$/, "") : undefined;

const META_MAX = 60;
/** The backend refuses to publish an article that is still being written or failed to write. */
const UNPUBLISHABLE = new Set(["generating", "publishing", "failed"]);
/** `[PRICE]`, `[CUSTOMER NAME]`… left by Rankoya where it needs a fact from you. */
const PLACEHOLDER = /\[[A-Z][A-Z0-9 _-]{1,30}\]/g;

export function ArticleView({ articleId }: { articleId: string }) {
  if (isCalendarItemId(articleId)) return <WriteFromCalendar itemId={Number(articleId.slice(ITEM_PREFIX.length))} />;
  return <LoadArticle articleId={Number(articleId)} />;
}

function LoadArticle({ articleId }: { articleId: number }) {
  const t = useTranslations("editor");
  const tNav = useTranslations("shell.nav.items");
  const { brand, brandSlug } = useShell();
  const query = useArticle(brand?.id, articleId);
  if (!Number.isInteger(articleId)) notFound();
  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={2} />;
  if (query.isError) {
    if ((query.error as { response?: { status?: number } }).response?.status === 404) notFound();
    return <ErrorState onRetry={() => query.refetch()} />;
  }
  if (isStillWriting(query.data)) return <StillWriting />;
  if (!query.data.content)
    return (
      <EmptyState
        icon={FilePenLineIcon}
        title={t("failedTitle")}
        description={query.data.error_message ?? t("failedBody")}
        action={
          <Button asChild variant="primary">
            <Link href={brandHref(brandSlug, "articles")}>{tNav("articles")}</Link>
          </Button>
        }
      />
    );
  return <Editor key={query.data.id} raw={query.data} />;
}

/** The article exists but its body hasn't come back yet; the query checks again every few seconds. */
function StillWriting() {
  const t = useTranslations("editor");
  return (
    <Card role="status" className="max-w-[720px] flex-row items-center gap-4">
      <LoaderCircleIcon aria-hidden className="size-5 shrink-0 animate-spin text-blue" />
      <div className="flex flex-col gap-0.5">
        <h1 className="text-h3 text-fg">{t("stillWritingTitle")}</h1>
        <p className="text-small text-fg-2">{t("stillWritingBody")}</p>
      </div>
    </Card>
  );
}

/** A planned entry with no article yet: research its keyword, then write it. */
function WriteFromCalendar({ itemId }: { itemId: number }) {
  const t = useTranslations("editor");
  const router = useRouter();
  const { brand, brandSlug } = useShell();
  const item = useCalendarItem(brand?.id, itemId);
  const write = useWriteArticle(brand?.id ?? 0);
  if (!brand || item.isPending) return <PageSkeleton kpis={0} panels={1} />;
  if (item.isError) return <ErrorState onRetry={() => item.refetch()} />;
  if (!item.data) notFound();
  const keywordId = item.data.keyword_id;

  return (
    <Card className="max-w-[720px] gap-4">
      <span className="text-overline text-fg-3">{t("plannedLabel")}</span>
      <h1 className="text-h1 text-fg">{item.data.title}</h1>
      {item.data.keyword && (
        <p className="text-small text-fg-2">{t("plannedKeyword", { keyword: item.data.keyword })}</p>
      )}
      <p className="text-body text-fg-2">{t("writeBody")}</p>
      {write.isError && (
        <p role="alert" className="text-small text-danger">
          {getErrorMessage(write.error, t("writeFailed"))}
        </p>
      )}
      <Button
        variant="primary"
        className="self-start"
        disabled={!keywordId}
        loading={write.isPending}
        onClick={() =>
          keywordId &&
          write.mutate(keywordId, {
            onSuccess: (article) => router.replace(brandHref(brandSlug, `articles/${article.id}`)),
          })
        }
      >
        <FilePenLineIcon />
        {write.isPending ? t("writing") : t("write")}
      </Button>
    </Card>
  );
}

function Editor({ raw }: { raw: ArticleWithRelations }) {
  const article = toArticleDetail(raw);
  const t = useTranslations("editor");
  const tNav = useTranslations("shell.nav.items");
  const format = useFormatter();
  const locale = useLocale();
  const now = useNow({ updateInterval: 30_000 });
  const { brand, brandSlug, me } = useShell();
  const contentLanguage = raw.language ?? (brand ? siteLanguage(brand) : "en");
  const save = useSaveArticle(brand?.id ?? 0, raw.id);
  const connections = usePublishingConnections(brand?.id);
  const publish = usePublishArticle(brand?.id ?? 0, raw.id);
  const publications = useArticlePublications(brand?.id, raw.id);
  const latestPublication = publications.data?.[0];
  const liveUrl =
    latestPublication?.published_url ??
    (typeof raw.metadata?.published_url === "string" ? raw.metadata.published_url : null);
  const manualReady = latestPublication ? isManualPublication(latestPublication) : false;
  const targets = (connections.data ?? []).filter((c) => c.status === "active");
  const [target, setTarget] = React.useState<string>("");
  const targetId = target || (targets[0] ? String(targets[0].id) : "");
  const targetConnection = targets.find((c) => String(c.id) === targetId);
  const isManualTarget = targetConnection?.method === "manual";
  const [mode, setMode] = React.useState<PublishMode>("publish");
  // Shopify publishes into one of the store's blogs.
  const isShopify = targetConnection?.platform === "shopify" && !isManualTarget;
  const shopifyBlogs = useShopifyBlogs(brand?.id, isShopify ? targetConnection?.id : undefined);
  const [blogChoice, setBlogChoice] = React.useState<string>("");
  const savedBlog = typeof targetConnection?.config?.blog_id === "string" ? targetConnection.config.blog_id : "";
  const blogId = blogChoice || savedBlog || shopifyBlogs.data?.[0]?.id || "";
  const htmlRef = React.useRef(article.html);
  // The live body, for the copy-and-paste panel (the ref feeds the debounced save).
  const [html, setHtml] = React.useState(article.html);
  const internalLinks = React.useMemo(
    () => internalLinksOf(raw, html, brand?.domain ?? ""),
    [raw, html, brand?.domain],
  );
  const languages = new Intl.DisplayNames([locale], { type: "language" });

  const [status, setStatus] = React.useState(article.status);
  const [bodyText, setBodyText] = React.useState("");
  const [shortAnswer, setShortAnswer] = React.useState(article.shortAnswer);
  const [metaTitle, setMetaTitle] = React.useState(article.metaTitle);
  const [slug, setSlug] = React.useState(article.slug);
  const [notify, setNotify] = React.useState(Boolean(me?.telegram?.connected));
  const [savedAt, setSavedAt] = React.useState(article.savedAt);
  const [words, setWords] = React.useState(article.words);
  // The server rewrites internal links on save; its body is shown once the user has stopped typing.
  const [serverBody, setServerBody] = React.useState<{ html: string; version: number } | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(saveTimer.current), []);

  /** Debounced draft save: the backend snapshots a revision before each update. */
  const latest = React.useRef({ shortAnswer, metaTitle, slug });
  React.useEffect(() => {
    latest.current = { shortAnswer, metaTitle, slug };
  });
  const touch = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { shortAnswer: description, metaTitle: title, slug: path } = latest.current;
      const sent = htmlRef.current;
      save.mutate(
        { meta_description: description, meta_title: title, slug: path || null, content: sent },
        {
          onSuccess: (saved) => {
            setSavedAt(saved.updated_at);
            // Only if nothing was typed since this save went out; otherwise the next save brings it.
            if (saved.content && saved.content !== sent && htmlRef.current === sent)
              setServerBody((prev) => ({ html: saved.content as string, version: (prev?.version ?? 0) + 1 }));
          },
          onError: (error) => toast.error(getErrorMessage(error, t("saveFailed"))),
        },
      );
    }, 1200);
  };

  const placeholders = [...new Set(`${bodyText} ${shortAnswer} ${metaTitle}`.match(PLACEHOLDER) ?? [])];
  const blocked = placeholders.length > 0;
  const editable = status === "needsApproval" || status === "draft";
  const publishable = editable && !UNPUBLISHABLE.has(raw.status);
  const passed = article.checklist.filter((c) => c.ok).length;
  const score = Math.round(article.score - (blocked ? 4 : 0));

  /** Publishes now through the chosen connection (a manual connection prepares a copy-and-paste version). */
  const approve = () => {
    if (!targetId) return toast.error(t("noTarget"));
    if (isShopify && !blogId) return toast.error(t("shopify.pickBlog"));
    const asDraft = mode === "draft" && !isManualTarget;
    publish.mutate(
      {
        connection_id: Number(targetId),
        options: { status: asDraft ? "draft" : "publish", ...(isShopify ? { blog_id: blogId } : {}) },
      },
      {
        onSuccess: (response) => {
          if (isManualPublication(response.data)) {
            toast.success(t("manualToast"));
            return;
          }
          if (response.data.status === "failed") {
            toast.error(response.data.error_message ?? t("publishFailed"));
            return;
          }
          if (asDraft) {
            toast.success(t("draftToast", { connection: targetConnection?.name ?? "" }));
            return;
          }
          setStatus("published");
          toast.success(response.message ?? t("publishedToast"));
        },
        onError: (error) => toast.error(getErrorMessage(error, t("publishFailed"))),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <nav aria-label={t("breadcrumb")} className="flex items-center gap-1.5 text-small text-fg-2">
          <Link href={brandHref(brandSlug, "articles")} className="hover:text-fg hover:underline">
            {tNav("articles")}
          </Link>
          <ChevronRightIcon aria-hidden className="size-3.5 text-fg-3 rtl:-scale-x-100" />
          <span aria-current="page" className="truncate">
            {article.title}
          </span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-[72ch] min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              <Badge variant="outline">
                {t("writtenIn", { language: languages.of(contentLanguage) ?? contentLanguage })}
              </Badge>
            </div>
            <h1 lang={contentLanguage} dir="auto" className="text-h1 text-fg">
              {article.title}
            </h1>
            <p className="flex flex-wrap items-center gap-1.5 text-small text-fg-2">
              <RankoyaAvatar size={18} />
              {t("byline", {
                words: format.number(words, "integer"),
                when: format.relativeTime(new Date(savedAt), now),
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {liveUrl && (
              <Button asChild variant="secondary">
                <a href={liveUrl} target="_blank" rel="noreferrer">
                  <ExternalLinkIcon />
                  {t("viewLive")}
                </a>
              </Button>
            )}
            {publishable && !isManualTarget && (
              <Button variant="primary" disabled={blocked || !targetId} loading={publish.isPending} onClick={approve}>
                <SendIcon />
                {manualReady
                  ? t("publishAgain")
                  : mode === "draft" && !isManualTarget
                    ? t("sendDraft")
                    : t("approvePublish")}
              </Button>
            )}
          </div>
        </div>
      </header>

      {raw.status === "generating" && (
        <p role="status" className="flex items-center gap-2.5 rounded-lg bg-blue-bg px-4 py-3 text-small text-fg">
          <LoaderCircleIcon aria-hidden className="size-4 shrink-0 animate-spin text-blue" />
          {t("generating")}
        </p>
      )}
      {raw.status === "failed" && (
        <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger-bg px-4 py-3 text-small text-danger">
          <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          {raw.error_message ?? t("generationFailed")}
        </p>
      )}

      {blocked && editable && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg bg-warning-bg px-4 py-3 text-small text-fg">
          <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            {t.rich("placeholders", {
              count: placeholders.length,
              list: format.list(placeholders, { type: "conjunction" }),
              code: (chunks) => <code className="rounded-sm bg-surface px-1 font-mono text-[12px]">{chunks}</code>,
            })}
          </p>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section
            aria-labelledby="short-answer"
            className="flex flex-col gap-2 rounded-lg border border-s-4 border-border border-s-signal bg-surface p-4 shadow-card"
          >
            <Label htmlFor="short-answer-input" id="short-answer" className="text-overline text-fg-3">
              {t("shortAnswer")}
            </Label>
            <Textarea
              id="short-answer-input"
              lang={contentLanguage}
              dir="auto"
              value={shortAnswer}
              readOnly={!editable}
              rows={3}
              onChange={(e) => {
                setShortAnswer(e.target.value);
                touch();
              }}
              className="min-h-0 resize-none border-0 bg-transparent p-0 text-body-lg read-only:bg-transparent read-only:text-fg focus-visible:outline-none!"
            />
            <p className="text-caption font-normal text-fg-3">{t("shortAnswerHelp")}</p>
          </section>
          <ArticleEditor
            content={article.html}
            lang={contentLanguage}
            label={t("bodyLabel")}
            domain={brand?.domain ?? ""}
            sync={serverBody}
            onSynced={(text, html) => {
              setBodyText(text);
              setWords(text.split(/\s+/).filter(Boolean).length);
              htmlRef.current = html;
              setHtml(html);
            }}
            onChange={(text, html) => {
              setBodyText(text);
              setWords(text.split(/\s+/).filter(Boolean).length);
              if (html !== htmlRef.current) {
                htmlRef.current = html;
                setHtml(html);
                touch();
              }
            }}
          />
        </div>

        <aside className="flex flex-col gap-4">
          {publications.data && <PublicationCard publications={publications.data} />}
          {manualReady && !isManualTarget && (
            <ManualPublishCard
              title={article.title}
              metaTitle={metaTitle}
              metaDescription={shortAnswer}
              slug={slug}
              html={html}
              lang={contentLanguage}
              domain={brand?.domain}
            />
          )}
          <Card>
            <div className="flex items-center gap-4">
              <ScoreRing score={score} label={t("score")} size="sm" />
              <div className="flex flex-col">
                <CardTitle>{t("score")}</CardTitle>
                <span className="num text-caption font-normal text-fg-3">
                  {t("checksPassed", { passed, total: article.checklist.length })}
                </span>
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {article.checklist.map((c) => (
                <li key={c.key} className="flex items-start gap-2 text-small">
                  {c.ok ? (
                    <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                  )}
                  <span className={c.ok ? "text-fg-2" : "text-fg"}>{t(`checklist.${c.key}`)}</span>
                  <span className="sr-only">{c.ok ? t("passed") : t("toImprove")}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="gap-5">
            <CardTitle>{t("publishTitle")}</CardTitle>
            <FormField
              label={t("metaTitle")}
              error={metaTitle.length > META_MAX ? t("metaTooLong", { max: META_MAX }) : undefined}
              labelAction={
                <span className={cn("num text-caption", metaTitle.length > META_MAX ? "text-danger" : "text-fg-3")}>
                  {t("counter", { count: metaTitle.length, max: META_MAX })}
                </span>
              }
            >
              {(props) => (
                <Input
                  {...props}
                  lang={contentLanguage}
                  dir="auto"
                  value={metaTitle}
                  readOnly={!editable}
                  onChange={(e) => {
                    setMetaTitle(e.target.value);
                    touch();
                  }}
                />
              )}
            </FormField>
            <FormField label={t("url")} helper={t("urlHelper", { domain: brand?.domain ?? "" })}>
              {(props) => (
                <Input
                  {...props}
                  dir="ltr"
                  value={slug}
                  readOnly={!editable}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9/-]+/g, "-"))}
                  className="font-mono text-[13px]"
                />
              )}
            </FormField>
            {targets.length > 0 ? (
              <SelectField
                label={t("target")}
                value={targetId}
                onChange={setTarget}
                options={targets.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                  detail: connectionUrl(c),
                  icon: (
                    <PlatformLogo
                      platform={c.platform === "wordpress_com" ? "wordpressCom" : c.platform}
                      size={16}
                      className="size-4 shrink-0 rounded-[3px]"
                    />
                  ),
                }))}
              />
            ) : (
              <p className="text-small text-fg-2">
                {t.rich("noTargetHelp", {
                  link: (chunks) => (
                    <Link
                      href={brandHref(brandSlug, "integrations?tab=platforms")}
                      className="text-blue hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            )}
            {isShopify && (
              <div className="flex flex-col gap-1.5">
                {shopifyBlogs.isPending ? (
                  <span className="text-caption font-normal text-fg-3">{t("shopify.loading")}</span>
                ) : shopifyBlogs.isError ? (
                  <p role="alert" className="text-caption font-normal text-danger">
                    {getErrorMessage(shopifyBlogs.error, t("shopify.failed"))}
                  </p>
                ) : shopifyBlogs.data.length === 0 ? (
                  <p className="text-caption font-normal text-warning">{t("shopify.none")}</p>
                ) : (
                  <SelectField
                    label={t("shopify.blog")}
                    helper={t("shopify.blogHelp")}
                    value={blogId}
                    onChange={setBlogChoice}
                    options={shopifyBlogs.data.map((b) => ({
                      value: b.id,
                      label: b.title,
                      detail: `/blogs/${b.handle}`,
                    }))}
                  />
                )}
              </div>
            )}
            {targets.length > 0 && !isManualTarget && (
              <div className="flex flex-col gap-1.5">
                <span className="text-small font-medium text-fg">{t("mode.label")}</span>
                <Tabs value={mode} onValueChange={(v) => setMode(v as PublishMode)}>
                  <TabsList variant="segmented" aria-label={t("mode.label")} className="w-full">
                    <TabsTrigger value="publish" className="flex-1">
                      {t("mode.publish")}
                    </TabsTrigger>
                    <TabsTrigger value="draft" className="flex-1">
                      {t("mode.draft")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <span className="text-caption font-normal text-fg-3">
                  {mode === "draft" ? t("mode.draftHelp") : t("mode.publishHelp")}
                </span>
              </div>
            )}
            {/* Copy and paste (Next.js, any other site): nothing to approve, the article is copied from here. */}
            {isManualTarget ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-small font-semibold text-fg">{t("manual.inlineTitle")}</span>
                  <span className="text-caption font-normal text-fg-3">{t("manual.inlineBody")}</span>
                </div>
                {blocked && (
                  <p role="alert" className="text-caption font-normal text-warning">
                    {t("manual.placeholders")}
                  </p>
                )}
                <ManualPublishFields
                  title={article.title}
                  metaTitle={metaTitle}
                  metaDescription={shortAnswer}
                  slug={slug}
                  html={html}
                  lang={contentLanguage}
                  domain={brand?.domain}
                />
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2.5 text-small text-fg">
                <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
                {t("notify")}
              </label>
            )}
          </Card>

          <InternalLinksCard links={internalLinks} domain={brand?.domain ?? ""} />
        </aside>
      </div>
    </div>
  );
}
