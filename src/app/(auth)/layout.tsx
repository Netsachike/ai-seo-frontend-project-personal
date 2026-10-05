import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { EngineIcon } from "@/components/brand/engine-icon";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/** Form on the start side, the ink brand panel on the end side (desktop only). */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("auth.layout");
  return (
    <div className="flex min-h-dvh bg-surface">
      <section className="flex min-w-0 flex-1 flex-col px-4 py-4 sm:px-10 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/sign-in" aria-label={t("home")} className="rounded-md">
            <Logo />
          </Link>
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
          <span aria-hidden>·</span>
          <a href="#" className="text-fg-2 hover:text-fg hover:underline">
            {t("terms")}
          </a>
          <span aria-hidden>·</span>
          <a href="#" className="text-fg-2 hover:text-fg hover:underline">
            {t("privacy")}
          </a>
        </footer>
      </section>
      <BrandPanel />
    </div>
  );
}

/** Always dark: the `dark` class scopes the dark tokens to this panel in both themes. */
async function BrandPanel() {
  const t = await getTranslations("auth.panel");
  return (
    <aside
      aria-label={t("label")}
      className={cn(
        "dark hidden flex-1 flex-col justify-center gap-9 border-s border-border bg-bg px-14 py-16 text-fg lg:flex",
      )}
    >
      <div className="flex max-w-[520px] flex-col gap-4">
        <span className="flex items-center gap-2 text-overline text-fg-2">
          <span aria-hidden className="size-2 rounded-full bg-signal" />
          {t("overline")}
        </span>
        <h2 className="text-display">{t("headline")}</h2>
        <p className="text-body-lg text-fg-2">{t("body")}</p>
      </div>
      <figure className="flex max-w-[480px] flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <figcaption className="flex items-center gap-2 text-small text-fg-2">
          <EngineIcon engine="chatgpt" />
          <q>{t("question")}</q>
        </figcaption>
        <p className="text-body-lg text-fg">
          {t.rich("answer", {
            mark: (chunks) => <mark className="rounded-sm bg-signal px-1 font-semibold text-signal-ink">{chunks}</mark>,
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-sm bg-success-bg px-2 py-0.5 num text-caption text-success">{t("mentioned")}</span>
          <span className="rounded-sm bg-surface-2 px-2 py-0.5 num text-caption text-fg-2">{t("rankBadge")}</span>
        </div>
      </figure>
    </aside>
  );
}
