"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { isOnboardingStep, onboardingSteps, type OnboardingStep } from "@/features/onboarding/data";
import { useOnboarding } from "@/features/onboarding/store";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "./theme-toggle";

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("onboarding");
  const segment = usePathname().split("/")[2] ?? "brand";
  const current: OnboardingStep = isOnboardingStep(segment) ? segment : "brand";
  const index = onboardingSteps.indexOf(current);
  const completed = useOnboarding((s) => s.completed);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:px-8">
          <Logo />
          <ol aria-label={t("progressLabel")} className="mx-auto hidden items-center gap-1.5 md:flex">
            {onboardingSteps.map((step, i) => {
              const done = completed.includes(step) && i < index;
              const now = step === current;
              const reachable = done || completed.includes(onboardingSteps[i - 1] ?? "brand") || i === 0;
              const pill = (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 place-items-center rounded-full font-mono text-[11px]",
                      done
                        ? "bg-success text-ink-fg dark:text-signal-ink"
                        : now
                          ? "bg-ink text-ink-fg"
                          : "bg-border text-fg-2",
                    )}
                  >
                    {done ? <CheckIcon className="size-3" strokeWidth={2.5} /> : i + 1}
                  </span>
                  {t(`steps.${step}`)}
                  {done && <span className="sr-only">{t("stepDone")}</span>}
                </>
              );
              const cls = cn(
                "flex h-8 items-center gap-2 rounded-full ps-1.5 pe-3 text-small whitespace-nowrap",
                now ? "bg-surface-2 font-semibold text-fg" : "font-medium text-fg-2",
              );
              return (
                <li key={step}>
                  {!now && reachable && step !== "scan" ? (
                    <Link href={`/onboarding/${step}`} className={cn(cls, "hover:bg-surface-2 hover:text-fg")}>
                      {pill}
                    </Link>
                  ) : (
                    <span aria-current={now ? "step" : undefined} className={cls}>
                      {pill}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="ms-auto text-small font-medium text-fg-2 md:hidden">
            {t("stepOf", { step: index + 1, total: onboardingSteps.length })}
          </p>
          <div className="flex items-center gap-1 md:ms-0">
            <ThemeToggle persist={false} className="hidden sm:inline-flex" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/">{t("saveExit")}</Link>
            </Button>
          </div>
        </div>
        <div aria-hidden className="h-0.5 bg-surface-2 md:hidden">
          <div
            className="h-full bg-ink transition-[width] duration-320 ease-out"
            style={{ width: `${((index + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 py-10 md:px-8 md:py-14">{children}</main>
    </div>
  );
}

/** Overline, headline and the step's footer actions. */
export function StepFrame({
  step,
  title,
  description,
  children,
  hint,
  onContinue,
  continueLabel,
  continueDisabled,
  continueLoading,
  continueVariant = "primary",
  back,
  wide = false,
  secondary,
}: {
  step: OnboardingStep;
  title: string;
  description: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  /** Drops to secondary when the screen has its own primary action. */
  continueVariant?: "primary" | "secondary";
  back?: OnboardingStep;
  wide?: boolean;
  secondary?: React.ReactNode;
}) {
  const t = useTranslations("onboarding");
  return (
    <div className={cn("flex w-full flex-col gap-8", wide ? "max-w-[760px]" : "max-w-[600px]")}>
      <div className="flex flex-col gap-2">
        <span className="text-overline text-fg-3">
          {t("stepOf", { step: onboardingSteps.indexOf(step) + 1, total: onboardingSteps.length })}
        </span>
        <h1 className="text-[32px] leading-[38px] font-semibold tracking-[-0.025em] sm:text-display">{title}</h1>
        <p className="text-body-lg text-fg-2">{description}</p>
      </div>
      {children}
      <div className="flex flex-col-reverse gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
        {back && (
          <Button asChild variant="ghost" size="lg" className="self-start px-3">
            <Link href={`/onboarding/${back}`}>
              <ArrowLeftIcon className="rtl:-scale-x-100" />
              {t("back")}
            </Link>
          </Button>
        )}
        {hint && <p className="text-small text-fg-3 sm:me-auto">{hint}</p>}
        <div className="flex flex-col-reverse gap-2 sm:ms-auto sm:flex-row sm:items-center">
          {secondary}
          <Button
            variant={continueVariant}
            size="lg"
            onClick={onContinue}
            disabled={continueDisabled}
            loading={continueLoading}
            className="w-full sm:w-auto"
          >
            {continueLabel ?? t("continue")}
            <ArrowRightIcon className="rtl:-scale-x-100" />
          </Button>
        </div>
      </div>
    </div>
  );
}
