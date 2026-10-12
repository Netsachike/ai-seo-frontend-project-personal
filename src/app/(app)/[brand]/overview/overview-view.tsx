"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CheckIcon,
  FileTextIcon,
  GlobeIcon,
  HeadsetIcon,
  LightbulbIcon,
  PlusIcon,
  RocketIcon,
  ScanSearchIcon,
  SearchIcon,
  ShieldCheckIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { useFakeQuery } from "@/lib/fake-query";
import { rankoyaActivity } from "@/lib/mocks/ui-data";
import { platformGlance, type Platform, type PlatformGlance } from "@/lib/mocks/ui-data-overview";
import { cn } from "@/lib/utils";
import { DOMAIN_PATTERN, NEW_SITE_PATH } from "@/features/site-setup/steps";
import { GROWTH_STEPS, useBrandSummary, useGrowthProgress, useRunAiScan } from "@/features/insights/hooks";
import { useRange } from "@/features/insights/url-state";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeltaChip } from "@/components/brand/delta-chip";
import { ErrorState } from "@/components/brand/error-state";
import { PlatformLogo, platformLogos } from "@/components/brand/platform-logo";
import { AreaSpark } from "@/components/charts/area-spark";
import { ShareOfVoice } from "@/components/charts/share-of-voice";
import { VisibilityTrend } from "@/components/charts/visibility-trend";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { brandHref } from "@/components/layout/nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { RangePicker } from "@/components/layout/range-picker";
import { useShell } from "@/components/layout/shell-context";

/** Accent per platform. Static class strings so Tailwind can see them. */
const accent: Record<Platform, { tile: string; color: string; monogram: string }> = {
  google: { tile: "bg-engine-google/12 text-engine-google", color: "var(--engine-google)", monogram: "G" },
  maps: { tile: "bg-engine-maps/12 text-engine-maps", color: "var(--engine-maps)", monogram: "MAP" },
  chatgpt: { tile: "bg-engine-chatgpt/12 text-engine-chatgpt", color: "var(--engine-chatgpt)", monogram: "GPT" },
  claude: { tile: "bg-engine-claude/12 text-engine-claude", color: "var(--engine-claude)", monogram: "CLD" },
  gemini: { tile: "bg-engine-gemini/12 text-engine-gemini", color: "var(--engine-gemini)", monogram: "GEM" },
  perplexity: {
    tile: "bg-engine-perplexity/12 text-engine-perplexity",
    color: "var(--engine-perplexity)",
    monogram: "PPX",
  },
};

export function OverviewView() {
  const t = useTranslations("overview");
  const { brand, me, brandSlug } = useShell();
  const { range } = useRange();
  const summary = useBrandSummary(brand?.id, range);
  const scan = useRunAiScan(brand?.id ?? 0);
  const firstName = me?.name.split(" ")[0] ?? "";

  if (!brand || summary.isPending) return <PageSkeleton />;
  const data = summary.data;
  const firstScan = data?.status === "first_scan_running" || data?.status === "no_data";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <header className="flex min-w-0 flex-col gap-1 pt-1">
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em] text-fg sm:text-[32px] sm:leading-[38px]">
            {t("welcome", { name: firstName })}
          </h1>
          <p className="text-body-lg text-fg-2">{t("descriptionV2", { brand: brand.name })}</p>
        </header>
        <PromoBanner />
      </div>

      {summary.isError && <ErrorState onRetry={() => summary.refetch()} />}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="@container flex min-w-0 flex-col gap-6">
          <GettingStarted site={brand} />

          <Card className="@container gap-5">
            <CardHeader>
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-h2">{t("glance.title")}</CardTitle>
                <CardDescription className="text-small">{t("glance.description")}</CardDescription>
              </div>
              <CardAction className="flex-wrap">
                <RangePicker />
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8"
                  onClick={() => scan.mutate()}
                  loading={scan.isPending}
                >
                  <ScanSearchIcon />
                  {t("runScan")}
                </Button>
              </CardAction>
            </CardHeader>
            <PlatformGrid brandId={String(brand.id)} />
            <Link
              href={brandHref(brandSlug, "visibility")}
              className="inline-flex items-center gap-1.5 self-end text-small font-medium text-blue hover:underline"
            >
              {t("glance.report")}
              <ArrowRightIcon aria-hidden className="size-4 rtl:-scale-x-100" />
            </Link>
          </Card>

          <div className="grid gap-6 @min-[760px]:grid-cols-[minmax(0,1fr)_280px]">
            <AddWebsiteCard />
            <GrowthSteps />
          </div>

          {data && !firstScan && (
            <div className="grid gap-6 @min-[760px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <Card>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>{t("trendTitle")}</CardTitle>
                  <CardDescription>{t("trendDescription")}</CardDescription>
                </div>
                <VisibilityTrend
                  series={data.trend}
                  domain={[20, 80]}
                  ariaLabel={t("trendAria", {
                    from: data.trend.find((s) => s.isYou)?.points[0]?.value ?? 0,
                    to: data.trend.find((s) => s.isYou)?.points.at(-1)?.value ?? 0,
                  })}
                />
              </Card>
              <Card>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>{t("sovTitle")}</CardTitle>
                  <CardDescription>{t("sovDescription")}</CardDescription>
                </div>
                <ShareOfVoice items={data.shareOfVoice} />
              </Card>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-6" aria-label={t("rail")}>
          <QuickActions />
          <NeedHelp />
          <RecentActivity brandId={String(brand.id)} />
        </aside>
      </div>
    </div>
  );
}

function PromoBanner() {
  const t = useTranslations("overview.promo");
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-blue/15 bg-blue-bg p-5 sm:flex-row sm:items-center">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink text-ink-fg">
        <RocketIcon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="text-h3 text-fg">{t("title")}</h2>
        <p className="text-small text-fg-2">{t("body")}</p>
      </div>
      <Button asChild variant="primary" className="shrink-0">
        <a href="#add-website">
          <PlusIcon />
          {t("cta")}
        </a>
      </Button>
    </section>
  );
}

function GettingStarted({ site }: { site: Site }) {
  const t = useTranslations("overview.setup");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [hidden, setHidden] = React.useState(false);
  const current = useGrowthProgress(site);
  if (hidden) return null;

  return (
    <Card className="gap-5">
      <div className="flex flex-col gap-5">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-h2">{t("title")}</CardTitle>
            <Button variant="ghost" size="icon-sm" aria-label={tCommon("close")} onClick={() => setHidden(true)}>
              <XIcon />
            </Button>
          </div>
          <CardDescription className="text-small">{t("description")}</CardDescription>
        </div>
        <ol className="-mx-1 flex flex-1 items-start gap-1 overflow-x-auto px-1 pb-1" aria-label={t("title")}>
          {GROWTH_STEPS.map((step, i) => {
            const done = i < current;
            const now = i === current;
            return (
              <li key={step} className="flex min-w-[96px] flex-1 items-start gap-1">
                <div
                  className="flex flex-1 flex-col items-center gap-2 text-center"
                  aria-current={now ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-full num text-small font-semibold transition-colors",
                      done && "bg-success-bg text-success",
                      now && "bg-ink text-ink-fg shadow-[0_0_0_4px_var(--blue-bg)]",
                      !done && !now && "bg-surface-2 text-fg-2",
                    )}
                  >
                    {done ? (
                      <CheckIcon aria-hidden className="size-4" strokeWidth={2.5} />
                    ) : (
                      format.number(i + 1, "integer")
                    )}
                  </span>
                  <span className={cn("text-caption", now ? "font-semibold text-fg" : "font-normal text-fg-2")}>
                    {t(`steps.${step}`)}
                    {done && <span className="sr-only">{t("done")}</span>}
                  </span>
                </div>
                {i < GROWTH_STEPS.length - 1 && (
                  <ArrowRightIcon aria-hidden className="mt-2.5 size-4 shrink-0 text-blue/50 rtl:-scale-x-100" />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}

function PlatformGrid({ brandId }: { brandId: string }) {
  const query = useFakeQuery(["glance", brandId], () => platformGlance(brandId));
  if (query.isPending)
    return (
      <div className="grid gap-3 @md:grid-cols-2 @2xl:grid-cols-3 @3xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[214px] rounded-lg" />
        ))}
      </div>
    );
  if (query.isError) return <ErrorState compact onRetry={() => query.refetch()} />;
  return (
    <ul className="grid gap-3 @md:grid-cols-2 @2xl:grid-cols-3 @3xl:grid-cols-6">
      {query.data.map((p) => (
        <li key={p.platform}>
          <PlatformCard item={p} />
        </li>
      ))}
    </ul>
  );
}

function PlatformCard({ item }: { item: PlatformGlance }) {
  const t = useTranslations("overview.glance");
  const tEngine = useTranslations("engines");
  const format = useFormatter();
  const { brandSlug } = useShell();
  const { days } = useRange();
  const a = accent[item.platform];
  const name = tEngine(item.platform);
  const href =
    item.platform === "google" || item.platform === "maps"
      ? brandHref(brandSlug, "rankings")
      : brandHref(brandSlug, `visibility?engine=${item.platform}`);

  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-2.5 rounded-lg border border-border bg-surface p-3.5 transition-colors duration-120 hover:border-border-strong hover:shadow-raised"
    >
      {platformLogos[item.platform] ? (
        <span aria-hidden className="grid size-10 place-items-center rounded-lg border border-border bg-white">
          <PlatformLogo platform={item.platform} size={24} />
        </span>
      ) : (
        <span
          aria-hidden
          translate="no"
          className={cn("grid size-10 place-items-center rounded-lg font-mono text-[11px] font-semibold", a.tile)}
        >
          {a.monogram}
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-small font-semibold text-fg" title={name}>
          {name}
        </span>
        <span className="line-clamp-2 min-h-8 text-caption font-normal break-words hyphens-auto text-fg-3">
          {t(`measures.${item.platform}`)}
        </span>
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {item.value === null ? (
          <>
            <span aria-hidden className="num text-[30px] leading-9 font-medium text-fg-3">
              —
            </span>
            <span className="sr-only">{t("noData")}</span>
          </>
        ) : (
          <>
            <span className="num text-[30px] leading-9 font-medium tracking-[-0.02em] text-fg">
              {format.number(item.value, "percent")}
            </span>
            <DeltaChip value={item.delta} unit="points" variant="text" />
          </>
        )}
      </span>
      <span className="line-clamp-2 min-h-8 text-caption font-normal text-fg-3">
        {item.value === null ? t("waiting") : t("versus", { days })}
      </span>
      <AreaSpark values={item.spark} color={a.color} className="mt-auto" />
    </Link>
  );
}

/**
 * Adds another site: takes the domain and hands over to site setup, which
 * asks everything else (and drafts most of it from the site itself).
 */
function AddWebsiteCard() {
  const t = useTranslations("overview.add");
  const router = useRouter();
  const { workspace } = useShell();
  const [domain, setDomain] = React.useState("");
  const [error, setError] = React.useState<string>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!DOMAIN_PATTERN.test(domain)) return setError(t("errors.domain"));
    const params = new URLSearchParams({ domain });
    if (workspace) params.set("workspace", String(workspace.work_space_id));
    router.push(`${NEW_SITE_PATH}?${params.toString()}`);
  };

  return (
    <Card id="add-website" className="@container scroll-mt-20 gap-5">
      <div className="flex flex-col gap-1">
        <CardTitle className="text-h2">{t("title")}</CardTitle>
        <CardDescription className="text-small">{t("description")}</CardDescription>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <FormField label={t("url")} helper={t("urlHelper")} error={error}>
          {(props) => (
            <DomainInput
              {...props}
              value={domain}
              onChange={(value) => {
                setDomain(value);
                setError(undefined);
              }}
              placeholder={t("urlPlaceholder")}
            />
          )}
        </FormField>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption font-normal text-fg-3">{t("later")}</p>
          <Button type="submit" variant="primary">
            {t("submit")}
            <ArrowRightIcon className="rtl:-scale-x-100" />
          </Button>
        </div>
      </form>
    </Card>
  );
}

const stepTone = [
  "bg-engine-maps text-ink-fg",
  "bg-engine-gemini text-ink-fg",
  "bg-engine-perplexity text-ink-fg",
  "bg-engine-claude text-ink-fg",
  "bg-engine-chatgpt text-ink-fg",
  "bg-engine-google text-ink-fg",
] as const;

function GrowthSteps() {
  const t = useTranslations("overview.growth");
  const tSetup = useTranslations("overview.setup");
  const format = useFormatter();
  return (
    <Card className="gap-5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-blue-bg text-blue">
          <RocketIcon className="size-5" />
        </span>
        <CardTitle className="text-h3 text-blue-ink">{t("title")}</CardTitle>
      </div>
      <ol className="flex flex-col gap-4">
        {GROWTH_STEPS.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full num text-caption font-semibold",
                stepTone[i],
              )}
            >
              {format.number(i + 1, "integer")}
            </span>
            <span className="flex flex-col">
              <span className="text-small font-medium text-fg">{tSetup(`steps.${step}`)}</span>
              <span className="text-caption font-normal text-fg-3">{t(`lines.${step}`)}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-small text-fg-2 italic">{t("tagline")}</p>
    </Card>
  );
}

function QuickActions() {
  const t = useTranslations("overview.quick");
  const { brandSlug } = useShell();
  const items: { key: "add" | "opportunities" | "content" | "audit"; icon: LucideIcon; tile: string; href: string }[] =
    [
      { key: "add", icon: PlusIcon, tile: "bg-ink text-ink-fg", href: "#add-website" },
      {
        key: "opportunities",
        icon: LightbulbIcon,
        tile: "bg-warning-bg text-warning",
        href: brandHref(brandSlug, "actions"),
      },
      {
        key: "content",
        icon: FileTextIcon,
        tile: "bg-engine-chatgpt/12 text-engine-chatgpt",
        href: brandHref(brandSlug, "content"),
      },
      { key: "audit", icon: ShieldCheckIcon, tile: "bg-success-bg text-success", href: brandHref(brandSlug, "audit") },
    ];
  return (
    <Card className="gap-3">
      <CardTitle className="text-h2">{t("title")}</CardTitle>
      <ul className="flex flex-col gap-2">
        {items.map(({ key, icon: Icon, tile, href }) => (
          <li key={key}>
            <Link
              href={href}
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-120 hover:border-border-strong hover:bg-surface-2/60"
            >
              <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-md", tile)}>
                <Icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-small font-medium text-fg">{t(`${key}.title`)}</span>
                <span className="text-caption font-normal text-fg-3">{t(`${key}.body`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NeedHelp() {
  const t = useTranslations("overview.help");
  const { openHelp } = useShell();
  return (
    <Card className="gap-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-2">
          <HeadsetIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <CardTitle as="h2">{t("title")}</CardTitle>
          <p className="text-small text-fg-2">{t("body")}</p>
        </div>
      </div>
      <Button variant="secondary" onClick={openHelp}>
        {t("cta")}
      </Button>
    </Card>
  );
}

function RecentActivity({ brandId }: { brandId: string }) {
  const t = useTranslations("overview.activity");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { brandSlug } = useShell();
  const feed = useFakeQuery(["activity", brandId], () => rankoyaActivity(brandId));
  const icons: LucideIcon[] = [GlobeIcon, SearchIcon, LightbulbIcon, FileTextIcon];
  return (
    <Card className="gap-3">
      <CardTitle className="text-h2">{t("title")}</CardTitle>
      {feed.isPending && <Skeleton className="h-40" />}
      {feed.isError && <ErrorState compact onRetry={() => feed.refetch()} />}
      {feed.data?.length === 0 && <p className="text-small text-fg-3">{t("empty")}</p>}
      <ul className="flex flex-col gap-4">
        {feed.data?.map((item, i) => {
          const Icon = icons[i % icons.length];
          return (
            <li key={item.id} className="flex items-start gap-3">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-md bg-success-bg text-success"
              >
                <Icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-small font-medium text-fg">{item.text}</span>
                <span className="text-caption font-normal text-fg-3">{item.sub}</span>
              </span>
              <time dateTime={item.at} className="shrink-0 text-caption font-normal text-fg-3">
                {format.relativeTime(new Date(item.at), now)}
              </time>
            </li>
          );
        })}
      </ul>
      <Link
        href={brandHref(brandSlug, "agent")}
        className="inline-flex items-center gap-1.5 text-small font-medium text-blue hover:underline"
      >
        {t("all")}
        <ArrowRightIcon aria-hidden className="size-4 rtl:-scale-x-100" />
      </Link>
    </Card>
  );
}
