"use client";

import * as React from "react";
import { ChevronDownIcon, ListOrderedIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/** Providers with a how-to, the number of steps each has, and the page each step links to. */
const GUIDES = {
  wordpress: { steps: 5, links: {} },
  wordpressCom: { steps: 3, links: {} },
  shopify: { steps: 5, links: { 1: "https://dev.shopify.com/dashboard" } },
  webflow: { steps: 5, links: { 1: "https://webflow.com/dashboard" } },
  wix: { steps: 5, links: { 1: "https://manage.wix.com/account/api-keys" } },
  ghost: { steps: 4, links: {} },
  searchConsole: { steps: 4, links: { 1: "https://search.google.com/search-console/welcome" } },
  nextjs: { steps: 4, links: {} },
  manual: { steps: 3, links: {} },
} as const satisfies Record<string, { steps: number; links: Partial<Record<number, string>> }>;

export type GuideProvider = keyof typeof GUIDES;
export const hasConnectGuide = (provider: string): provider is GuideProvider => provider in GUIDES;

/**
 * Step by step, where to find each thing the connection asks for. Open by
 * default; links open the provider's own page in a new tab.
 */
export function ConnectGuide({ provider, defaultOpen = true }: { provider: string; defaultOpen?: boolean }) {
  const t = useTranslations("integrations.guides");
  const [open, setOpen] = React.useState(defaultOpen);
  if (!hasConnectGuide(provider)) return null;
  const guide = GUIDES[provider];
  // Step keys come from the table above, so they're typed as plain strings here.
  const msg = (key: string) => key as Parameters<typeof t>[0];
  const links: Partial<Record<number, string>> = guide.links;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border bg-bg">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2.5 text-start text-small font-semibold text-fg">
        <ListOrderedIcon aria-hidden className="size-4 text-fg-3" />
        <span className="flex-1">{t("title")}</span>
        <ChevronDownIcon
          aria-hidden
          className="size-4 text-fg-3 transition-transform group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <ol className="flex list-decimal flex-col gap-1.5 ps-5 text-small text-fg-2">
          {Array.from({ length: guide.steps }, (_, i) => i + 1).map((step) => (
            <li key={step}>
              {t.rich(msg(`${provider}.s${step}`), {
                b: (chunks) => <strong className="font-medium text-fg">{chunks}</strong>,
                code: (chunks) => (
                  <code className="rounded bg-surface-2 px-1 font-mono text-[12px] text-fg">{chunks}</code>
                ),
                link: (chunks) =>
                  links[step] ? (
                    <a href={links[step]} target="_blank" rel="noreferrer" className="text-blue underline">
                      {chunks}
                    </a>
                  ) : (
                    chunks
                  ),
              })}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-caption font-normal text-fg-3">{t(msg(`${provider}.note`))}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
