"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PlusIcon, SearchIcon, TrendingUpIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import adminService from "@/services/admin";
import { accountKeys } from "@/features/account/query-keys";
import { StatCard } from "@/components/account/stat-card";
import { AddUserDialog } from "@/components/admin/user-management/add-user-dialog";
import { UsersTable } from "@/components/admin/user-management/users-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMPTY_STATS = { total_users: 0, users_today: 0, users_this_week: 0 };

/**
 * Paged `GET /admin` with a debounced search. While searching, every match
 * is listed (all pages fetched) and pagination is off.
 */
export function UserManagementView() {
  const t = useTranslations("admin.users");
  const format = useFormatter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const search = debouncedSearchQuery.trim();
  const isSearching = search.length > 0;

  const query = useQuery({
    queryKey: accountKeys.adminUsers(currentPage, search),
    placeholderData: keepPreviousData,
    retry: false,
    queryFn: async () => {
      try {
        if (search) {
          const matchedUsers = await adminService.searchAllUsers(search);
          return { users: matchedUsers, total: matchedUsers.length, lastPage: 1, stats: null };
        }
        const [dashboardData, usersPageData] = await Promise.all([
          adminService.getAdminDashboardData(),
          adminService.getAllUsers(currentPage),
        ]);
        if (Array.isArray(usersPageData)) {
          return { users: usersPageData, total: usersPageData.length, lastPage: 1, stats: dashboardData.stats };
        }
        return {
          users: usersPageData.data ?? [],
          total: usersPageData.total ?? 0,
          lastPage: usersPageData.last_page ?? 1,
          stats: dashboardData.stats,
        };
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("toasts.loadFailed"));
        throw error;
      }
    },
  });

  // Stats come from the paged (non-search) call; keep the last ones while searching.
  const [stats, setStats] = React.useState(EMPTY_STATS);
  const latestStats = query.data?.stats;
  if (latestStats && latestStats !== stats) setStats(latestStats);

  const refreshUsers = async () => {
    await query.refetch();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon />
            {t("addAccount")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={UsersIcon}
          label={t("stats.total")}
          value={format.number(stats.total_users, "integer")}
          loading={query.isPending}
        />
        <StatCard
          icon={TrendingUpIcon}
          label={t("stats.week")}
          value={format.number(stats.users_this_week, "integer")}
          loading={query.isPending}
        />
        <StatCard
          icon={UserPlusIcon}
          label={t("stats.today")}
          value={format.number(stats.users_today, "integer")}
          loading={query.isPending}
        />
      </div>

      <div className="relative md:max-w-sm">
        <SearchIcon aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="ps-9"
        />
      </div>

      <UsersTable
        users={query.data?.users ?? []}
        isLoading={query.isPending || (query.isFetching && query.isPlaceholderData)}
        searchQuery={debouncedSearchQuery}
        currentPage={currentPage}
        lastPage={query.data?.lastPage ?? 1}
        total={query.data?.total ?? 0}
        onPageChange={setCurrentPage}
        onUsersChanged={refreshUsers}
      />

      {isSearching && <p className="text-caption font-normal text-fg-3">{t("searchNote")}</p>}

      <AddUserDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onCreated={refreshUsers} />
    </div>
  );
}
