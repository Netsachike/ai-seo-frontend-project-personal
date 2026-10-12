"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  CheckIcon,
  FilePenLineIcon,
  SendIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  MessageSquareTextIcon,
  XIcon,
} from "lucide-react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { ArticleWithRelations } from "@/types/types";
import { fakeRequest } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/errors";
import {
  ITEM_PREFIX,
  isCalendarItemId,
  toArticleDetail,
  useArticle,
  useCalendarItem,
  useSaveArticle,
  useWriteArticle,
} from "@/features/content/hooks";
import { usePublishArticle, usePublishingConnections } from "@/features/publishing/hooks";
import { siteLanguage } from "@/features/sites/site-utils";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/brand/error-state";
import { RankoyaAvatar } from "@/components/brand/logo";
import { ScoreRing } from "@/components/brand/score-ring";
import { StatusBadge } from "@/components/brand/status-badge";
import { ArticleEditor } from "@/components/editor/article-editor";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { brandHref } from "@/components/layout/nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

const META_MAX = 60;
/** `[PRICE]`, `[CUSTOMER NAME]`… left by Rankoya where it needs a fact from you. */
const PLACEHOLDER = /\[[A-Z][A-Z0-9 _-]{1,30}\]/g;

export function ArticleView({ articleId }: { articleId: string }) {
  if (isCalendarItemId(articleId)) return <WriteFromCalendar itemId={Number(articleId.slice(ITEM_PREFIX.length))} />;
  return <LoadArticle articleId={Number(articleId)} />;
}

function LoadArticle({ articleId }: { articleId: number }) {
  const { brand } = useShell();
  const query = useArticle(brand?.id, articleId);
  if (!Number.isInteger(articleId)) notFound();
  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={2} />;
  if (query.isError) {
    if ((query.error as { response?: { status?: number } }).response?.status === 404) notFound();
    return <ErrorState onRetry={() => query.refetch()} />;
  }
  return <Editor key={query.data.id} raw={query.data} />;
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
            onSuccess: (article) => router.replace(brandHref(brandSlug, `content/${article.id}`)),
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
  const tContent = useTranslations("content");
  const format = useFormatter();
  const locale = useLocale();
  const now = useNow({ updateInterval: 30_000 });
  const router = useRouter();
  const { brand, brandSlug, me } = useShell();
  const contentLanguage = raw.language ?? (brand ? siteLanguage(brand) : "en");
  const save = useSaveArticle(brand?.id ?? 0, raw.id);
  const connections = usePublishingConnections(brand?.id);
  const publish = usePublishArticle(brand?.id ?? 0, raw.id);
  const targets = (connections.data ?? []).filter((c) => c.status === "active");
  const [target, setTarget] = React.useState<string>("");
  const targetId = target || (targets[0] ? String(targets[0].id) : "");
  const htmlRef = React.useRef(article.html);
  const languages = new Intl.DisplayNames([locale], { type: "language" });

  const [status, setStatus] = React.useState(article.status);
  const [bodyText, setBodyText] = React.useState("");
  const [shortAnswer, setShortAnswer] = React.useState(article.shortAnswer);
  const [metaTitle, setMetaTitle] = React.useState(article.metaTitle);
  const [slug, setSlug] = React.useState(article.slug);
  const [notify, setNotify] = React.useState(Boolean(me?.telegram?.connected));
  const [savedAt, setSavedAt] = React.useState(article.savedAt);
  const [words, setWords] = React.useState(article.words);
  const [rejecting, setRejecting] = React.useState(false);
  const [revising, setRevising] = React.useState(false);
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
      save.mutate(
        { meta_description: description, meta_title: title, slug: path || null, content: htmlRef.current },
        {
          onSuccess: (saved) => setSavedAt(saved.updated_at),
          onError: (error) => toast.error(getErrorMessage(error, t("saveFailed"))),
        },
      );
    }, 1200);
  };

  const placeholders = [...new Set(`${bodyText} ${shortAnswer} ${metaTitle}`.match(PLACEHOLDER) ?? [])];
  const blocked = placeholders.length > 0;
  const editable = status === "needsApproval" || status === "draft";
  const passed = article.checklist.filter((c) => c.ok).length;
  const score = Math.round(article.score - (blocked ? 4 : 0));

  /** Publishes now through the chosen connection (a manual connection prepares a copy-and-paste version). */
  const approve = () => {
    if (!targetId) return toast.error(t("noTarget"));
    publish.mutate(
      { connection_id: Number(targetId), options: { status: "publish" } },
      {
        onSuccess: (response) => {
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
          <Link href={brandHref(brandSlug, "content")} className="hover:text-fg hover:underline">
            {tContent("title")}
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
          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setRejecting(true)}>
                <XIcon />
                {t("reject")}
              </Button>
              <Button variant="secondary" onClick={() => setRevising(true)}>
                <MessageSquareTextIcon />
                {t("revise")}
              </Button>
              <Button variant="primary" disabled={blocked || !targetId} loading={publish.isPending} onClick={approve}>
                <SendIcon />
                {t("approvePublish")}
              </Button>
            </div>
          )}
        </div>
      </header>

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
            onChange={(text, html) => {
              setBodyText(text);
              setWords(text.split(/\s+/).filter(Boolean).length);
              if (html !== htmlRef.current) {
                htmlRef.current = html;
                touch();
              }
            }}
          />
        </div>

        <aside className="flex flex-col gap-4">
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
                options={targets.map((c) => ({ value: String(c.id), label: c.name }))}
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
            <label className="flex cursor-pointer items-center gap-2.5 text-small text-fg">
              <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
              {t("notify")}
            </label>
          </Card>
        </aside>
      </div>

      <AlertDialog open={rejecting} onOpenChange={setRejecting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rejectTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("rejectDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-ink-fg hover:bg-danger-hover"
              onClick={() => {
                toast(t("rejectedToast"));
                router.push(brandHref(brandSlug, "content"));
              }}
            >
              {t("reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReviseDialog open={revising} onOpenChange={setRevising} />
    </div>
  );
}

function ReviseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("editor");
  const tCommon = useTranslations("common");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [sending, setSending] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!note.trim()) return setError(t("reviseRequired"));
            setSending(true);
            await fakeRequest();
            setSending(false);
            setNote("");
            onOpenChange(false);
            toast.success(t("revisingToast"));
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("reviseTitle")}</DialogTitle>
            <DialogDescription>{t("reviseDescription")}</DialogDescription>
          </DialogHeader>
          <FormField label={t("reviseLabel")} error={error}>
            {(props) => (
              <Textarea
                {...props}
                rows={4}
                value={note}
                placeholder={t("revisePlaceholder")}
                onChange={(e) => {
                  setNote(e.target.value);
                  setError(undefined);
                }}
              />
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={sending}>
              {t("reviseSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
