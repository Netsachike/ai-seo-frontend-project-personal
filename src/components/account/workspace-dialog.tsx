"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import type { Workspace } from "@/stores/workspace-store";
import { FormField } from "@/components/forms/form-field";
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

export type WorkspaceFormValues = {
  name: string;
  isActive: boolean;
  logoFile: File | null;
};

/** Create or edit a backend workspace: name, logo (create only) and the active switch. */
export function WorkspaceDialog({
  open,
  workspace,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  workspace: Workspace | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WorkspaceFormValues) => Promise<void>;
}) {
  const t = useTranslations("account.workspaces.dialog");
  const tCommon = useTranslations("common");
  const [name, setName] = React.useState("");
  const [isActive, setIsActive] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | undefined>();
  const switchId = React.useId();

  // Reset the form each time the dialog opens (adjusting state during render).
  const [seen, setSeen] = React.useState<{ open: boolean; workspace: Workspace | null }>({
    open: false,
    workspace: null,
  });
  if (seen.open !== open || seen.workspace !== workspace) {
    setSeen({ open, workspace });
    if (open) {
      setName(workspace?.name ?? "");
      setIsActive(Boolean(workspace?.active));
      setLogoFile(null);
      setError(undefined);
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("nameRequired"));
      return;
    }
    setError(undefined);
    await onSubmit({ name: trimmedName, isActive, logoFile });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-w-[480px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{workspace ? t("editTitle") : t("addTitle")}</DialogTitle>
            <DialogDescription>{workspace ? t("editBody") : t("addBody")}</DialogDescription>
          </DialogHeader>

          <FormField label={t("name")} error={error}>
            {(props) => (
              <Input
                {...props}
                autoFocus
                value={name}
                placeholder={t("namePlaceholder")}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError(undefined);
                }}
              />
            )}
          </FormField>

          {!workspace && (
            <FormField label={t("logo")} helper={t("logoHelper")}>
              {(props) => (
                <Input
                  {...props}
                  type="file"
                  accept="image/*"
                  className="h-auto py-2 file:me-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2.5 file:py-1 file:text-small file:font-medium file:text-fg"
                  onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                />
              )}
            </FormField>
          )}

          <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-bg px-4 py-3">
            <label htmlFor={switchId} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-small font-medium text-fg">{t("active")}</span>
              <span className="text-caption font-normal text-fg-3">{t("activeHelper")}</span>
            </label>
            <Switch id={switchId} checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {workspace ? tCommon("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
