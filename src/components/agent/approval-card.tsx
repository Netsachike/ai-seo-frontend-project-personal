"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Approval } from "@/lib/mocks/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/brand/status-badge";

/**
 * The single gate for any agent change to a live site: Approve / Edit / Reject.
 * The same approval is mirrored to Telegram; whichever answers first wins.
 */
export function ApprovalCard({
  approval,
  onEdit,
  onDecided,
  className,
}: {
  approval: Approval;
  onEdit?: () => void;
  onDecided?: (approval: Approval) => void;
  className?: string;
}) {
  const t = useTranslations("approval");
  const queryClient = useQueryClient();
  // Local result of this card's decision; the prop stays the source of truth otherwise.
  const [decided, setDecided] = React.useState<Approval | null>(null);
  const current = decided?.id === approval.id ? decided : approval;

  const decide = useMutation({
    // The decision is recorded here; the screen's `onDecided` makes the real API call (propose fixes, move opportunities).
    mutationFn: async (decision: "approve" | "reject") => ({
      status: decision === "approve" ? ("approved" as const) : ("rejected" as const),
    }),
    onSuccess: (result) => {
      const next = { ...approval, status: result.status };
      setDecided(next);
      onDecided?.(next);
      toast.success(next.status === "approved" ? t("approvedToast") : t("rejectedToast"));
      void queryClient.invalidateQueries({ queryKey: ["agent"] });
    },
    onError: () => toast.error(t("failedToast")),
  });

  const pending = current.status === "pending";
  const busy = decide.isPending ? decide.variables : null;

  return (
    <section
      aria-label={current.title}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card",
        !pending && "bg-bg",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 dir="auto" className="text-[14px] leading-5 font-semibold text-fg">
          {current.title}
        </h3>
        {pending ? (
          <StatusBadge status="needsApproval" />
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-caption",
              current.status === "approved" ? "text-success" : "text-fg-3",
            )}
          >
            {current.status === "approved" ? (
              <CheckIcon aria-hidden className="size-3.5" />
            ) : (
              <XIcon aria-hidden className="size-3.5" />
            )}
            {current.status === "approved" ? t("approved") : t("rejected")}
          </span>
        )}
      </header>

      {current.items.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 ps-[18px] text-small text-fg-2">
          {current.items.map((item) => (
            <li key={item} dir="auto" className="break-words">
              {item}
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            loading={busy === "approve"}
            disabled={decide.isPending}
            onClick={() => decide.mutate("approve")}
          >
            {t("approve")}
          </Button>
          <Button variant="secondary" size="sm" disabled={decide.isPending} onClick={onEdit}>
            <PencilIcon aria-hidden />
            {t("edit")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={busy === "reject"}
            disabled={decide.isPending}
            onClick={() => decide.mutate("reject")}
          >
            {t("reject")}
          </Button>
          {current.channels.includes("telegram") && (
            <span className="ms-auto text-caption font-normal text-fg-3">{t("alsoTelegram")}</span>
          )}
        </div>
      )}
    </section>
  );
}
