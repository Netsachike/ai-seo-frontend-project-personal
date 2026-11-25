"use client";

import Image, { type StaticImageData } from "next/image";

import { cn } from "@/lib/utils";
import { useBrandConfig } from "@/components/providers/brand-provider";
import logoDark from "@/assets/brand/logo-dark.png";
import logoLight from "@/assets/brand/logo-light.png";
import markDark from "@/assets/brand/mark-dark.png";
import markLight from "@/assets/brand/mark-light.png";
import markMask from "@/assets/brand/mark-mask.png";

/** Product wordmark. A brand name, not UI copy, so it is not translated. */
export const WORDMARK = "Rankoya";

/**
 * `auto` follows the theme (navy artwork in light, white in dark). `onDark`
 * is for surfaces that are dark in both themes: the navy sidebar, the admin
 * shell, the setup and sign-in panels.
 */
type Tone = "auto" | "onDark";

/** Draws the light/dark artwork pair at a fixed height, swapping with the theme. */
function ThemedArtwork({
  light,
  dark,
  height,
  tone,
  alt,
  className,
}: {
  light: StaticImageData;
  dark: StaticImageData;
  height: number;
  tone: Tone;
  alt: string;
  className?: string;
}) {
  const width = (src: StaticImageData) => Math.round((src.width / src.height) * height);
  const shared = cn("shrink-0 select-none", className);
  if (tone === "onDark") {
    return <Image src={dark} alt={alt} width={width(dark)} height={height} className={shared} priority />;
  }
  return (
    <>
      <Image
        src={light}
        alt={alt}
        width={width(light)}
        height={height}
        className={cn(shared, "dark:hidden")}
        priority
      />
      <Image
        src={dark}
        alt={alt}
        width={width(dark)}
        height={height}
        className={cn(shared, "hidden dark:block")}
        priority
      />
    </>
  );
}

/**
 * On a White Label host, the reseller's own artwork, whichever of the two they
 * uploaded (`prefer` first). Null on Rankoya's host or when they uploaded none.
 */
function useTenantArtwork(prefer: "logo" | "icon") {
  const { brandConfig, isCustomDomain } = useBrandConfig();
  if (!isCustomDomain) return null;
  const { logo_url, logo_icon_url, brand_name } = brandConfig;
  const src = prefer === "logo" ? logo_url || logo_icon_url : logo_icon_url || logo_url;
  return { src, name: brand_name };
}

/** The R-and-arrow symbol on its own, in full colour. `size` is its height. */
export function RankoyaMark({
  className,
  size = 22,
  tone = "auto",
}: {
  className?: string;
  size?: number;
  tone?: Tone;
}) {
  const tenant = useTenantArtwork("icon");
  if (tenant) {
    return tenant.src ? (
      // eslint-disable-next-line @next/next/no-img-element -- tenant artwork comes from any origin
      <img
        src={tenant.src}
        alt=""
        style={{ height: size }}
        className={cn("w-auto shrink-0 object-contain", className)}
      />
    ) : null;
  }
  return <ThemedArtwork light={markLight} dark={markDark} height={size} tone={tone} alt="" className={className} />;
}

/**
 * Small agent avatar: the mark in one colour on a Signal disc. The glyph is a
 * CSS mask filled with `currentColor`, so callers can recolour it with text-*.
 */
export function RankoyaAvatar({ className, size = 28 }: { className?: string; size?: number }) {
  const tenant = useTenantArtwork("icon");
  if (tenant?.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tenant artwork comes from any origin
      <img
        src={tenant.src}
        alt=""
        aria-hidden
        style={{ width: size, height: size }}
        className={cn("shrink-0 rounded-full bg-surface object-cover", className)}
      />
    );
  }
  const glyph = Math.round(size * 0.52);
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full bg-signal text-signal-ink", className)}
      style={{ width: size, height: size }}
    >
      <span
        className="bg-current"
        style={{
          width: Math.round(glyph * (markMask.width / markMask.height)),
          height: glyph,
          maskImage: `url(${markMask.src})`,
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
        }}
      />
    </span>
  );
}

/** Horizontal lockup: mark and wordmark. `height` is the mark's height. */
export function Logo({ className, height = 26, tone = "auto" }: { className?: string; height?: number; tone?: Tone }) {
  const tenant = useTenantArtwork("logo");
  if (tenant) {
    return (
      <span className={cn("inline-flex min-w-0 items-center", className)} translate="no">
        {tenant.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant artwork comes from any origin
          <img
            src={tenant.src}
            alt={tenant.name}
            style={{ height }}
            className="w-auto max-w-[180px] shrink-0 object-contain select-none"
          />
        ) : (
          <span
            className={cn(
              "truncate text-[18px] leading-6 font-semibold tracking-[-0.02em]",
              tone === "onDark" ? "text-white" : "text-fg",
            )}
          >
            {tenant.name}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center", className)} translate="no">
      <ThemedArtwork light={logoLight} dark={logoDark} height={height} tone={tone} alt={WORDMARK} />
    </span>
  );
}
