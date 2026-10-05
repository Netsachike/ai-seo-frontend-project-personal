"use client";

import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

import { isRtl } from "@/i18n/config";

const Toaster = (props: ToasterProps) => {
  const { resolvedTheme = "light" } = useTheme();
  const locale = useLocale();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      position={isRtl(locale) ? "bottom-left" : "bottom-right"}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-blue" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-danger" />,
        loading: <Loader2Icon className="size-4 animate-spin text-fg-3" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--text)",
          "--normal-border": "var(--border)",
          "--border-radius": "8px",
          "--font-family": "var(--font-sans)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!shadow-pop !text-body !gap-2.5",
          description: "!text-fg-2 !text-small",
          actionButton: "!bg-ink !text-ink-fg !rounded-md !font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
