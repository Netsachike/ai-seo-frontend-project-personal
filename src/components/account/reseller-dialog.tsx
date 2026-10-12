"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import type { User } from "@/types/types";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordStrength } from "@/components/account/password-strength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ResellerFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  is_active: boolean;
};

/**
 * Add or edit a reseller account. A password is required on add; on edit it
 * is optional and, when given, saved through the separate password endpoint.
 * Unlike the source app, the edit form is pre-filled and asks for a
 * confirmation, which the password endpoint requires.
 */
export function ResellerDialog({
  isOpen,
  isSubmitting,
  resellerToEdit,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isSubmitting: boolean;
  resellerToEdit: User | null;
  onClose: () => void;
  onSubmit: (values: ResellerFormValues) => Promise<void>;
}) {
  const t = useTranslations("account.resellers.dialog");
  const tCommon = useTranslations("common");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [showErrors, setShowErrors] = React.useState(false);
  const activeId = React.useId();
  const strengthId = React.useId();

  // Pre-fill on open (adjusting state during render).
  const [seenFor, setSeenFor] = React.useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  if (seenFor.open !== isOpen || seenFor.user !== resellerToEdit) {
    setSeenFor({ open: isOpen, user: resellerToEdit });
    if (isOpen) {
      setFirstName(resellerToEdit?.first_name ?? "");
      setLastName(resellerToEdit?.last_name ?? "");
      setEmail(resellerToEdit?.email ?? "");
      setIsActive(resellerToEdit ? Number(resellerToEdit.is_active) === 1 : true);
      setPassword("");
      setConfirmPassword("");
      setShowErrors(false);
    }
  }

  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const missing = (value: string) => (showErrors && !value.trim() ? t("required") : undefined);
  const passwordRequired = !resellerToEdit;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const firstNameTrimmed = firstName.trim();
    const lastNameTrimmed = lastName.trim();
    const emailTrimmed = email.trim();

    setShowErrors(true);
    if (!firstNameTrimmed || !lastNameTrimmed || !emailTrimmed) return;
    if (passwordRequired && (!password || !confirmPassword)) return;
    if (passwordMismatch) return;

    await onSubmit({
      first_name: firstNameTrimmed,
      last_name: lastNameTrimmed,
      email: emailTrimmed,
      password,
      password_confirmation: confirmPassword,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="max-w-[600px]">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{resellerToEdit ? t("editTitle") : t("addTitle")}</DialogTitle>
            <DialogDescription>{resellerToEdit ? t("editBody") : t("addBody")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("firstName")} error={missing(firstName)}>
              {(props) => <Input {...props} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
            </FormField>
            <FormField label={t("lastName")} error={missing(lastName)}>
              {(props) => <Input {...props} value={lastName} onChange={(e) => setLastName(e.target.value)} />}
            </FormField>
            <FormField label={t("email")} error={missing(email)} className="sm:col-span-2">
              {(props) => (
                <Input {...props} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </FormField>
            <FormField
              label={t("password")}
              helper={passwordRequired ? undefined : t("passwordOptional")}
              error={passwordRequired ? missing(password) : undefined}
            >
              {(props) => (
                <PasswordInput
                  {...props}
                  autoComplete="new-password"
                  aria-describedby={[props["aria-describedby"], strengthId].filter(Boolean).join(" ")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </FormField>
            <FormField
              label={t("confirmPassword")}
              error={passwordMismatch ? t("mismatch") : passwordRequired ? missing(confirmPassword) : undefined}
            >
              {(props) => (
                <PasswordInput
                  {...props}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              )}
            </FormField>
            {password && <PasswordStrength id={strengthId} value={password} className="sm:col-span-2" />}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-bg px-4 py-3">
            <label htmlFor={activeId} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-small font-medium text-fg">{t("active")}</span>
              <span className="text-caption font-normal text-fg-3">
                {isActive ? t("activeOn") : t("activeOff")}
              </span>
            </label>
            <Switch id={activeId} checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {resellerToEdit ? tCommon("save") : t("addSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
