"use client";

import * as React from "react";
import { ChevronDownIcon, EyeIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { LOVABLE_PROMPT } from "@/features/publishing/lovable";
import { CopyButton } from "@/components/brand/copy-button";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/**
 * The setup prompt for Lovable: collapsed by default, with a button to view
 * it and one to copy it. Lovable builds the Rankoya routes from it and shows
 * the RANKOYA_API_KEY to paste into the connect form below.
 */
export function LovablePrompt() {
  const t = useTranslations("integrations.lovable");
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-2 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-small font-semibold text-fg">{t("promptTitle")}</p>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="group">
              <EyeIcon />
              {open ? t("hidePrompt") : t("viewPrompt")}
              <ChevronDownIcon className="transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CopyButton value={LOVABLE_PROMPT} label={t("copyPrompt")} />
        </div>
      </div>
      <p className="text-small text-fg-2">{t("promptBody")}</p>
      <CollapsibleContent>
        <pre
          dir="ltr"
          tabIndex={0}
          aria-label={t("promptTitle")}
          className="max-h-72 overflow-y-auto rounded-md bg-surface-2 p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-fg"
        >
          {LOVABLE_PROMPT}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
