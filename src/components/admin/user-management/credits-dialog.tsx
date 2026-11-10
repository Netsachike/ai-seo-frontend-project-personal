"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import type { User } from "@/types/types";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** The backend's limits for one grant. */
const MIN_CREDITS = 1;
const MAX_CREDITS = 1_000_000_000;

/**
 * Adds API credits to a user's wallet (`POST /admin/users/add-api-credits`).
 * Whole numbers only; the reason is optional and shows in the wallet history.
 * Replaces the old "Add credits" and "Set credit balance" token dialogs.
 */
export function CreditsDialog({
  isOpen,
  user,
  isSubmitting = false,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  user: User | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (credits: number, description: string | null) => Promise<void>;
}) {
  const t = useTranslations("admin.users.credits");
  const tCommon = useTranslations("common");
  const [amount, setAmount] = React.useState("100");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Start from the defaults each time the dialog opens.
  const [openFor, setOpenFor] = React.useState<User | null>(null);
  if (isOpen && user && openFor !== user) {
    setOpenFor(user);
    setAmount("100");
    setReason("");
    setError(null);
  }
  if (!isOpen && openFor) setOpenFor(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credits = Number(amount);
    if (!Number.isInteger(credits) || credits < MIN_CREDITS || credits > MAX_CREDITS) {
      setError(t("invalid"));
      return;
    }
    setError(null);
    await onSubmit(credits, reason.trim() || null);
  }

  return (
    <Dialog open={isOpen && Boolean(user)} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="max-w-[420px]">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription dir="ltr" className="text-start">
              {user?.email}
            </DialogDescription>
          </DialogHeader>
          <FormField label={t("label")} helper={t("helper")} error={error ?? undefined}>
            {(props) => (
              <Input
                {...props}
                type="number"
                inputMode="numeric"
                min={MIN_CREDITS}
                max={MAX_CREDITS}
                step={1}
                className="num"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            )}
          </FormField>
          <FormField label={t("reason")} helper={t("reasonHelper")}>
            {(props) => (
              <Input
                {...props}
                maxLength={255}
                placeholder={t("reasonPlaceholder")}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
