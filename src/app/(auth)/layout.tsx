import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PRODUCT } from "@/config/product";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AuthBrandPanel, VendorOnly } from "./tenant-brand-panel";

/** Form on the start side, the sign-in carousel on the end side (desktop only). */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("auth.layout");
  return (
    <div className="flex min-h-dvh bg-surface">
      <section className="flex min-w-0 flex-1 flex-col px-4 py-4 sm:px-10 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <a href={PRODUCT.landingUrl} aria-label={t("home")} className="rounded-md">
            <Logo />
          </a>
          <div className="flex items-center gap-1">
            <LanguageSwitcher persist={false} />
            <ThemeToggle persist={false} />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-10 sm:py-12">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
        <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-normal text-fg-3">
          <span>{t("copyright", { year: new Date().getFullYear(), company: t("company") })}</span>
          <VendorOnly>
            <span aria-hidden>·</span>
            <Link href="/terms-of-service" className="text-fg-2 hover:text-fg hover:underline">
              {t("terms")}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/privacy-policy" className="text-fg-2 hover:text-fg hover:underline">
              {t("privacy")}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/refund-policy" className="text-fg-2 hover:text-fg hover:underline">
              {t("refunds")}
            </Link>
          </VendorOnly>
        </footer>
      </section>
      <AuthBrandPanel />
    </div>
  );
}
