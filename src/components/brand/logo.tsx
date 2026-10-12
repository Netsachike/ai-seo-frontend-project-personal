import Image, { type StaticImageData } from "next/image";

import { cn } from "@/lib/utils";
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
  return <ThemedArtwork light={markLight} dark={markDark} height={size} tone={tone} alt="" className={className} />;
}

/**
 * Small agent avatar: the mark in one colour on a Signal disc. The glyph is a
 * CSS mask filled with `currentColor`, so callers can recolour it with text-*.
 */
export function RankoyaAvatar({ className, size = 28 }: { className?: string; size?: number }) {
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
  return (
    <span className={cn("inline-flex items-center", className)} translate="no">
      <ThemedArtwork light={logoLight} dark={logoDark} height={height} tone={tone} alt={WORDMARK} />
    </span>
  );
}
