"use client";

import * as React from "react";
import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ControlProps = {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Label above (13/500), helper or error below (12px). Errors show both a
 * border (via aria-invalid on the control) and a message.
 */
export function FormField({
  label,
  helper,
  error,
  className,
  children,
  labelAction,
}: {
  label: string;
  helper?: string;
  error?: string;
  className?: string;
  labelAction?: React.ReactNode;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const id = React.useId();
  const messageId = `${id}-message`;
  const message = error ?? helper;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? messageId : undefined,
      })}
      {message && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("text-[12px] leading-4", error ? "text-danger" : "text-fg-3")}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/** Read-only value (email, role): surface-2 fill, muted text and a lock. */
export function ReadOnlyField({
  label,
  value,
  helper,
  action,
}: {
  label: string;
  value: string;
  helper?: string;
  action?: React.ReactNode;
}) {
  const t = useTranslations("forms");
  return (
    <FormField label={label} helper={helper} labelAction={action}>
      {(props) => (
        <div className="relative">
          <Input {...props} readOnly value={value} className="pe-9" />
          <LockIcon
            aria-hidden
            className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-fg-3"
          />
          <span className="sr-only">{t("readOnly")}</span>
        </div>
      )}
    </FormField>
  );
}

/** Strips protocol, "www." is kept, and trailing slashes as the user types or pastes. */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function DomainInput({
  value,
  onChange,
  size = "md",
  status,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  /** Optional trailing status, e.g. crawl progress. */
  status?: React.ReactNode;
}) {
  const t = useTranslations("forms");
  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-stretch overflow-hidden rounded-md border border-border-strong bg-surface focus-within:border-blue has-aria-invalid:border-danger",
        size === "lg" ? "h-12" : "h-10",
        className,
      )}
    >
      <span
        dir="ltr"
        aria-hidden
        className="grid place-items-center border-e border-border bg-bg px-3 font-mono text-[13px] text-fg-3"
      >
        {t("protocol")}
      </span>
      <input
        {...props}
        type="text"
        dir="ltr"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(normalizeDomain(e.target.value))}
        placeholder={props.placeholder ?? t("domainPlaceholder")}
        className="min-w-0 flex-1 bg-transparent px-3 font-mono text-[14px] text-fg outline-hidden placeholder:text-fg-3 focus-visible:outline-none"
      />
      {status && <span className="flex shrink-0 items-center gap-1.5 pe-3 text-small font-medium">{status}</span>}
    </div>
  );
}
