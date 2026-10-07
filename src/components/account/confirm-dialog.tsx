"use client";

import * as React from "react";
import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Confirmation for destructive or billing actions. The confirm button runs an
 * async handler and stays open (busy) until the caller closes it, so a failed
 * request leaves the dialog up to retry. Escape and Cancel are blocked while
 * the request is in flight.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  isPending = false,
  onConfirm,
  tone = "danger",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  tone?: "danger" | "primary";
}) {
  const t = useTranslations("common");
  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader className={cn(tone === "danger" && "flex-row items-start gap-3")}>
          {tone === "danger" && (
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-md bg-danger-bg text-danger">
              <TriangleAlertIcon className="size-[18px]" />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </div>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <Button variant="secondary" disabled={isPending} onClick={() => onOpenChange(false)}>
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button
            variant={tone === "danger" ? "destructive" : "primary"}
            loading={isPending}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
