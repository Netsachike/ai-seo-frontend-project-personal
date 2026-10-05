"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  CalendarCheckIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  MessageSquareTextIcon,
  XIcon,
} from "lucide-react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { fakeRequest } from "@/lib/auth/session";
import { useFakeQuery } from "@/lib/fake-query";
import { articleDetail, type ArticleDetail } from "@/lib/mocks/ui-data-work";
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
import { OrbitAvatar } from "@/components/brand/logo";
import { ScoreRing } from "@/components/brand/score-ring";
import { StatusBadge } from "@/components/brand/status-badge";
import { ArticleEditor } from "@/components/editor/article-editor";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { brandHref } from "@/components/layout/nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

const META_MAX = 60;
/** `[PRICE]`, `[CUSTOMER NAME]`… left by Orbit where it needs a fact from you. */
const PLACEHOLDER = /\[[A-Z][A-Z0-9 _-]{1,30}\]/g;

export function ArticleView({ articleId }: { articleId: string }) {
  const { brand } = useShell();
  const query = useFakeQuery(["article", brand?.id, articleId], () => articleDetail(brand?.id ?? "", articleId), {
    enabled: Boolean(brand),
  });
  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={2} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (!query.data) notFound();
  return <Editor article={query.data} />;
}

function Editor({ article }: { article: ArticleDetail }) {
  const t = useTranslations("editor");
  const tContent = useTranslations("content");
  const format = useFormatter();
  const locale = useLocale();
  const now = useNow({ updateInterval: 30_000 });
  const router = useRouter();
  const { brand, brandSlug, me } = useShell();
  const contentLanguage = brand?.contentLanguage ?? "en";
  const languages = new Intl.DisplayNames([locale], { type: "language" });

  const [status, setStatus] = React.useState(article.status);
  const [bodyText, setBodyText] = React.useState("");
  const [shortAnswer, setShortAnswer] = React.useState(article.shortAnswer);
  const [metaTitle, setMetaTitle] = React.useState(article.metaTitle);
  const [slug, setSlug] = React.useState(article.slug);
  const [date, setDate] = React.useState(article.date);
  const [time, setTime] = React.useState("09:00");
  const [notify, setNotify] = React.useState(Boolean(me?.telegram?.connected));
  const [savedAt, setSavedAt] = React.useState(article.savedAt);
  const [words, setWords] = React.useState(article.words);
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [revising, setRevising] = React.useState(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(saveTimer.current), []);

  const touch = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedAt(new Date().toISOString()), 800);
  };

  const placeholders = [...new Set(`${bodyText} ${shortAnswer} ${metaTitle}`.match(PLACEHOLDER) ?? [])];
  const blocked = placeholders.length > 0;
  const editable = status === "needsApproval" || status === "draft";
  const passed = article.checklist.filter((c) => c.ok).length;
  const score = Math.round(article.score - (blocked ? 4 : 0));

  const approve = async () => {
    setApproving(true);
    await api.POST("/approvals/{approvalId}/decision", {
      params: { path: { approvalId: `apr_${article.id}` } },
      body: { decision: "approve" },
    });
    setApproving(false);
    setStatus("scheduled");
    toast.success(
      t("scheduledToast", {
        date: format.dateTime(new Date(`${date}T${time}:00`), { dateStyle: "medium", timeStyle: "short" }),
      }),
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
              <OrbitAvatar size={18} />
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
              <Button variant="primary" disabled={blocked} loading={approving} onClick={approve}>
                <CalendarCheckIcon />
                {t("approve")}
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
            onChange={(text) => {
              setBodyText(text);
              setWords(text.split(/\s+/).filter(Boolean).length + 980);
              touch();
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
            <SelectField
              label={t("target")}
              value="wordpress"
              onChange={() => undefined}
              options={[{ value: "wordpress", label: t("targetWordpress", { domain: brand?.domain ?? "" }) }]}
            />
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <FormField label={t("date")}>
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    value={date}
                    readOnly={!editable}
                    onChange={(e) => setDate(e.target.value)}
                  />
                )}
              </FormField>
              <FormField label={t("time")}>
                {(props) => (
                  <Input
                    {...props}
                    type="time"
                    value={time}
                    readOnly={!editable}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-28"
                  />
                )}
              </FormField>
            </div>
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
