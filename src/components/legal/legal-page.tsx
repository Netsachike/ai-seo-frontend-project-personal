import * as React from "react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { PRODUCT } from "@/config/product";
import type { LegalDocument } from "@/content/legal";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const LINK_PATTERN = /(https?:\/\/[^\s)]+[^\s).,]|[\w.+-]+@[\w-]+\.[\w.-]+[\w])/g;

/** Turns URLs and email addresses in legal copy into links. */
function linkify(text: string): React.ReactNode[] {
  return text.split(LINK_PATTERN).map((part, index) => {
    if (index % 2 === 0) return part;
    const href = part.includes("@") && !part.startsWith("http") ? `mailto:${part}` : part;
    return (
      <a key={index} href={href} dir="ltr" className="break-words text-blue underline-offset-2 hover:underline">
        {part}
      </a>
    );
  });
}

const NAV = [
  { href: "/terms-of-service", key: "terms" },
  { href: "/privacy-policy", key: "privacy" },
  { href: "/refund-policy", key: "refunds" },
] as const;

/**
 * Public legal page: sticky header with the logo and document links, an
 * overline, the title, the last-updated date and the sections. The copy is
 * English (the binding version); the chrome follows the UI language.
 */
export async function LegalPage({ document }: { document: LegalDocument }) {
  const t = await getTranslations("legal");
  const format = await getFormatter();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/terms-of-service" aria-label={t("home")} className="rounded-md">
            <Logo />
          </Link>
          <nav aria-label={t("nav")} className="flex flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <Button
                key={item.href}
                asChild
                size="sm"
                variant="ghost"
                className={document.slug === item.href.slice(1) ? "bg-surface-2 text-fg" : undefined}
              >
                <Link href={item.href} aria-current={document.slug === item.href.slice(1) ? "page" : undefined}>
                  {t(`links.${item.key}`)}
                </Link>
              </Button>
            ))}
            <Button asChild size="sm" variant="ghost">
              <Link href="/sign-in">{t("links.signIn")}</Link>
            </Button>
            <Button asChild size="sm" variant="primary">
              <a href={PRODUCT.marketingUrl}>{t("backHome")}</a>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl px-4 pt-12 pb-20 sm:px-6">
        <p className="text-overline text-blue">{t("overline")}</p>
        <h1 className="mt-3 text-display text-fg">{document.title}</h1>
        <p className="mt-3 text-small text-fg-3">
          {t("lastUpdated", { date: format.dateTime(new Date(`${document.lastUpdated}T12:00:00Z`), { dateStyle: "long" }) })}
        </p>
        {/* The binding text is English; mark it so screen readers and translators know. */}
        <article lang="en" dir="ltr" className="mt-10 flex flex-col gap-10">
          {document.sections.map((section, index) => (
            <section key={section.heading ?? index} className="flex flex-col gap-3">
              {section.heading && <h2 className="text-h2 text-fg">{section.heading}</h2>}
              {section.blocks.map((block, blockIndex) =>
                block.type === "p" ? (
                  <p key={blockIndex} className="text-body-lg text-fg-2">
                    {linkify(block.text)}
                  </p>
                ) : (
                  <ul key={blockIndex} className="flex list-disc flex-col gap-2 ps-6 text-body-lg text-fg-2">
                    {block.items.map((item) => (
                      <li key={item}>{linkify(item)}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
