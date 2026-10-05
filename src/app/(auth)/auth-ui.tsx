"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { fakeRequest, startSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export function AuthHeading({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-display text-[36px] leading-[42px] sm:text-[44px] sm:leading-[48px]">{title}</h1>
      {description && <p className="text-body-lg text-fg-2">{description}</p>}
    </div>
  );
}

/** Google's mark is not licensed yet, so a neutral "G" tile stands in. */
export function GoogleButton({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="w-full font-medium"
      loading={pending}
      onClick={async () => {
        setPending(true);
        await fakeRequest(900);
        startSession();
        window.location.assign(next);
      }}
    >
      <span
        aria-hidden
        className="grid size-5 place-items-center rounded-sm bg-surface-2 text-[11px] font-bold text-fg"
      >
        {t("googleMonogram")}
      </span>
      {t("google")}
    </Button>
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
