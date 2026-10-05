"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-out",
        "after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']",
        "disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-ink data-[state=unchecked]:bg-border-strong",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-surface shadow-[0_1px_2px_rgb(15_18_24/0.2)] transition-transform duration-200 ease-out data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 rtl:data-[state=checked]:-translate-x-4 dark:data-[state=checked]:bg-ink-fg"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
