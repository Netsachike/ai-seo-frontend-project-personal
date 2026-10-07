"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { DEFAULT_LOGIN_CAROUSEL, normalizeCarousel, resolveSlideCopy } from "@/config/brand";
import { useBrandConfig } from "@/components/providers/brand-provider";

const SLIDE_MS = 6000;

/**
 * Orbit's own host keeps the stock brand panel (`children`). On a White
 * Label domain the panel becomes the reseller's sign-in carousel, painted
 * with their sign-in colours.
 */
export function TenantBrandPanel({ children }: { children: React.ReactNode }) {
  const { brandConfig, isCustomDomain } = useBrandConfig();
  if (!isCustomDomain) return <>{children}</>;
  return <TenantCarousel slides={normalizeCarousel(brandConfig.login_carousel) ?? DEFAULT_LOGIN_CAROUSEL} brandName={brandConfig.brand_name} />;
}

/** Vendor-only content (Orbit's legal links), hidden on White Label domains. */
export function VendorOnly({ children }: { children: React.ReactNode }) {
  const { isCustomDomain } = useBrandConfig();
  return isCustomDomain ? null : <>{children}</>;
}

function TenantCarousel({ slides, brandName }: { slides: typeof DEFAULT_LOGIN_CAROUSEL; brandName: string }) {
  const t = useTranslations("auth.panel");
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused || slides.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const current = Math.min(index, slides.length - 1);

  return (
    <aside
      aria-label={t("label")}
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative hidden flex-1 overflow-hidden border-s border-border bg-(--tenant-bg,var(--nav-bg)) text-(--tenant-text,white) lg:flex"
    >
      {slides.map((slide, i) => {
        const copy = resolveSlideCopy(slide, i, brandName);
        return (
          <div
            key={`${slide.position}-${slide.url}`}
            aria-hidden={i !== current}
            className={cn(
              "absolute inset-0 flex flex-col justify-end transition-opacity duration-500 ease-in-out",
              i === current ? "opacity-100" : "opacity-0",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tenant images come from any origin */}
            <img src={slide.url} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/10" />
            <div className="relative flex max-w-[560px] flex-col gap-3 p-14 pb-20 text-white">
              {copy.kicker && <span className="text-overline text-white/70">{copy.kicker}</span>}
              {copy.title && <h2 className="text-display">{copy.title}</h2>}
              {copy.description && <p className="text-body-lg text-white/80">{copy.description}</p>}
            </div>
          </div>
        );
      })}
      {slides.length > 1 && (
        <div className="absolute start-14 bottom-10 flex gap-2">
          {slides.map((slide, i) => (
            <button
              key={`dot-${slide.position}`}
              type="button"
              aria-label={t("slide", { number: i + 1, total: slides.length })}
              aria-current={i === current}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full bg-white/40 transition-[width,background-color] duration-200",
                i === current ? "w-6 bg-white" : "w-1.5",
              )}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
