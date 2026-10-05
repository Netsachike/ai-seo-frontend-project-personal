"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer group/checkbox relative flex size-4 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface transition-colors duration-120",
        "after:absolute after:-inset-3 after:content-['']",
        "data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-ink-fg",
        "data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink data-[state=indeterminate]:text-ink-fg",
        "disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center text-current">
        <CheckIcon className="size-3 stroke-[2.5] group-data-[state=indeterminate]/checkbox:hidden" />
        <MinusIcon className="hidden size-3 stroke-[2.5] group-data-[state=indeterminate]/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
