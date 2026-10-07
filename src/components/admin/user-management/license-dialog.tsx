"use client";

import { TicketIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { User } from "@/types/shared";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** AppSumo licence details for users who activated through AppSumo. */
export function LicenseDialog({ isOpen, user, onClose }: { isOpen: boolean; user: User | null; onClose: () => void }) {
  const t = useTranslations("admin.users.license");
  const format = useFormatter();
  const license = user?.appsumo_license ?? null;
  const isActive = license?.status?.toLowerCase() === "active";

  const formatDate = (value: string | null | undefined) => {
    if (!value) return t("none");
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : format.dateTime(date, { dateStyle: "medium", timeStyle: "short" });
  };

  const rows: Array<[string, string]> = license
    ? [
        [t("rows.ticket"), `#${license.id}`],
        [t("rows.tier"), t("tierValue", { tier: license.tier })],
        [t("rows.event"), license.event],
        [t("rows.lastEvent"), license.last_event ?? t("none")],
        [t("rows.activated"), license.activated ? t("yes") : t("no")],
        [t("rows.test"), license.is_test ? t("yes") : t("no")],
        [t("rows.prevKey"), license.prev_license_key ?? t("none")],
        [t("rows.activatedAt"), formatDate(license.activated_at)],
        [t("rows.deactivatedAt"), formatDate(license.deactivated_at)],
        [t("rows.upgradedAt"), formatDate(license.upgraded_at)],
        [t("rows.downgradedAt"), formatDate(license.downgraded_at)],
      ]
    : [];

  return (
    <Dialog open={isOpen && Boolean(user)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader className="flex-row items-center gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-bg text-blue-ink">
            <TicketIcon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription className="truncate">{user?.name || user?.email}</DialogDescription>
          </div>
        </DialogHeader>

        {!license ? (
          <p className="py-6 text-center text-body text-fg-2">{t("empty")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-overline text-fg-2">{t("key")}</span>
                <span dir="ltr" className="truncate font-mono text-small text-fg">
                  {license.license_key}
                </span>
              </div>
              <Badge variant={isActive ? "success" : "neutral"} shape="pill">
                {license.status}
              </Badge>
            </div>
            <dl className="divide-y divide-border rounded-md border border-border">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <dt className="text-caption text-fg-3">{label}</dt>
                  <dd className="text-end text-small font-medium text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
