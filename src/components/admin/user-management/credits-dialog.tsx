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

/** The backend's largest value for both calls. */
const MAX_CREDITS = 1_000_000_000;

/**
 * - `add`: adds to the balance (`POST /admin/users/add-api-credits`), 1 or more, default 100.
 * - `set`: sets the exact balance (`PUT /users/{user}/credits`), 0 or more, starting from the current one.
 * Whole numbers only. The reason is optional and shows in the wallet history.
 */
export function CreditsDialog({
  mode,
  isOpen,
  user,
  currentBalance,
  isSubmitting = false,
  onClose,
  onSubmit,
}: {
  mode: "add" | "set";
  isOpen: boolean;
  user: User | null;
  /** The user's available credits, when known: the starting value for `set`. */
  currentBalance?: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (credits: number, description: string | null) => Promise<void>;
}) {
  const t = useTranslations(`admin.users.credits.${mode}`);
  const tShared = useTranslations("admin.users.credits");
  const tCommon = useTranslations("common");
  const min = mode === "add" ? 1 : 0;
  const initial = mode === "add" ? "100" : String(currentBalance ?? 0);
  const [amount, setAmount] = React.useState(initial);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Start from the defaults each time the dialog opens.
  const [openFor, setOpenFor] = React.useState<User | null>(null);
  if (isOpen && user && openFor !== user) {
    setOpenFor(user);
    setAmount(initial);
    setReason("");
    setError(null);
  }
  if (!isOpen && openFor) setOpenFor(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credits = Number(amount);
    if (amount.trim() === "" || !Number.isInteger(credits) || credits < min || credits > MAX_CREDITS) {
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
                min={min}
                max={MAX_CREDITS}
                step={1}
                className="num"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            )}
          </FormField>
          <FormField label={tShared("reason")} helper={tShared("reasonHelper")}>
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
