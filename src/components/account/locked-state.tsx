"use client";

import Link from "next/link";
import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { accountHref } from "@/features/account/routes";
import { Button } from "@/components/ui/button";

/** Shown in place of a plan-gated console (resellers, agency kit). */
export function LockedState({ title, body }: { title: string; body: string }) {
  const t = useTranslations("account.locked");
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-surface p-8 text-center shadow-card">
        <span aria-hidden className="grid size-12 place-items-center rounded-lg bg-signal text-signal-ink">
          <LockIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h2 text-fg">{title}</h1>
          <p className="text-body text-fg-2">{body}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="agent">
            <Link href={accountHref.upgrade()}>{t("upgrade")}</Link>
          </Button>
          <Button asChild>
            <Link href="/">{t("back")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
