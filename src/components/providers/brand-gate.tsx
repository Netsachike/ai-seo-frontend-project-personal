"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useBrandConfig } from "./brand-provider";

/** Matches the panel transition below; the curtain unmounts just after it. */
const CURTAIN_MS = 420;

/**
 * Covers the app until a tenant host's brand has resolved, then opens like a
 * pair of curtains, so a reseller's customers never see Orbit's identity
 * snap to theirs. Children render underneath the whole time.
 *
 * On Orbit's own host the server already knows there is nothing to resolve
 * (`vendorHost`), so no curtain is rendered at all and first paint is never
 * held back.
 */
export function BrandGate({ children, vendorHost }: { children: React.ReactNode; vendorHost: boolean }) {
  const { isBrandReady } = useBrandConfig();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPresent, setIsPresent] = React.useState(!vendorHost);

  React.useEffect(() => {
    if (!isBrandReady || vendorHost) return;
    // One frame of "closed" first, so the browser has something to transition from.
    const frame = requestAnimationFrame(() => setIsOpen(true));
    const timer = window.setTimeout(() => setIsPresent(false), CURTAIN_MS + 80);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [isBrandReady, vendorHost]);

  return (
    <>
      {children}
      {isPresent && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
          <div
            className={cn(
              "absolute inset-y-0 start-0 w-1/2 bg-bg transition-transform duration-[420ms] ease-in-out motion-reduce:transition-none",
              isOpen ? "-translate-x-full rtl:translate-x-full" : "translate-x-0",
            )}
          />
          <div
            className={cn(
              "absolute inset-y-0 end-0 w-1/2 bg-bg transition-transform duration-[420ms] ease-in-out motion-reduce:transition-none",
              isOpen ? "translate-x-full rtl:-translate-x-full" : "translate-x-0",
            )}
          />
          <div
            className={cn(
              "absolute inset-0 grid place-items-center transition-opacity duration-200",
              isOpen ? "opacity-0" : "opacity-100",
            )}
          >
            <span className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-blue" />
          </div>
        </div>
      )}
    </>
  );
}
