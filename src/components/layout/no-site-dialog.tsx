"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { useSetupProgress } from "@/features/site-setup/progress";
import { NEW_SITE_PATH, setupPath } from "@/features/site-setup/steps";
import { useSites } from "@/features/workspace/hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShell } from "./shell-context";

/**
 * Opened by a site-only link (Overview, Rankings…) while no site is open,
 * e.g. from settings before any site was set up. Points at the one thing to
 * do next: finish a setup left halfway, pick a site, or add the first one.
 */
export function NoSiteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("shell.noSite");
  const { workspace } = useShell();
  const sites = useSites(open ? workspace?.work_space_id : undefined);
  const steps = useSetupProgress((s) => s.steps);

  const list = sites.data ?? [];
  const pending = list.find((site) => steps[site.id]);
  const pendingStep = pending ? steps[pending.id] : undefined;
  const next =
    pending && pendingStep
      ? {
          title: t("pendingTitle", { name: pending.name }),
          body: t("pendingBody"),
          href: setupPath(pending.id, pendingStep),
          label: t("finish"),
        }
      : list.length > 0
        ? { title: t("chooseTitle"), body: t("chooseBody"), href: "/sites", label: t("choose") }
        : { title: t("addTitle"), body: t("addBody"), href: NEW_SITE_PATH, label: t("add") };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{next.title}</DialogTitle>
          <DialogDescription>{next.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("later")}
          </Button>
          <Button asChild variant="primary" loading={sites.isPending && Boolean(workspace)}>
            <Link href={next.href} onClick={() => onOpenChange(false)}>
              {next.label}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
