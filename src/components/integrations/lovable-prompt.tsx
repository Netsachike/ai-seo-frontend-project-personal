"use client";

import * as React from "react";
import { ChevronDownIcon, EyeIcon, LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/brand/copy-button";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/**
 * One numbered Lovable setup prompt: collapsed by default, with a button to
 * view it and one to copy it. A locked card (step 2 before the site URL is in)
 * shows why it's locked instead of the prompt, and can't be opened or copied.
 */
export function LovablePromptCard({
  step,
  title,
  body,
  prompt,
  locked = false,
  lockedBody,
  children,
  className,
  ...rest
}: {
  step: number;
  title: string;
  body: string;
  prompt: string | null;
  locked?: boolean;
  lockedBody?: string;
  children?: React.ReactNode;
  className?: string;
} & Omit<React.ComponentProps<"div">, "title" | "children">) {
  const t = useTranslations("integrations.lovable");
  const [open, setOpen] = React.useState(false);
  const isOpen = open && !locked;

  return (
    <Collapsible
      {...rest}
      open={isOpen}
      onOpenChange={setOpen}
      disabled={locked}
      aria-disabled={locked || undefined}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border p-4 transition-opacity duration-200",
        locked && "cursor-not-allowed border-dashed bg-surface-2/40 opacity-60",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-small font-semibold text-fg">
          <span
            aria-hidden
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-semibold text-bg"
          >
            {locked ? <LockIcon className="size-3" /> : step}
          </span>
          {title}
        </p>
        {!locked && prompt && (
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button type="button" size="sm" variant="ghost" className="group">
                <EyeIcon />
                {isOpen ? t("hidePrompt") : t("viewPrompt")}
                <ChevronDownIcon className="transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CopyButton value={prompt} label={t("copyPrompt")} />
          </div>
        )}
      </div>
      <p className="text-small text-fg-2">{locked && lockedBody ? lockedBody : body}</p>
      {!locked && children}
      {!locked && prompt && (
        <CollapsibleContent>
          <pre
            dir="ltr"
            tabIndex={0}
            aria-label={title}
            className="max-h-72 overflow-y-auto rounded-md bg-surface-2 p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-fg"
          >
            {prompt}
          </pre>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
