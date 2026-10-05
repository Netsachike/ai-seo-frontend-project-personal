"use client";

import { CircleAlertIcon, RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export const SUPPORT_EMAIL = "support@orbit.example";

/** Shared error copy with a retry. Used by every data screen. */
export function ErrorState({
  onRetry,
  compact,
  className,
}: {
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("shared");
  const tCommon = useTranslations("common");
  return (
    <EmptyState
      compact={compact}
      tone="danger"
      icon={CircleAlertIcon}
      className={className}
      title={t("errorTitle")}
      description={t("genericError", { email: SUPPORT_EMAIL })}
      action={
        onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RotateCwIcon />
            {tCommon("retry")}
          </Button>
        )
      }
    />
  );
}
