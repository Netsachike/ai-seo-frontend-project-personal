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

/**
 * `add` adds credits to the balance (amount > 0, default 100); `update` sets
 * a new balance (amount ≥ 0, default 0).
 */
export function CreditsDialog({
  mode,
  isOpen,
  user,
  isSubmitting = false,
  onClose,
  onSubmit,
}: {
  mode: "add" | "update";
  isOpen: boolean;
  user: User | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
}) {
  const t = useTranslations(`admin.users.credits.${mode}`);
  const tCommon = useTranslations("common");
  const initial = mode === "add" ? "100" : "0";
  const [amount, setAmount] = React.useState(initial);

  // Start from the default each time the dialog opens.
  const [openFor, setOpenFor] = React.useState<User | null>(null);
  if (isOpen && user && openFor !== user) {
    setOpenFor(user);
    setAmount(initial);
  }
  if (!isOpen && openFor) setOpenFor(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || (mode === "add" ? parsed <= 0 : parsed < 0)) return;
    await onSubmit(parsed);
  }

  return (
    <Dialog open={isOpen && Boolean(user)} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="max-w-[420px]">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription dir="ltr" className="text-start">
              {user?.email}
            </DialogDescription>
          </DialogHeader>
          <FormField label={t("label")}>
            {(props) => (
              <Input
                {...props}
                type="number"
                inputMode="numeric"
                min={mode === "add" ? 1 : 0}
                className="num"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
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
