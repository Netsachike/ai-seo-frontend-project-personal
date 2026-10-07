"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordStrength } from "@/components/account/password-strength";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const TEAM_ROLES = ["team_member", "client", "editor", "admin"] as const;

export type TeamMemberFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  password: string;
  confirmPassword: string;
  workspaceIds: number[];
};

export type WorkspaceOption = { id: number; name: string };

export function createEmptyTeamMemberForm(): TeamMemberFormState {
  return {
    firstName: "",
    lastName: "",
    email: "",
    role: "team_member",
    password: "",
    confirmPassword: "",
    workspaceIds: [],
  };
}

/**
 * Add or edit a team member. Validation and saving stay with the caller
 * (Settings → Team members), which owns the form state.
 */
export function TeamMemberDialog({
  open,
  isEditing,
  isSubmitting,
  form,
  workspaces,
  onChange,
  onToggleWorkspace,
  onClose,
  onSubmit,
}: {
  open: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  form: TeamMemberFormState;
  workspaces: WorkspaceOption[];
  onChange: (patch: Partial<TeamMemberFormState>) => void;
  onToggleWorkspace: (workspaceId: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("account.team.dialog");
  const tRoles = useTranslations("account.team.roles");
  const tCommon = useTranslations("common");
  const strengthId = React.useId();
  const passwordMismatch = form.confirmPassword.length > 0 && form.confirmPassword !== form.password;
  const requirement = isEditing ? t("optional") : t("required");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="max-w-[640px]">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? t("editTitle") : t("addTitle")}</DialogTitle>
            <DialogDescription>{isEditing ? t("editBody") : t("addBody")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("firstName")}>
              {(props) => (
                <Input
                  {...props}
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(e) => onChange({ firstName: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={t("lastName")}>
              {(props) => (
                <Input
                  {...props}
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(e) => onChange({ lastName: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={t("email")} className="sm:col-span-2">
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  dir="ltr"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => onChange({ email: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={t("role")} className="sm:col-span-2">
              {(props) => (
                <Select value={form.role} onValueChange={(role) => onChange({ role })}>
                  <SelectTrigger {...props} className="w-full sm:w-1/2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {tRoles(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label={t("password")} helper={requirement}>
              {(props) => (
                <PasswordInput
                  {...props}
                  autoComplete="new-password"
                  aria-describedby={[props["aria-describedby"], strengthId].filter(Boolean).join(" ")}
                  value={form.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                />
              )}
            </FormField>
            <FormField
              label={t("confirmPassword")}
              helper={requirement}
              error={passwordMismatch ? t("mismatch") : undefined}
            >
              {(props) => (
                <PasswordInput
                  {...props}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => onChange({ confirmPassword: e.target.value })}
                />
              )}
            </FormField>
            {form.password && <PasswordStrength id={strengthId} value={form.password} className="sm:col-span-2" />}
          </div>

          <fieldset className="flex flex-col gap-3 rounded-md border border-border bg-bg p-4">
            <legend className="sr-only">{t("workspaces")}</legend>
            <div className="flex flex-col gap-0.5">
              <p aria-hidden className="text-small font-medium text-fg">
                {t("workspaces")}
              </p>
              <p className="text-caption font-normal text-fg-3">{t("workspacesHelper")}</p>
            </div>
            {workspaces.length === 0 ? (
              <p className="text-small text-fg-3">{t("noWorkspaces")}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {workspaces.map((workspace) => {
                  const checked = form.workspaceIds.includes(workspace.id);
                  return (
                    <label
                      key={workspace.id}
                      className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-surface px-3 text-small text-fg transition-colors hover:border-border-strong has-data-[state=checked]:border-blue"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => onToggleWorkspace(workspace.id)} />
                      <span className="truncate">{workspace.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {isEditing ? tCommon("save") : t("addSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
