"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, FilePenLineIcon, SaveIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { ArticleWithRelations } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { contentKeys, opportunityKeys } from "@/lib/api/query-keys";
import articleService from "@/services/articles";
import opportunityService from "@/services/opportunities";
import { useArticle, useSaveArticle, useWriteArticle } from "@/features/content/hooks";
import { siteLanguage } from "@/features/sites/site-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/brand/error-state";
import { ArticleEditor } from "@/components/editor/article-editor";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";

const META_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 160;

/**
 * Edit for an action-plan card: the article behind the opportunity (matched
 * by keyword), edited in place and saved with `PUT /articles/{id}`. When
 * Rankoya hasn't written it yet, it can write it here first.
 */
export function OpportunityEditSheet({
  siteId,
  id,
  onClose,
}: {
  siteId: number;
  id: number | null;
  onClose: () => void;
}) {
  const t = useTranslations("actions.edit");
  const { brandSlug } = useShell();
  const opportunity = useQuery({
    queryKey: opportunityKeys.detail(siteId, id ?? 0),
    enabled: Boolean(id),
    queryFn: async () => (await opportunityService.get(siteId, id as number)).data,
  });
  const keywordId = opportunity.data?.keyword_id ?? null;
  const articles = useQuery({
    queryKey: contentKeys.articles(siteId),
    enabled: Boolean(id && keywordId),
    queryFn: async () => (await articleService.list(siteId, { per_page: 100 })).data.data,
  });
  const match = keywordId ? articles.data?.find((a) => a.keyword_id === keywordId) : undefined;
  const write = useWriteArticle(siteId);
  const pending = opportunity.isPending || (Boolean(keywordId) && articles.isPending);

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="end" className="gap-0 overflow-y-auto data-[side=end]:max-w-[760px]">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{opportunity.data?.title ?? t("title")}</SheetTitle>
          <SheetDescription>{opportunity.data?.recommended_action ?? t("description")}</SheetDescription>
        </SheetHeader>

        {pending ? (
          <div className="p-5">
            <Skeleton className="h-96" />
          </div>
        ) : opportunity.isError || articles.isError ? (
          <div className="p-5">
            <ErrorState compact onRetry={() => void Promise.all([opportunity.refetch(), articles.refetch()])} />
          </div>
        ) : match ? (
          <ArticleForm key={match.id} siteId={siteId} articleId={match.id} />
        ) : keywordId ? (
          <div className="flex flex-col items-start gap-3 p-5">
            <p className="text-small text-fg-2">{t("notWritten")}</p>
            <Button
              variant="agent"
              loading={write.isPending}
              onClick={() =>
                write.mutate(keywordId, {
                  onSuccess: () => toast.success(t("written")),
                  onError: (error) => toast.error(getErrorMessage(error, t("writeFailed"))),
                })
              }
            >
              <FilePenLineIcon />
              {t("write")}
            </Button>
            {write.isPending && <p className="text-caption font-normal text-fg-3">{t("writing")}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 p-5">
            <p className="text-small text-fg-2">{t("noArticle")}</p>
            {opportunity.data?.description && <p className="text-small text-fg">{opportunity.data.description}</p>}
            <Button asChild variant="secondary" size="sm">
              <Link href={brandHref(brandSlug, "audit")}>{t("openAudit")}</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ArticleForm({ siteId, articleId }: { siteId: number; articleId: number }) {
  const t = useTranslations("actions.edit");
  const { brand, brandSlug } = useShell();
  const query = useArticle(siteId, articleId);
  if (query.isPending) {
    return (
      <div className="p-5">
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="p-5">
        <ErrorState compact onRetry={() => query.refetch()} />
      </div>
    );
  }
  return (
    <Fields
      siteId={siteId}
      article={query.data}
      lang={query.data.language ?? (brand ? siteLanguage(brand) : "en")}
      fullEditorHref={brandHref(brandSlug, `articles/${articleId}`)}
      labels={{ open: t("openFull") }}
    />
  );
}

function Fields({
  siteId,
  article,
  lang,
  fullEditorHref,
  labels,
}: {
  siteId: number;
  article: ArticleWithRelations;
  lang: string;
  fullEditorHref: string;
  labels: { open: string };
}) {
  const t = useTranslations("actions.edit");
  const save = useSaveArticle(siteId, article.id);
  const ids = React.useId();
  const [title, setTitle] = React.useState(article.title);
  const [metaTitle, setMetaTitle] = React.useState(article.meta_title ?? "");
  const [metaDescription, setMetaDescription] = React.useState(article.meta_description ?? "");
  const [slug, setSlug] = React.useState(article.slug ?? "");
  const html = React.useRef(article.content ?? "");
  // The editor reports its normalised HTML once on load; that isn't an edit.
  const loaded = React.useRef(false);
  const [dirty, setDirty] = React.useState(false);
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setDirty(true);
    };

  const submit = () =>
    save.mutate(
      {
        title: title.trim(),
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        slug: slug.trim() || null,
        content: html.current,
      },
      {
        onSuccess: () => {
          setDirty(false);
          toast.success(t("saved"));
        },
        onError: (error) => toast.error(getErrorMessage(error, t("saveFailed"))),
      },
    );

  return (
    <>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-title`}>{t("articleTitle")}</Label>
          <Input id={`${ids}-title`} value={title} onChange={(e) => edit(setTitle)(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-meta-title`}>{t("metaTitle")}</Label>
            <Input id={`${ids}-meta-title`} value={metaTitle} onChange={(e) => edit(setMetaTitle)(e.target.value)} />
            <span
              className={
                metaTitle.length > META_TITLE_MAX ? "num text-caption text-warning" : "num text-caption text-fg-3"
              }
            >
              {t("chars", { count: metaTitle.length, max: META_TITLE_MAX })}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-slug`}>{t("slug")}</Label>
            <Input id={`${ids}-slug`} dir="ltr" value={slug} onChange={(e) => edit(setSlug)(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-meta-description`}>{t("metaDescription")}</Label>
          <Textarea
            id={`${ids}-meta-description`}
            value={metaDescription}
            onChange={(e) => edit(setMetaDescription)(e.target.value)}
          />
          <span
            className={
              metaDescription.length > META_DESCRIPTION_MAX
                ? "num text-caption text-warning"
                : "num text-caption text-fg-3"
            }
          >
            {t("chars", { count: metaDescription.length, max: META_DESCRIPTION_MAX })}
          </span>
        </div>
        <ArticleEditor
          content={article.content ?? ""}
          lang={lang}
          label={t("body")}
          onChange={(_text, next) => {
            if (!loaded.current) {
              loaded.current = true;
              html.current = next;
              return;
            }
            if (next === html.current) return;
            html.current = next;
            setDirty(true);
          }}
        />
      </div>
      <SheetFooter className="sticky bottom-0 flex-row items-center justify-between gap-2 border-t border-border bg-surface">
        <Button asChild variant="ghost" size="sm">
          <Link href={fullEditorHref}>
            <ExternalLinkIcon />
            {labels.open}
          </Link>
        </Button>
        <Button variant="primary" onClick={submit} loading={save.isPending} disabled={!dirty || !title.trim()}>
          <SaveIcon />
          {t("save")}
        </Button>
      </SheetFooter>
    </>
  );
}
