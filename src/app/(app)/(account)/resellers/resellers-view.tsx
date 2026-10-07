"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, StoreIcon, Trash2Icon, TrendingUpIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { canUseResellerConsole } from "@/lib/plan-core";
import resellerService from "@/services/reseller";
import type { User } from "@/types/shared";
import { accountKeys } from "@/features/account/query-keys";
import { useSessionUser } from "@/features/account/use-session-user";
import { ConfirmDialog } from "@/components/account/confirm-dialog";
import { LockedState } from "@/components/account/locked-state";
import { ResellerDialog, type ResellerFormValues } from "@/components/account/reseller-dialog";
import { StatCard } from "@/components/account/stat-card";
import { EmptyState } from "@/components/brand/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Reseller console: admins, or the Enterprise (`reseller`) plan. White Label alone doesn't open it. */
export function ResellersView() {
  const t = useTranslations("account.resellers");
  const session = useSessionUser();

  if (session === undefined) return <Skeleton className="h-96" />;
  if (!canUseResellerConsole(session)) return <LockedState title={t("lockedTitle")} body={t("lockedBody")} />;
  return <ResellersConsole />;
}

function ResellersConsole() {
  const t = useTranslations("account.resellers");
  const format = useFormatter();

  const resellersQuery = useQuery({
    queryKey: accountKeys.resellers(),
    retry: false,
    queryFn: async () => {
      try {
        const response = await resellerService.getAllResellers();
        return {
          users: response.users ?? [],
          stats: {
            total: Number(response.sumOfUsers) || 0,
            today: Number(response.sumOfUsersToday) || 0,
            thisWeek: Number(response.sumOfUsersThisWeek) || 0,
          },
        };
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("toasts.loadFailed"));
        throw error;
      }
    },
  });
  const resellers = resellersQuery.data?.users ?? [];
  const stats = resellersQuery.data?.stats ?? { total: 0, today: 0, thisWeek: 0 };
  const isLoading = resellersQuery.isPending;
  const fetchResellers = () => resellersQuery.refetch();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isMutating, setIsMutating] = React.useState(false);
  const [resellerToEdit, setResellerToEdit] = React.useState<User | null>(null);
  const [resellerToDelete, setResellerToDelete] = React.useState<User | null>(null);

  async function handleResellerSubmit(values: ResellerFormValues) {
    setIsMutating(true);
    try {
      if (resellerToEdit) {
        await resellerService.updateReseller({
          id: resellerToEdit.id,
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          is_active: values.is_active,
        });

        if (values.password) {
          await resellerService.updateResellerPassword({
            id: resellerToEdit.id,
            password: values.password,
            password_confirmation: values.password_confirmation,
          });
        }

        toast.success(t("toasts.updated"));
      } else {
        await resellerService.addReseller({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          password: values.password,
          is_active: values.is_active,
        });
        toast.success(t("toasts.added"));
      }

      setIsModalOpen(false);
      setResellerToEdit(null);
      await fetchResellers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.saveFailed"));
    } finally {
      setIsMutating(false);
    }
  }

  async function confirmDeleteReseller() {
    if (!resellerToDelete) return;
    setIsMutating(true);
    try {
      await resellerService.deleteReseller({ id: resellerToDelete.id });
      toast.success(t("toasts.deleted"));
      setResellerToDelete(null);
      await fetchResellers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.deleteFailed"));
    } finally {
      setIsMutating(false);
    }
  }

  const displayName = (reseller: User) =>
    reseller.name || `${reseller.first_name || ""} ${reseller.last_name || ""}`.trim() || t("fallbackName");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setResellerToEdit(null);
              setIsModalOpen(true);
            }}
          >
            <PlusIcon />
            {t("add")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={UsersIcon}
          label={t("stats.total")}
          hint={t("stats.totalHint")}
          value={format.number(stats.total, "integer")}
          loading={isLoading}
        />
        <StatCard
          icon={UserPlusIcon}
          label={t("stats.today")}
          hint={t("stats.todayHint")}
          value={t("stats.plus", { count: format.number(stats.today, "integer") })}
          loading={isLoading}
        />
        <StatCard
          icon={TrendingUpIcon}
          label={t("stats.week")}
          hint={t("stats.weekHint")}
          value={t("stats.plus", { count: format.number(stats.thisWeek, "integer") })}
          loading={isLoading}
        />
      </div>

      <Card className="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5" aria-busy>
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        ) : resellers.length === 0 ? (
          <div className="p-5">
            <EmptyState compact icon={StoreIcon} title={t("emptyTitle")} description={t("emptyBody")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.email")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-end">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.map((reseller) => {
                const isActive = Number(reseller.is_active) === 1;
                const name = displayName(reseller);
                return (
                  <TableRow key={reseller.id}>
                    <TableCell className="font-medium text-fg">{name}</TableCell>
                    <TableCell dir="ltr" className="text-start text-fg-2">
                      {reseller.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isActive ? "success" : "danger"} shape="pill">
                        {isActive ? t("active") : t("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isMutating}
                          aria-label={t("editAria", { name })}
                          onClick={() => {
                            setResellerToEdit(reseller);
                            setIsModalOpen(true);
                          }}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isMutating}
                          aria-label={t("deleteAria", { name })}
                          className="text-danger hover:bg-danger-bg hover:text-danger"
                          onClick={() => setResellerToDelete(reseller)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <ResellerDialog
        isOpen={isModalOpen}
        isSubmitting={isMutating}
        resellerToEdit={resellerToEdit}
        onClose={() => {
          if (isMutating) return;
          setResellerToEdit(null);
          setIsModalOpen(false);
        }}
        onSubmit={handleResellerSubmit}
      />

      <ConfirmDialog
        open={Boolean(resellerToDelete)}
        onOpenChange={(open) => {
          if (!open) setResellerToDelete(null);
        }}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.body", {
          name: resellerToDelete ? resellerToDelete.name || resellerToDelete.email : "",
        })}
        confirmLabel={t("deleteDialog.confirm")}
        isPending={isMutating}
        onConfirm={confirmDeleteReseller}
      />
    </div>
  );
}
