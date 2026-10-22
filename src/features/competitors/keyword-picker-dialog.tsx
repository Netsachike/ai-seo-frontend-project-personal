"use client";

import * as React from "react";
import Link from "next/link";
import { KeyRoundIcon, ScanSearchIcon, SearchIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { Keyword } from "@/types/types";
import { cn } from "@/lib/utils";
import { toNumber } from "@/services/api/helpers";
import { keywordQualityOf, useKeywordsPage } from "@/features/topics/hooks";
import { MAX_RESEARCH_KEYWORDS } from "./hooks";
import { Button } from "@/components/ui/button";
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
import { EmptyState } from "@/components/brand/empty-state";
import { Pager } from "@/components/brand/pager";
import { Skeleton } from "@/components/ui/skeleton";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";

type Picked = Pick<Keyword, "id" | "keyword">;

/**
 * Pick up to five accepted keywords, then research who ranks for them. The
 * backend only researches keywords the user chose, and only accepted ones.
 */
export function KeywordPickerDialog({
  siteId,
  open,
  onOpenChange,
  onResearch,
}: {
  siteId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResearch: (keywords: Picked[]) => void;
}) {
  const t = useTranslations("competitors.picker");
  const format = useFormatter();
  const { brandSlug } = useShell();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [picked, setPicked] = React.useState<Picked[]>([]);
  const query = useKeywordsPage(open ? siteId : 0, page);

  const accepted = (query.data?.data ?? []).filter((k) => keywordQualityOf(k) === "accepted");
  const term = search.trim().toLowerCase();
  const rows = term ? accepted.filter((k) => k.keyword.toLowerCase().includes(term)) : accepted;
  const full = picked.length >= MAX_RESEARCH_KEYWORDS;
  const isPicked = (id: number) => picked.some((p) => p.id === id);

  const toggle = (keyword: Keyword, on: boolean) =>
    setPicked((prev) =>
      on
        ? prev.length >= MAX_RESEARCH_KEYWORDS || prev.some((p) => p.id === keyword.id)
          ? prev
          : [...prev, { id: keyword.id, keyword: keyword.keyword }]
        : prev.filter((p) => p.id !== keyword.id),
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { max: MAX_RESEARCH_KEYWORDS })}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-3"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="ps-9"
          />
        </div>

        {picked.length > 0 && (
          <ul aria-label={t("picked")} className="flex flex-wrap gap-1.5">
            {picked.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setPicked((prev) => prev.filter((x) => x.id !== p.id))}
                  aria-label={t("remove", { keyword: p.keyword })}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-bg px-2.5 py-1 text-caption font-medium text-blue hover:bg-blue-bg/70"
                >
                  {p.keyword}
                  <XIcon aria-hidden className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {query.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={KeyRoundIcon}
              compact
              title={term ? t("noMatch") : t("emptyTitle")}
              description={term ? undefined : t("emptyBody")}
              action={
                term ? undefined : (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={brandHref(brandSlug, "keywords")}>{t("openKeywords")}</Link>
                  </Button>
                )
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {rows.map((k) => {
                const on = isPicked(k.id);
                const locked = full && !on;
                const volume = k.metrics.search_volume;
                return (
                  <li key={k.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-2",
                        on && "bg-blue-bg/40",
                        locked && "cursor-not-allowed opacity-50 hover:bg-transparent",
                      )}
                    >
                      <Checkbox checked={on} disabled={locked} onCheckedChange={(v) => toggle(k, v === true)} />
                      <span className="min-w-0 flex-1 truncate text-small font-medium text-fg">{k.keyword}</span>
                      <span className="shrink-0 num text-caption font-normal text-fg-3">
                        {volume === null ? "—" : t("volume", { volume: format.number(volume) })}
                      </span>
                      <span className="w-16 shrink-0 text-end num text-caption font-normal text-fg-3">
                        {t("score", {
                          score: Math.round(toNumber(k.metrics.opportunity_score ?? k.scoring.opportunity_score) ?? 0),
                        })}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {(query.data?.meta.last_page ?? 1) > 1 && (
          <Pager page={page} lastPage={query.data?.meta.last_page ?? 1} onPage={setPage} busy={query.isFetching} />
        )}

        <DialogFooter className="items-center sm:justify-between">
          <span role="status" className={cn("num text-small", full ? "text-warning" : "text-fg-2")}>
            {full
              ? t("limit", { max: MAX_RESEARCH_KEYWORDS })
              : t("count", { count: picked.length, max: MAX_RESEARCH_KEYWORDS })}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={picked.length === 0}
              onClick={() => {
                onResearch(picked);
                setPicked([]);
                setSearch("");
              }}
            >
              <ScanSearchIcon />
              {t("research", { count: picked.length })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
