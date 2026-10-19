"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpenCheckIcon,
  ClipboardListIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileBarChart2Icon,
  FileSignatureIcon,
  LayoutTemplateIcon,
  MailIcon,
  PhoneCallIcon,
  PresentationIcon,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
// import { canUseAgencyResources } from "@/lib/plan-core"; (plan gate off for now)
import { PRODUCT } from "@/config/product";
import { accountHref } from "@/features/account/routes";
import { useSessionUser } from "@/features/account/use-session-user";
// import { LockedState } from "@/components/account/locked-state"; (plan gate off for now)
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Category = "reports" | "sales" | "delivery" | "legal";
type ResourceId =
  | "reportTemplate"
  | "auditDeck"
  | "proposal"
  | "pricingSheet"
  | "outreach"
  | "discoveryScript"
  | "onboarding"
  | "contentBrief"
  | "contract";

type AgencyResource = {
  id: ResourceId;
  category: Category;
  version: string;
  icon: LucideIcon;
  /** Local files download; links open in a new tab. Null until the asset is published. */
  downloadUrl: string | null;
  previewUrl?: string;
  isNew?: boolean;
};

/**
 * Rankoya's agency kit. The files are being produced; until a resource has a
 * `downloadUrl`, its card says it's coming. Replace the nulls with links to
 * the published assets (under /public/agency or a shared drive).
 */
const agencyResources: AgencyResource[] = [
  {
    id: "reportTemplate",
    category: "reports",
    version: "v1.0",
    icon: FileBarChart2Icon,
    downloadUrl: null,
    isNew: true,
  },
  { id: "auditDeck", category: "reports", version: "v1.0", icon: PresentationIcon, downloadUrl: null, isNew: true },
  { id: "proposal", category: "sales", version: "v1.0", icon: LayoutTemplateIcon, downloadUrl: null },
  { id: "pricingSheet", category: "sales", version: "v1.0", icon: ClipboardListIcon, downloadUrl: null },
  { id: "outreach", category: "sales", version: "v1.0", icon: MailIcon, downloadUrl: null },
  { id: "discoveryScript", category: "sales", version: "v1.0", icon: PhoneCallIcon, downloadUrl: null },
  { id: "onboarding", category: "delivery", version: "v1.0", icon: BookOpenCheckIcon, downloadUrl: null },
  { id: "contentBrief", category: "delivery", version: "v1.0", icon: FileBarChart2Icon, downloadUrl: null },
  { id: "contract", category: "legal", version: "v1.0", icon: FileSignatureIcon, downloadUrl: null },
];

const CATEGORIES: Category[] = ["reports", "sales", "delivery", "legal"];

const categoryTone: Record<Category, string> = {
  reports: "bg-blue-bg text-blue-ink",
  sales: "bg-signal text-signal-ink",
  delivery: "bg-success-bg text-success",
  legal: "bg-warning-bg text-warning",
};

/** Agency resource kit: admins, or an active Agency or Enterprise plan. */
export function AgencyView() {
  // const t = useTranslations("account.agency"); (used by the plan gate below)
  const session = useSessionUser();
  if (session === undefined) return <Skeleton className="h-96" />;
  // Plan gate off for now (open to every plan) until it is switched back on.
  // if (!canUseAgencyResources(session)) return <LockedState title={t("lockedTitle")} body={t("lockedBody")} />;
  return <AgencyKit />;
}

function AgencyKit() {
  const t = useTranslations("account.agency");
  const format = useFormatter();
  const [filter, setFilter] = React.useState<Category | "all">("all");

  const newResources = agencyResources.filter((resource) => resource.isNew).length;
  const ready = agencyResources.filter((resource) => resource.downloadUrl).length;
  const visible = filter === "all" ? agencyResources : agencyResources.filter((r) => r.category === filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      <dl className="grid gap-4 md:grid-cols-3">
        <Card className="gap-1">
          <dt className="text-small font-medium text-fg-2">{t("summary.resources")}</dt>
          <dd className="text-metric text-fg">{format.number(agencyResources.length, "integer")}</dd>
          <dd className="text-caption font-normal text-fg-3">
            {t("summary.categories", { count: CATEGORIES.length })}
          </dd>
        </Card>
        <Card className="gap-1">
          <dt className="text-small font-medium text-fg-2">{t("summary.new")}</dt>
          <dd className="text-metric text-fg">{format.number(newResources, "integer")}</dd>
          <dd className="text-caption font-normal text-fg-3">{t("summary.newHint")}</dd>
        </Card>
        <Card className="gap-1">
          <dt className="text-small font-medium text-fg-2">{t("summary.ready")}</dt>
          <dd className="text-metric text-fg">
            {t("summary.readyValue", {
              ready: format.number(ready, "integer"),
              total: format.number(agencyResources.length, "integer"),
            })}
          </dd>
          <dd className="text-caption font-normal text-fg-3">{t("summary.readyHint")}</dd>
        </Card>
      </dl>

      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(value) => value && setFilter(value as Category | "all")}
        aria-label={t("filterLabel")}
        className="flex-wrap justify-start"
      >
        <ToggleGroupItem value="all">{t("categories.all")}</ToggleGroupItem>
        {CATEGORIES.map((category) => (
          <ToggleGroupItem key={category} value={category}>
            {t(`categories.${category}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((resource) => {
          const Icon = resource.icon;
          const localDownload = resource.downloadUrl?.startsWith("/");
          return (
            <li key={resource.id} className="flex">
              <Card className="w-full gap-4">
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden
                    className={cn("grid size-11 place-items-center rounded-lg", categoryTone[resource.category])}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {resource.isNew && (
                      <Badge variant="success" shape="pill">
                        {t("new")}
                      </Badge>
                    )}
                    <Badge variant="outline" shape="pill" className="num">
                      {resource.version}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-overline text-fg-2">{t(`categories.${resource.category}`)}</p>
                  <h2 className="text-h3 text-fg">{t(`resources.${resource.id}.title`)}</h2>
                  <p className="text-small text-fg-2">{t(`resources.${resource.id}.description`)}</p>
                </div>
                <div className="flex gap-2">
                  {resource.previewUrl && (
                    <Button asChild size="sm" className="flex-1">
                      <a href={resource.previewUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLinkIcon />
                        {t("preview")}
                      </a>
                    </Button>
                  )}
                  {resource.downloadUrl ? (
                    <Button asChild size="sm" variant="primary" className="flex-1">
                      <a
                        href={resource.downloadUrl}
                        {...(localDownload ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
                      >
                        <DownloadIcon />
                        {localDownload ? t("download") : t("open")}
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" className="flex-1" disabled>
                      {t("comingSoon")}
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Card className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-h3 text-fg">{t("custom.title")}</p>
          <p className="text-small text-fg-2">{t("custom.body")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href={accountHref.settings("subscriptions")}>{t("custom.managePlan")}</Link>
          </Button>
          <Button asChild variant="primary">
            <a href={`mailto:${PRODUCT.agencyEmail}`}>{t("custom.contact")}</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
