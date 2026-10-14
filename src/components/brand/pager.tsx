"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Previous / next for a paginated endpoint. Hidden when everything fits on one page. */
export function Pager({
  page,
  lastPage,
  onPage,
  busy,
  className,
}: {
  page: number;
  lastPage: number;
  onPage: (page: number) => void;
  busy?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.pager");
  if (lastPage <= 1) return null;
  return (
    <nav aria-label={t("label")} className={cn("flex items-center justify-between gap-3", className)}>
      <Button size="sm" variant="secondary" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
        <ChevronLeftIcon className="rtl:-scale-x-100" />
        {t("previous")}
      </Button>
      <span className="num text-small text-fg-2">{t("status", { page, total: lastPage })}</span>
      <Button size="sm" variant="secondary" disabled={page >= lastPage || busy} onClick={() => onPage(page + 1)}>
        {t("next")}
        <ChevronRightIcon className="rtl:-scale-x-100" />
      </Button>
    </nav>
  );
}
