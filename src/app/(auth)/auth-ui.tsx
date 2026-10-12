"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function AuthHeading({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-display text-[36px] leading-[42px] sm:text-[44px] sm:leading-[48px]">{title}</h1>
      {description && <p className="text-body-lg text-fg-2">{description}</p>}
    </div>
  );
}

/**
 * Google's mark is not licensed yet, so a neutral "G" tile stands in. The
 * backend has no Google sign-in endpoint yet, so pressing it explains that
 * instead of signing in.
 */
export function GoogleButton() {
  const t = useTranslations("auth");
  const noteId = React.useId();
  const [unavailable, setUnavailable] = React.useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full font-medium"
        aria-describedby={unavailable ? noteId : undefined}
        onClick={() => setUnavailable(true)}
      >
        <span
          aria-hidden
          className="grid size-5 place-items-center rounded-sm bg-surface-2 text-[11px] font-bold text-fg"
        >
          {t("googleMonogram")}
        </span>
        {t("google")}
      </Button>
      {unavailable && (
        <p id={noteId} role="status" className="text-caption font-normal text-fg-3">
          {t("errors.googleUnavailable")}
        </p>
      )}
    </div>
  );
}

export function OrDivider() {
  const t = useTranslations("auth");
  return (
    <div className="flex items-center gap-3 text-caption font-normal text-fg-3">
      <span aria-hidden className="h-px flex-1 bg-border" />
      {t("or")}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-md bg-danger-bg px-3 py-2.5 text-small text-danger">
      {children}
    </p>
  );
}
