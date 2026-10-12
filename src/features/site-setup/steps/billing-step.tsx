"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  BarChart3Icon,
  CalendarDaysIcon,
  CheckIcon,
  FileTextIcon,
  ImageIcon,
  LinkIcon,
  LockIcon,
  MessageCircleIcon,
  NetworkIcon,
  RadarIcon,
  RocketIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  SproutIcon,
  TrendingUpIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";

import type { Site } from "@/types/types";
import { getActivePlan } from "@/lib/plan-core";
import { accountHref } from "@/features/account/routes";
import { useSessionUser } from "@/features/account/use-session-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dur, ease } from "../motion";
import { useDraft } from "../store";
import { SiteFavicon } from "@/components/layout/site-favicon";
import { StepHeading } from "./step-heading";
import { faviconFor } from "@/features/sites/site-utils";

const phases: Array<{ key: "first" | "second" | "third"; icon: LucideIcon }> = [
  { key: "first", icon: SproutIcon },
  { key: "second", icon: TrendingUpIcon },
  { key: "third", icon: RocketIcon },
];
const howSteps: Array<{ key: "research" | "plan" | "write" | "publish"; icon: LucideIcon }> = [
  { key: "research", icon: SearchIcon },
  { key: "plan", icon: CalendarDaysIcon },
  { key: "write", icon: FileTextIcon },
  { key: "publish", icon: SendIcon },
];
type IncludedKey =
  | "aiVisibility"
  | "rankings"
  | "keywords"
  | "topicalMap"
  | "contentPlan"
  | "articles"
  | "images"
  | "internalLinks"
  | "siteAudit"
  | "competitors"
  | "searchConsole"
  | "approvals";
const included: Array<{ key: IncludedKey; icon: LucideIcon }> = [
  { key: "aiVisibility", icon: RadarIcon },
  { key: "rankings", icon: TrendingUpIcon },
  { key: "keywords", icon: SearchIcon },
  { key: "topicalMap", icon: NetworkIcon },
  { key: "contentPlan", icon: CalendarDaysIcon },
  { key: "articles", icon: FileTextIcon },
  { key: "images", icon: ImageIcon },
  { key: "internalLinks", icon: LinkIcon },
  { key: "siteAudit", icon: ShieldCheckIcon },
  { key: "competitors", icon: UsersIcon },
  { key: "searchConsole", icon: BarChart3Icon },
  { key: "approvals", icon: MessageCircleIcon },
];

/** Deterministic 0–1 noise from a string seed, so a site's estimate never changes between visits. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * 52 weekly bars from next week: an S-curve toward a plateau sized from the
 * chosen topics' search volume, with small seeded noise. An illustration,
 * labelled as an estimate on screen.
 */
function growthSeries(siteId: string, monthlyVolume: number) {
  const rand = seeded(siteId);
  const plateau = Math.max(120, (monthlyVolume / 4.3) * 0.03);
  const start = new Date();
  start.setDate(start.getDate() + 7 - start.getDay());
  return Array.from({ length: 52 }, (_, w) => {
    const curve = 1 / (1 + Math.exp(-(w - 22) / 6));
    const date = new Date(start);
    date.setDate(start.getDate() + w * 7);
    return { week: w, date: date.toISOString(), visits: Math.round(plateau * curve * (0.92 + rand() * 0.16)) };
  });
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: dur.base, ease: ease.out }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/**
 * Step 5, full width. Plans are account-level on the shared backend, so a
 * paid account sees this site covered by its plan; a free one is sent to
 * the plans page (checkout runs through Paddle there) or carries on on Free.
 */
export function BillingStep({ site, onContinue }: { site: Site; onContinue: () => void }) {
  const t = useTranslations("siteSetup.billing");
  const tPlan = useTranslations("account.plans");
  const format = useFormatter();
  const locale = useLocale();
  const session = useSessionUser();
  const plan = getActivePlan(session?.subscriptions);
  const paid = plan !== "free";
  const draft = useDraft(site.id);
  const topicVolume = (draft.topicSuggestions ?? [])
    .filter((topic) => draft.coreTopics.includes(topic.id))
    .reduce((sum, topic) => sum + topic.volume, 0);
  const series = React.useMemo(() => growthSeries(String(site.id), topicVolume), [site.id, topicVolume]);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInView = useInView(chartRef, { once: true, amount: 0.4 });
  const monthFormat = React.useMemo(() => new Intl.DateTimeFormat(locale, { month: "short" }), [locale]);

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-6">
        <StepHeading
          title={t("title")}
          description={paid ? t("descriptionPaid", { plan: tPlan(`${plan}.label`) }) : t("descriptionFree")}
        />
        <div className="flex items-center gap-4 self-start rounded-xl bg-surface-2 px-5 py-4">
          <SiteFavicon src={faviconFor(site.domain)} name={site.name} size={44} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-h3 text-fg">{site.name}</span>
            <span dir="ltr" className="truncate text-start text-small text-fg-3">
              {site.domain}
            </span>
          </span>
        </div>
      </div>

      <section
        aria-labelledby="plan-heading"
        className="dark relative overflow-hidden rounded-2xl bg-nav p-8 text-fg sm:p-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--nav-border)_1px,transparent_1px)] [background-size:18px_18px] opacity-70"
        />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
          <div className="flex flex-col gap-3">
            <h2 id="plan-heading" className="text-h1 text-white">
              {t("autopilot.title")}
            </h2>
            <p className="max-w-[46ch] text-body-lg text-nav-fg">{t("autopilot.body")}</p>
          </div>
          <div className="flex flex-col gap-5 rounded-xl border border-nav-border bg-nav-card p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-h2 text-white">{tPlan(`${plan}.label`)}</span>
              <Badge variant={paid ? "success" : "neutral"} shape="pill">
                {paid ? t("plan.active") : t("plan.free")}
              </Badge>
            </div>
            <ul className="flex flex-col gap-2.5">
              {(["topics", "plan", "writing", "tracking"] as const).map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-body text-nav-fg">
                  <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                  {paid || key === "tracking" ? t(`plan.features.${key}`) : t(`plan.locked.${key}`)}
                </li>
              ))}
            </ul>
            {paid ? (
              <Button variant="primary" size="lg" onClick={onContinue}>
                {t("continuePaid")}
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Button asChild variant="primary" size="lg">
                  <Link href={accountHref.upgrade()}>{t("seePlans")}</Link>
                </Button>
                <Button variant="ghost" size="lg" className="text-nav-fg hover:text-white" onClick={onContinue}>
                  {t("continueFree")}
                </Button>
              </div>
            )}
            <p className="flex items-center justify-center gap-1.5 text-caption font-normal text-nav-muted">
              <LockIcon aria-hidden className="size-3.5" />
              {t("secure")}
            </p>
          </div>
        </div>
      </section>

      <Reveal className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-h1 text-fg">{t("growth.title")}</h2>
          <Badge variant="outline" shape="pill">
            {t("growth.estimate")}
          </Badge>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-small text-fg-2">{t("growth.caption")}</p>
            <p className="num text-h2 text-fg">
              {t("growth.atYearEnd", { visits: format.number(series.at(-1)?.visits ?? 0, "integer") })}
            </p>
          </div>
          <div ref={chartRef} className="h-56" role="img" aria-label={t("growth.chartLabel")}>
            {chartInView && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="date"
                    interval={7}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--text-3)", fontSize: 12 }}
                    tickFormatter={(value: string) => monthFormat.format(new Date(value))}
                    reversed={locale === "ar"}
                  />
                  <Bar dataKey="visits" fill="var(--success)" radius={[2, 2, 0, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-caption font-normal text-fg-3">{t("growth.disclaimer")}</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {phases.map(({ key, icon: Icon }) => (
            <li key={key} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
              <span className="grid size-9 place-items-center rounded-md bg-success-bg text-success">
                <Icon aria-hidden className="size-[18px]" />
              </span>
              <span className="text-overline text-fg-3">{t(`phases.${key}.when`)}</span>
              <span className="text-body text-fg">{t(`phases.${key}.what`)}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h1 text-fg">{t("how.title")}</h2>
          <p className="text-body-lg text-fg-2">{t("how.subtitle")}</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2">
          {howSteps.map(({ key, icon: Icon }, i) => (
            <li key={key} className="flex gap-4 rounded-xl border border-border bg-surface p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-bg text-blue-ink">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="num text-overline text-fg-3">
                  {t("how.eyebrow", { n: String(i + 1).padStart(2, "0") })}
                </span>
                <span className="text-h3 text-fg">{t(`how.${key}.title`)}</span>
                <span className="text-body text-fg-2">{t(`how.${key}.body`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal className="flex flex-col gap-6">
        <h2 className="text-h1 text-fg">{t("included.title")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {included.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5">
              <Icon aria-hidden className="size-4 shrink-0 text-fg-2" />
              <span className="text-body text-fg">{t(`included.items.${key}`)}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {!paid && (
          <Button asChild variant="secondary" size="lg">
            <Link href={accountHref.upgrade()}>{t("seePlans")}</Link>
          </Button>
        )}
        <Button variant="primary" size="lg" onClick={onContinue}>
          {paid ? t("continuePaid") : t("continueFree")}
        </Button>
      </div>
    </div>
  );
}
