"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4 data-[orientation=vertical]:flex-row", className)}
      {...props}
    />
  );
}

/**
 * `line` is the sub-tab row under a page H1. `segmented` is the compact
 * control used for ranges and toggles (7d / 30d / 90d).
 */
const tabsListVariants = cva("group/tabs-list inline-flex max-w-full items-center", {
  variants: {
    variant: {
      line: "w-full [scrollbar-width:none] gap-1 overflow-x-auto border-b border-border",
      segmented: "w-fit gap-0.5 rounded-md bg-surface-2 p-0.5",
    },
  },
  defaultVariants: { variant: "line" },
});

function TabsList({
  className,
  variant = "line",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 text-[13px] leading-[18px] font-medium whitespace-nowrap text-fg-2 transition-colors duration-200 ease-out select-none hover:text-fg disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
        // line
        "group-data-[variant=line]/tabs-list:h-10 group-data-[variant=line]/tabs-list:px-3",
        "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:inset-x-3 group-data-[variant=line]/tabs-list:after:-bottom-px group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:after:rounded-full group-data-[variant=line]/tabs-list:after:bg-ink group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:after:transition-opacity group-data-[variant=line]/tabs-list:after:duration-200",
        "group-data-[variant=line]/tabs-list:data-[state=active]:font-semibold group-data-[variant=line]/tabs-list:data-[state=active]:text-fg group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        // segmented
        "group-data-[variant=segmented]/tabs-list:h-[30px] group-data-[variant=segmented]/tabs-list:rounded-[6px] group-data-[variant=segmented]/tabs-list:px-2.5",
        "group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-surface group-data-[variant=segmented]/tabs-list:data-[state=active]:font-semibold group-data-[variant=segmented]/tabs-list:data-[state=active]:text-fg group-data-[variant=segmented]/tabs-list:data-[state=active]:shadow-raised",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("min-w-0 flex-1", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
