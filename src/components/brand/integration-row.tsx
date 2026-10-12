"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PlatformLogo, platformLogos } from "./platform-logo";

/**
 * The provider's logo on a white tile (white in both themes, so dark marks
 * stay visible), or a neutral monogram when there's no file. Not translated.
 */
export function IntegrationTile({
  monogram,
  logo,
  className,
}: {
  monogram: string;
  /** Key into `platformLogos`. */
  logo?: string;
  className?: string;
}) {
  const hasLogo = Boolean(logo && platformLogos[logo]);
  return (
    <span
      aria-hidden
      translate="no"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-md border border-border font-mono text-[11px] font-medium text-fg-2",
        hasLogo ? "bg-white" : "bg-surface-2",
        className,
      )}
    >
      {hasLogo ? <PlatformLogo platform={logo!} size={24} /> : monogram}
    </span>
  );
}

export type IntegrationStatus = "connected" | "notConnected" | "comingSoon" | "connecting" | "tracking" | "paused";

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const t = useTranslations("integrationStatus");
  if (status === "connected" || status === "tracking")
    return (
      <Badge variant="success">
        <CheckIcon />
        {t(status)}
      </Badge>
    );
  if (status === "comingSoon") return <Badge variant="neutral">{t("comingSoon")}</Badge>;
  if (status === "connecting") return <Badge variant="blue">{t("connecting")}</Badge>;
  if (status === "paused") return <Badge variant="outline">{t("paused")}</Badge>;
  return <Badge variant="outline">{t("notConnected")}</Badge>;
}

/** Name, one line on what it's for, status, and the action. */
export function IntegrationRow({
  monogram,
  logo,
  name,
  description,
  status,
  detail,
  action,
  children,
  className,
}: {
  monogram: string;
  logo?: string;
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
        <IntegrationTile monogram={monogram} logo={logo} />
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
