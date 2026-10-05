import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";

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

/*
 * Chinese and Japanese use the platform's CJK fonts. Noto Sans SC/JP through
 * next/font means hundreds of font files fetched at build time, and one failed
 * download breaks every page. System CJK fonts are high quality on every OS.
 */
const CJK_SC = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC"';
const CJK_JP =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP"';

export function localeFont(locale: string): { className: string; family: string } | null {
  switch (locale) {
    case "ar":
      return { className: notoArabic.variable, family: "var(--font-noto-arabic)" };
    case "zh":
      return { className: "", family: CJK_SC };
    case "ja":
      return { className: "", family: CJK_JP };
    default:
      return null;
  }
}
