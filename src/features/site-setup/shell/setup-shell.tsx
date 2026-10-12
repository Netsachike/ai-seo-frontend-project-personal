"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { useSessionUser } from "@/features/account/use-session-user";
import { Logo } from "@/components/brand/logo";
import { useSignOut } from "@/components/layout/profile-menu";
import { SETUP_SCROLL_ID } from "../hooks/use-stick-to-bottom";
import { dur } from "../motion";
import { SITES_PATH, stepFromPath, stepNumber, WIDE_STEPS } from "../steps";
import { SetupVisual } from "./setup-visual";
import { StepProgress } from "./step-progress";

/**
 * Persistent frame for site setup: logo, "Back to sites", progress and the
 * signed-in line never move; only the step body inside changes. Most steps
 * use a split layout with the visual pane; the plan step goes full width,
 * which crossfades the whole frame rather than resizing it.
 */
export function SetupShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("siteSetup.shell");
  const step = stepFromPath(usePathname());
  const wide = WIDE_STEPS.includes(step);
  const session = useSessionUser();
  const signOut = useSignOut();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={wide ? "wide" : "split"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: dur.base }}
        className="flex h-dvh bg-surface"
      >
        <div
          id={SETUP_SCROLL_ID}
          className={cn("flex min-w-0 flex-col overflow-y-auto", wide ? "flex-1" : "w-full lg:w-1/2")}
        >
          <header className="flex items-center justify-between gap-4 px-6 pt-6 sm:px-12 sm:pt-10">
            <Link href={SITES_PATH} aria-label={t("home")} className="rounded-md">
              <Logo />
            </Link>
            <Link
              href={SITES_PATH}
              className="flex items-center gap-2 rounded-md px-1 text-small font-medium text-fg hover:text-fg-2"
            >
              <ArrowLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
              {t("backToSites")}
            </Link>
          </header>

          <main
            className={cn(
              "mx-auto flex w-full flex-1 flex-col gap-10 px-6 pt-12 pb-16 sm:px-12 sm:pt-20",
              wide ? "max-w-[1150px]" : "max-w-[720px]",
            )}
          >
            <StepProgress current={stepNumber(step)} />
            <div className="flex flex-1 flex-col">{children}</div>
          </main>

          <footer className="px-6 pb-8 text-body text-fg sm:px-12">
            {session?.fullName ? (
              <>
                {t("loggedInAs", { name: session.fullName })}{" "}
                <button type="button" onClick={signOut} className="text-blue hover:underline">
                  {t("signOut")}
                </button>
              </>
            ) : (
              <span className="invisible">.</span>
            )}
          </footer>
        </div>
        {!wide && <SetupVisual />}
      </motion.div>
    </AnimatePresence>
  );
}
