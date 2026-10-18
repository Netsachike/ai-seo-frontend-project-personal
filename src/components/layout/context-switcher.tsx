"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronsUpDownIcon, LayersIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { AllUserWorkspace } from "@/types/types";
import { accountHref } from "@/features/account/routes";
import { cn } from "@/lib/utils";
import { useCreateWorkspace, useSwitchWorkspace, workspaceRole, workspaceTarget } from "@/features/workspace/hooks";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormField } from "@/components/forms/form-field";
import { EntityAvatar } from "./avatars";
import { useShell } from "./shell-context";

/** Lists longer than this get a search field. */
const SEARCH_THRESHOLD = 6;

const triggerClass =
  "flex h-9 min-w-0 items-center gap-2 rounded-md px-2 text-small font-medium text-fg hover:bg-surface-2 aria-expanded:bg-surface-2";

/**
 * The workspace in the top bar (and the mobile nav). Sites are picked on the
 * sites page, so there is no brand dropdown beside it.
 */
export function WorkspaceSwitcher({ className, full = false }: { className?: string; full?: boolean }) {
  const t = useTranslations("shell.switcher");
  const tRole = useTranslations("roles");
  const { workspace, workspaces } = useShell();
  const switchWorkspace = useSwitchWorkspace();
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const router = useRouter();
  if (!workspace) return null;
  const name = workspace.workspace.name;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={t("workspaceTrigger", { name })}
          className={cn(triggerClass, full && "h-12 w-full border border-border bg-surface px-3", className)}
        >
          <EntityAvatar name={name} />
          <span className={cn("truncate", full ? "flex-1 text-start" : "max-w-40")} title={name}>
            {name}
          </span>
          {full && <ChevronsUpDownIcon aria-hidden className="size-4 text-fg-3" />}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0">
          <SwitcherList<AllUserWorkspace>
            heading={t("switchWorkspace")}
            searchPlaceholder={t("searchWorkspaces")}
            empty={t("noMatches")}
            items={workspaces}
            activeId={String(workspace.work_space_id)}
            getId={(w) => String(w.work_space_id)}
            getName={(w) => w.workspace.name}
            getMeta={(w) => tRole(workspaceRole(w))}
            onSelect={(w) => {
              setOpen(false);
              if (w.work_space_id !== workspace.work_space_id) void switchWorkspace(workspaceTarget(w));
            }}
            footer={[
              {
                key: "all",
                icon: LayersIcon,
                label: t("viewAllWorkspaces"),
                onSelect: () => {
                  setOpen(false);
                  router.push(accountHref.settings("workspaces"));
                },
              },
              {
                key: "create",
                icon: PlusIcon,
                label: t("createWorkspace"),
                onSelect: () => {
                  setOpen(false);
                  setCreating(true);
                },
              },
            ]}
          />
        </PopoverContent>
      </Popover>
      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

type FooterAction = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
};

function SwitcherList<T>({
  heading,
  searchPlaceholder,
  empty,
  items,
  activeId,
  getId,
  getName,
  getMeta,
  metaMono = false,
  onSelect,
  footer,
}: {
  heading: string;
  searchPlaceholder: string;
  empty: string;
  items: T[];
  activeId: string;
  getId: (item: T) => string;
  getName: (item: T) => string;
  getMeta: (item: T) => string;
  metaMono?: boolean;
  onSelect: (item: T) => void;
  footer: FooterAction[];
}) {
  return (
    <Command loop>
      {items.length > SEARCH_THRESHOLD && <CommandInput placeholder={searchPlaceholder} />}
      <CommandList className="max-h-80">
        <CommandEmpty>{empty}</CommandEmpty>
        <CommandGroup heading={heading}>
          {items.map((item) => {
            const id = getId(item);
            const active = id === activeId;
            return (
              <CommandItem
                key={id}
                value={`${getName(item)} ${id}`}
                onSelect={() => onSelect(item)}
                className="min-h-12"
              >
                <EntityAvatar name={getName(item)} size={28} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-small font-medium text-fg">{getName(item)}</span>
                  <span
                    dir={metaMono ? "ltr" : undefined}
                    className={cn("truncate text-caption font-normal text-fg-3", metaMono && "text-start font-mono")}
                  >
                    {getMeta(item)}
                  </span>
                </span>
                {active && <CheckIcon aria-hidden className="size-4 text-fg!" />}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          {footer.map(({ key, icon: Icon, label, onSelect: select }) => (
            <CommandItem key={key} value={`__${key}`} onSelect={select}>
              <Icon className="size-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("shell.createWorkspace");
  const tCommon = useTranslations("common");
  const create = useCreateWorkspace();
  const switchWorkspace = useSwitchWorkspace();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return setError(t("required"));
    if (value.length > 80) return setError(t("tooLong"));
    create.mutate(value, {
      onSuccess: (response) => {
        onOpenChange(false);
        setName("");
        if (response.workspace) void switchWorkspace({ id: response.workspace.id, name: response.workspace.name });
      },
      onError: () => toast.error(t("failed")),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <FormField label={t("name")} error={error} helper={t("helper")}>
            {(props) => (
              <Input
                {...props}
                autoFocus
                value={name}
                maxLength={120}
                placeholder={t("placeholder")}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(undefined);
                }}
              />
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={create.isPending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
