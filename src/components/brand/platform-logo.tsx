import Image, { type StaticImageData } from "next/image";

import chatgpt from "@/assets/icons/platforms/chatgpt.png";
import claude from "@/assets/icons/platforms/claude.png";
import gemini from "@/assets/icons/platforms/gemini.png";
import ghost from "@/assets/icons/platforms/ghost.png";
import google from "@/assets/icons/platforms/google.png";
import googleAnalytics from "@/assets/icons/platforms/google-analytics.png";
import googleMaps from "@/assets/icons/platforms/google-maps.png";
import nextjs from "@/assets/icons/platforms/nextjs.png";
import perplexity from "@/assets/icons/platforms/perplexity.png";
import searchConsole from "@/assets/icons/platforms/search-console.png";
import shopify from "@/assets/icons/platforms/shopify.png";
import telegram from "@/assets/icons/platforms/telegram.png";
import webflow from "@/assets/icons/platforms/webflow.png";
import wix from "@/assets/icons/platforms/wix.png";
import wordpress from "@/assets/icons/platforms/wordpress.png";

/**
 * Official marks we have files for (128px, trimmed copies of src/assets/icons).
 * AI Overviews is a Google product without its own file here, so it uses the
 * Google mark. Anything without a file (webhooks) falls back
 * to a monogram where this is used.
 */
export const platformLogos: Partial<Record<string, StaticImageData>> = {
  google,
  maps: googleMaps,
  aio: google,
  chatgpt,
  claude,
  gemini,
  perplexity,
  searchConsole,
  analytics: googleAnalytics,
  wordpress,
  wordpressCom: wordpress,
  shopify,
  webflow,
  wix,
  ghost,
  nextjs,
  telegram,
};

/** Decorative: the platform name is always shown or announced next to it. */
export function PlatformLogo({ platform, size, className }: { platform: string; size: number; className?: string }) {
  const src = platformLogos[platform];
  if (!src) return null;
  return <Image src={src} alt="" aria-hidden width={size} height={size} className={className} />;
}
