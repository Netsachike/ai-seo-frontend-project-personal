import { Geist, Geist_Mono, Noto_Sans_Arabic, Noto_Sans_JP, Noto_Sans_SC } from "next/font/google";

export const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
export const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/*
 * Script fonts are never preloaded. Their class is only attached for the
 * matching locale, so other locales never reference (or download) them.
 */
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  preload: false,
});
const notoSC = Noto_Sans_SC({ variable: "--font-noto-sc", weight: ["400", "500", "600"], preload: false });
const notoJP = Noto_Sans_JP({ variable: "--font-noto-jp", weight: ["400", "500", "600"], preload: false });

export function localeFont(locale: string): { className: string; family: string } | null {
  switch (locale) {
    case "ar":
      return { className: notoArabic.variable, family: "var(--font-noto-arabic)" };
    case "zh":
      return { className: notoSC.variable, family: "var(--font-noto-sc)" };
    case "ja":
      return { className: notoJP.variable, family: "var(--font-noto-jp)" };
    default:
      return null;
  }
}
