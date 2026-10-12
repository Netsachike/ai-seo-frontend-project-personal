"use client";

import * as React from "react";
import { EyeIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, UserCogIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import adminService from "@/services/admin";
import creditService from "@/services/credits";
import type { User } from "@/types/types";
import { ConfirmDialog } from "@/components/account/confirm-dialog";
import { EmptyState } from "@/components/brand/empty-state";
import { UserAvatar } from "@/components/layout/avatars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditsDialog } from "./credits-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { LicenseDialog } from "./license-dialog";
import { getSubscriptions, getUserCreditBalance, getUserDisplayName, type SubscriptionDisplay } from "./user-utils";

/** Paged user list with per-row actions. Pagination is off while searching. */
export function UsersTable({
  users,
  isLoading,
  searchQuery,
  currentPage,
  lastPage,
  total,
  onPageChange,
  onUsersChanged,
}: {
  users: User[];
  isLoading: boolean;
  searchQuery: string;
  currentPage: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onUsersChanged: () => Promise<void>;
}) {
  const t = useTranslations("admin.users");
  const tPlan = useTranslations("account.plans");
  const tAddon = useTranslations("account.addons");
  const tBilling = useTranslations("account.billingTypes");
  const format = useFormatter();
  const [isMutating, setIsMutating] = React.useState(false);
  const [editUser, setEditUser] = React.useState<User | null>(null);
  const [addCreditUser, setAddCreditUser] = React.useState<User | null>(null);
  const [updateCreditUser, setUpdateCreditUser] = React.useState<User | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null);
  const [subscriptionsUser, setSubscriptionsUser] = React.useState<User | null>(null);
  const [licenseUser, setLicenseUser] = React.useState<User | null>(null);

  const isSearching = searchQuery.trim().length > 0;

  const filteredUsers = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const fullName = getUserDisplayName(user).toLowerCase();
      const email = (user.email ?? "").toLowerCase();
      const role = (user.role ?? "").toLowerCase();
      return fullName.includes(query) || email.includes(query) || role.includes(query);
    });
  }, [searchQuery, users]);

  async function run(action: () => Promise<{ message?: string }>, fallbackSuccess: string, fallbackError: string) {
    setIsMutating(true);
    try {
      const response = await action();
      toast.success(response.message || fallbackSuccess);
      await onUsersChanged();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : fallbackError);
      return false;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleToggleActivation(user: User) {
    if (Number(user.is_active) === 1) {
      await run(() => adminService.deactivateUser(user.id), t("toasts.deactivated"), t("toasts.activationFailed"));
    } else {
      await run(() => adminService.activateUser(user.id), t("toasts.activated"), t("toasts.activationFailed"));
    }
  }

  async function handleDeleteUser() {
    if (!deleteUser) return;
    const ok = await run(() => adminService.deleteUser(deleteUser.id), t("toasts.deleted"), t("toasts.deleteFailed"));
    if (ok) setDeleteUser(null);
  }

  async function handleAddCredits(amount: number) {
    if (!addCreditUser) return;
    const ok = await run(
      () => creditService.addCreditsForUsers({ user_id: addCreditUser.id, amount }),
      t("toasts.creditsAdded"),
      t("toasts.creditsAddFailed"),
    );
    if (ok) setAddCreditUser(null);
  }

  async function handleUpdateCredits(amount: number) {
    if (!updateCreditUser) return;
    const ok = await run(
      () => creditService.updateCreditForUsers({ user_id: updateCreditUser.id, amount }),
      t("toasts.creditsUpdated"),
      t("toasts.creditsUpdateFailed"),
    );
    if (ok) setUpdateCreditUser(null);
  }

  const billingLabel = (value: string | null) =>
    value ? (tBilling.has(value as "monthly") ? tBilling(value as "monthly") : value) : t("none");
  const subscriptionLabel = (item: SubscriptionDisplay) =>
    item.key === "plan"
      ? t("subscriptions.planLabel", { plan: tPlan(`${item.plan}.label`) })
      : tAddon(`${item.key}.name`);

  return (
    <>
      <Card className="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5" aria-busy>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-5">
            <EmptyState compact icon={UsersIcon} title={t("emptyTitle")} description={t("emptyBody")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.email")}</TableHead>
                <TableHead>{t("columns.role")}</TableHead>
                <TableHead className="text-end">{t("columns.credits")}</TableHead>
                <TableHead>{t("columns.subscriptions")}</TableHead>
                <TableHead>{t("columns.license")}</TableHead>
                <TableHead className="text-end">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const subscriptions = getSubscriptions(user);
                const activeCount = subscriptions.filter((s) => s.status).length;
                const isActive = Number(user.is_active) === 1;
                const name = getUserDisplayName(user);

                return (
                  <TableRow key={user.id} className="h-16">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={name} size={32} />
                        <div className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-2 font-medium text-fg">
                            {name}
                            {!isActive && (
                              <Badge variant="danger" shape="pill">
                                {t("status.inactive")}
                              </Badge>
                            )}
                          </span>
                          <span className="text-caption font-normal text-fg-3">
                            {t("joined", { date: format.dateTime(new Date(user.created_at), "medium") })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell dir="ltr" className="text-start text-fg-2">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-end num text-fg">
                      {format.number(getUserCreditBalance(user), "integer")}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setSubscriptionsUser(user)}>
                        {t("activeCount", { count: activeCount })}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {user.license_key ? (
                        <div className="flex items-center gap-1.5">
                          <span dir="ltr" className="font-mono text-caption text-fg-2">
                            {user.license_key}
                          </span>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("viewLicenseAria", { name })}
                            onClick={() => setLicenseUser(user)}
                          >
                            <EyeIcon />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-fg-3">{t("none")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("accessAsAria", { name })}
                          onClick={() => toast.success(t("toasts.accessAsSoon", { name }))}
                        >
                          <UserCogIcon />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("editAria", { name })}
                          onClick={() => setEditUser(user)}
                        >
                          <PencilIcon />
                        </Button>
                        {/* Admin accounts can't be deleted from the console. */}
                        {user.role !== "admin" && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("deleteAria", { name })}
                            className="text-danger hover:bg-danger-bg hover:text-danger"
                            onClick={() => setDeleteUser(user)}
                          >
                            <Trash2Icon />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon-sm" variant="ghost" aria-label={t("moreAria", { name })}>
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem disabled={isMutating} onSelect={() => void handleToggleActivation(user)}>
                              {isActive ? t("actions.deactivate") : t("actions.activate")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setAddCreditUser(user)}>
                              {t("actions.addCredits")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setUpdateCreditUser(user)}>
                              {t("actions.updateCredits")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setSubscriptionsUser(user)}>
                              {t("actions.viewSubscriptions")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {!isSearching && lastPage > 1 && (
          <nav
            aria-label={t("pagination.label")}
            className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-3"
          >
            <p className="me-auto num text-caption font-normal text-fg-3">
              {t("pagination.total", { count: format.number(total, "integer") })}
            </p>
            <Button size="sm" disabled={currentPage <= 1 || isMutating} onClick={() => onPageChange(currentPage - 1)}>
              {t("pagination.previous")}
            </Button>
            <span className="num text-small text-fg-2">
              {t("pagination.page", { page: currentPage, last: lastPage })}
            </span>
            <Button
              size="sm"
              disabled={currentPage >= lastPage || isMutating}
              onClick={() => onPageChange(currentPage + 1)}
            >
              {t("pagination.next")}
            </Button>
          </nav>
        )}
      </Card>

      <EditUserDialog
        isOpen={Boolean(editUser)}
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={onUsersChanged}
      />
      <CreditsDialog
        mode="add"
        isOpen={Boolean(addCreditUser)}
        user={addCreditUser}
        isSubmitting={isMutating}
        onClose={() => setAddCreditUser(null)}
        onSubmit={handleAddCredits}
      />
      <CreditsDialog
        mode="update"
        isOpen={Boolean(updateCreditUser)}
        user={updateCreditUser}
        isSubmitting={isMutating}
        onClose={() => setUpdateCreditUser(null)}
        onSubmit={handleUpdateCredits}
      />
      <LicenseDialog isOpen={Boolean(licenseUser)} user={licenseUser} onClose={() => setLicenseUser(null)} />

      <ConfirmDialog
        open={Boolean(deleteUser)}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null);
        }}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.body", { name: deleteUser ? getUserDisplayName(deleteUser) : "" })}
        confirmLabel={t("deleteDialog.confirm")}
        isPending={isMutating}
        onConfirm={handleDeleteUser}
      />

      <Dialog open={Boolean(subscriptionsUser)} onOpenChange={(open) => !open && setSubscriptionsUser(null)}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{t("subscriptions.title")}</DialogTitle>
            <DialogDescription>{subscriptionsUser ? getUserDisplayName(subscriptionsUser) : ""}</DialogDescription>
          </DialogHeader>
          <Table containerClassName="rounded-md border border-border">
            <TableHeader>
              <TableRow>
                <TableHead>{t("subscriptions.columns.plan")}</TableHead>
                <TableHead>{t("subscriptions.columns.details")}</TableHead>
                <TableHead className="text-end">{t("subscriptions.columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subscriptionsUser ? getSubscriptions(subscriptionsUser) : []).map((item) => (
                <TableRow key={item.key}>
                  <TableCell className="text-fg">{subscriptionLabel(item)}</TableCell>
                  <TableCell className="text-fg-2">{billingLabel(item.billing)}</TableCell>
                  <TableCell className="text-end">
                    <Badge variant={item.status ? "success" : "neutral"} shape="pill">
                      {item.status ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
