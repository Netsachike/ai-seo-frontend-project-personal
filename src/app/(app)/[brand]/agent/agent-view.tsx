"use client";

import Link from "next/link";
import { ArrowRightIcon, CheckIcon, SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFakeQuery } from "@/lib/fake-query";
import { openTasks } from "@/lib/mocks/ui-data-work";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentThreadView } from "@/components/agent/agent-panel";
import { RankoyaAvatar } from "@/components/brand/logo";
import { brandHref } from "@/components/layout/nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

const capabilities = ["rankings", "compare", "write", "fix", "outreach"] as const;

export function AgentView() {
  const t = useTranslations("agentPage");
  const { workspace, brand, brandSlug, me } = useShell();
  const tasks = useFakeQuery(["openTasks", brand?.id], () => openTasks(String(brand?.id ?? "")), {
    enabled: Boolean(brand),
  });

  if (!workspace || !brand) return <PageSkeleton kpis={0} panels={2} />;
  const telegram = me?.telegram;

  return (
    <div className="grid gap-4 lg:h-[calc(100dvh-56px-64px)] lg:grid-cols-[minmax(0,1fr)_300px]">
      <section
        aria-labelledby="agent-title"
        className="flex h-[calc(100dvh-56px-48px)] min-h-[480px] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card lg:h-auto"
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <RankoyaAvatar size={32} />
          <div className="flex min-w-0 flex-col">
            <h1 id="agent-title" className="text-h3">
              {t("title")}
            </h1>
            <p className="text-caption font-normal text-fg-3">{t("description")}</p>
          </div>
        </header>
        <AgentThreadView
          siteId={brand.id}
          suggestions={[t("suggestions.week"), t("suggestions.gained"), t("suggestions.plan")]}
        />
      </section>

      <aside className="flex flex-col gap-4 lg:overflow-y-auto">
        <Card>
          <CardTitle>{t("canTitle")}</CardTitle>
          <ul className="flex flex-col gap-2">
            {capabilities.map((c) => (
              <li key={c} className="flex items-start gap-2 text-small text-fg">
                {c === "outreach" ? (
                  <ArrowRightIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-3 rtl:-scale-x-100" />
                ) : (
                  <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                )}
                {t(`can.${c}`)}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="gap-2">
          <div className="flex items-center gap-2">
            <SendIcon aria-hidden className="size-4 text-fg-2 rtl:-scale-x-100" />
            <CardTitle as="h2">{t("telegramTitle")}</CardTitle>
            <Badge variant={telegram?.connected ? "success" : "outline"} className="ms-auto">
              {telegram?.connected ? t("connected") : t("notConnected")}
            </Badge>
          </div>
          <p className="text-small text-fg-2">
            {telegram?.connected ? t("telegramOn", { bot: "@RankoyaAgentBot" }) : t("telegramOff")}
          </p>
          {!telegram?.connected && (
            <Link
              href={brandHref(brandSlug, "integrations")}
              className="text-small font-medium text-blue hover:underline"
            >
              {t("connect")}
            </Link>
          )}
        </Card>

        <Card>
          <CardTitle>{t("tasksTitle")}</CardTitle>
          {tasks.isPending && <Skeleton className="h-16" />}
          {tasks.data?.length === 0 && <p className="text-small text-fg-3">{t("tasksEmpty")}</p>}
          <ul className="flex flex-col divide-y divide-border">
            {tasks.data?.map((task) => (
              <li key={task.id} className="flex items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1 truncate text-small text-fg">{task.title}</span>
                <Badge variant={task.status === "waiting" ? "warning" : "blue"}>{t(`taskStatus.${task.status}`)}</Badge>
              </li>
            ))}
          </ul>
          <Link href={brandHref(brandSlug, "actions")} className="text-small font-medium text-blue hover:underline">
            {t("openPlan")}
          </Link>
        </Card>
      </aside>
    </div>
  );
}
