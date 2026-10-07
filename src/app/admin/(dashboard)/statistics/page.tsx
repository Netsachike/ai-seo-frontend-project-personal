"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDaysIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import adminService from "@/services/admin";
import { accountKeys } from "@/features/account/query-keys";
import { StatCard } from "@/components/account/stat-card";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Sign-up counts from `GET /admin`. The source app showed placeholder figures
 * for logins and monthly sign-ups; those need backend fields before they can
 * be shown here.
 */
export default function AdminStatisticsPage() {
  const t = useTranslations("admin.statistics");
  const format = useFormatter();
  const dashboard = useQuery({ queryKey: accountKeys.adminDashboard(), queryFn: adminService.getAdminDashboardData });
  const stats = dashboard.data?.stats;

  const cards = [
    { key: "total", icon: UsersIcon, value: stats?.total_users },
    { key: "week", icon: CalendarDaysIcon, value: stats?.users_this_week },
    { key: "today", icon: UserPlusIcon, value: stats?.users_today },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {dashboard.isError ? (
        <p role="alert" className="rounded-md bg-danger-bg px-4 py-3 text-small text-danger">
          {t("loadFailed")}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <StatCard
              key={card.key}
              icon={card.icon}
              label={t(`cards.${card.key}.label`)}
              hint={t(`cards.${card.key}.hint`)}
              value={format.number(card.value ?? 0, "integer")}
              loading={dashboard.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
