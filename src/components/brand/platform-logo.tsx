import Image, { type StaticImageData } from "next/image";

import chatgpt from "@/assets/icons/platforms/chatgpt.png";
import claude from "@/assets/icons/platforms/claude.png";
import gemini from "@/assets/icons/platforms/gemini.png";
import google from "@/assets/icons/platforms/google.png";
import googleMaps from "@/assets/icons/platforms/google-maps.png";

/**
 * Official marks we have files for (128px, trimmed copies of src/assets/icons).
 * AI Overviews is a Google product, so it uses the Google mark. Platforms
 * without a file (Perplexity) fall back to a monogram where this is used.
 */
export const platformLogos: Partial<Record<string, StaticImageData>> = {
  google,
  maps: googleMaps,
  aio: google,
  chatgpt,
  claude,
  gemini,
};

/** Decorative: the platform name is always shown or announced next to it. */
export function PlatformLogo({ platform, size, className }: { platform: string; size: number; className?: string }) {
  const src = platformLogos[platform];
  if (!src) return null;
  return <Image src={src} alt="" aria-hidden width={size} height={size} className={className} />;
}
