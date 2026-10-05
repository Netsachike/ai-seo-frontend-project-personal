"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Neutral monogram tile until official marks are licensed. Not translated. */
export function IntegrationTile({ monogram, className }: { monogram: string; className?: string }) {
  return (
    <span
      aria-hidden
      translate="no"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-md border border-border bg-surface-2 font-mono text-[11px] font-medium text-fg-2",
        className,
      )}
    >
      {monogram}
    </span>
  );
}

export type IntegrationStatus = "connected" | "notConnected" | "comingSoon" | "connecting";

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const t = useTranslations("integrationStatus");
  if (status === "connected")
    return (
      <Badge variant="success">
        <CheckIcon />
        {t("connected")}
      </Badge>
    );
  if (status === "comingSoon") return <Badge variant="neutral">{t("comingSoon")}</Badge>;
  if (status === "connecting") return <Badge variant="blue">{t("connecting")}</Badge>;
  return <Badge variant="outline">{t("notConnected")}</Badge>;
}

/** Name, one line on what it's for, status, and the action. */
export function IntegrationRow({
  monogram,
  name,
  description,
  status,
  detail,
  action,
  children,
  className,
}: {
  monogram: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  detail?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card", className)}>
      <div className="flex flex-wrap items-start gap-3">
        <IntegrationTile monogram={monogram} />
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-h3 text-fg">{name}</h3>
            <IntegrationStatusBadge status={status} />
          </div>
          <p className="text-small text-fg-2">{description}</p>
          {detail && <div className="text-caption font-normal text-fg-3">{detail}</div>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </div>
  );
}
