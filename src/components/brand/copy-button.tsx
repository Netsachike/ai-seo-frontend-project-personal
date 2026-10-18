"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";

/** Copies `value` to the clipboard and confirms with a tick for two seconds. */
export function CopyButton({
  value,
  label,
  size = "sm",
  variant = "secondary",
  iconOnly = false,
}: {
  value: string;
  /** Visible text, and the accessible name when `iconOnly`. Defaults to "Copy". */
  label?: string;
  size?: "sm" | "md";
  variant?: "secondary" | "ghost";
  iconOnly?: boolean;
}) {
  const t = useTranslations("shared.copy");
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const text = label ?? t("label");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
      toast.success(t("done"));
    } catch {
      toast.error(t("failed"));
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? (size === "sm" ? "icon-sm" : "icon") : size}
      disabled={!value}
      onClick={() => void copy()}
      aria-label={iconOnly ? text : undefined}
    >
      {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
      {!iconOnly && (copied ? t("copied") : text)}
    </Button>
  );
}
