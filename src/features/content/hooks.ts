"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, format as formatDate, parse } from "date-fns";

import type { ArticleWithRelations, ContentCalendarItem, UpdateArticlePayload } from "@/types/types";
import type { ArticleDetail, ArticleStatus, ArticleSummary } from "@/lib/mocks/ui-data-work";
import { contentKeys } from "@/lib/api/query-keys";
import { toNumber } from "@/services/api/helpers";
import articleResearchService from "@/services/article-research";
import articleService from "@/services/articles";
import contentPlannerService from "@/services/content-planner";

/** Calendar items without an article yet open as `item-{id}`, where Rankoya can write them. */
export const ITEM_PREFIX = "item-";
export const isCalendarItemId = (id: string) => id.startsWith(ITEM_PREFIX);

export function articleStatusOf(status: string): ArticleStatus {
  if (status === "published") return "published";
  if (status === "publishing") return "scheduled";
  if (status === "draft") return "needsApproval";
  return "draft";
}

/** The article's SEO score, when the backend's analysis includes one. */
const scoreOf = (article: ArticleWithRelations) => {
  const analysis = article.seo_analysis as Record<string, unknown> | null;
  return Math.round(toNumber((analysis?.score ?? analysis?.overall_score) as string | number | undefined) ?? 0);
};

function summaryOf(item: ContentCalendarItem, article: ArticleWithRelations | undefined): ArticleSummary {
  return {
    id: article ? String(article.id) : `${ITEM_PREFIX}${item.id}`,
    title: article?.title ?? item.title,
    status: article ? articleStatusOf(article.status) : "scheduled",
    date: item.scheduled_date.slice(0, 10),
    score: article ? scoreOf(article) : Math.round(toNumber(item.priority_score) ?? 0),
    keyword: item.keyword ?? article?.keyword?.keyword ?? "",
  };
}

/** One month of the content calendar, with each item's article when it has been written. */
export function useContentMonth(siteId: number | undefined, month: string) {
  const id = siteId ?? 0;
  const start = parse(`${month}-01`, "yyyy-MM-dd", new Date());
  const from = formatDate(start, "yyyy-MM-dd");
  const to = formatDate(endOfMonth(start), "yyyy-MM-dd");
  const calendar = useQuery({
    queryKey: contentKeys.calendar(id, from, to),
    enabled: Boolean(siteId),
    queryFn: async () => (await contentPlannerService.calendar(id, { from, to })).data.data,
  });
  const articles = useQuery({
    queryKey: contentKeys.articles(id),
    enabled: Boolean(siteId),
    queryFn: async () => (await articleService.list(id, { per_page: 100 })).data.data,
  });

  return {
    data:
      calendar.data && articles.data
        ? calendar.data
            .filter((item) => item.status !== "removed")
            .map((item) =>
              summaryOf(
                item,
                articles.data.find((a) => item.keyword_id !== null && a.keyword_id === item.keyword_id),
              ),
            )
        : undefined,
    isPending: !siteId || calendar.isPending || articles.isPending,
    isError: calendar.isError || articles.isError,
    refetch: () => Promise.all([calendar.refetch(), articles.refetch()]),
  };
}

/** Generates the content plan for a month (YYYY-MM). */
export function useGeneratePlan(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (month: string) =>
      (
        await contentPlannerService.generate(siteId, {
          month,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contentKeys.all(siteId) }),
  });
}

export function toArticleDetail(article: ArticleWithRelations): ArticleDetail {
  return {
    id: String(article.id),
    title: article.title,
    status: articleStatusOf(article.status),
    date: (article.published_at ?? article.created_at).slice(0, 10),
    score: scoreOf(article),
    keyword: article.keyword?.keyword ?? "",
    words: article.word_count ?? 0,
    savedAt: article.updated_at,
    shortAnswer: article.meta_description ?? "",
    html: article.content,
    metaTitle: article.meta_title ?? article.title,
    slug: article.slug,
    // The backend's SEO analysis has no fixed checklist shape yet.
    checklist: [],
  };
}

export function useArticle(siteId: number | undefined, articleId: number) {
  return useQuery({
    queryKey: contentKeys.article(siteId ?? 0, articleId),
    enabled: Boolean(siteId) && Number.isInteger(articleId),
    queryFn: async () => (await articleService.get(siteId as number, articleId)).data.article,
  });
}

/** Saves draft edits (the backend snapshots a revision first). */
export function useSaveArticle(siteId: number, articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateArticlePayload) =>
      (await articleService.update(siteId, articleId, payload)).data.article,
    onSuccess: (article) => queryClient.setQueryData(contentKeys.article(siteId, articleId), article),
  });
}

/** The calendar item a not-yet-written entry stands for. */
export function useCalendarItem(siteId: number | undefined, itemId: number) {
  return useQuery({
    queryKey: [...contentKeys.all(siteId ?? 0), "item", itemId],
    enabled: Boolean(siteId),
    queryFn: async () => {
      const page = await contentPlannerService.calendar(siteId as number);
      return page.data.data.find((item) => item.id === itemId) ?? null;
    },
  });
}

/** Researches the keyword, then writes the article from the brief. Both calls are slow. */
export function useWriteArticle(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (keywordId: number) => {
      const { research } = (await articleResearchService.researchKeyword(siteId, keywordId)).data;
      return (await articleService.generate(siteId, research.id)).data.article;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contentKeys.all(siteId) }),
  });
}
