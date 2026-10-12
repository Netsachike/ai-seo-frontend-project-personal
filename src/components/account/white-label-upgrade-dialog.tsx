"use client";

import Link from "next/link";
import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { accountHref } from "@/features/account/routes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Shown instead of the White Label tools to accounts without the add-on. */
export function WhiteLabelUpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("account.whiteLabel.upgrade");
  const tCommon = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <span aria-hidden className="grid size-11 place-items-center rounded-lg bg-signal text-signal-ink">
          <LockIcon className="size-5" />
        </span>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button asChild variant="agent">
            <Link href={accountHref.upgrade("whitelabel")} onClick={() => onOpenChange(false)}>
              {t("cta")}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
