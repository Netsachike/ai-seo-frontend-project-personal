import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5 w-fit max-w-full shrink-0 items-center gap-1 overflow-hidden rounded-sm px-2 text-[11px] leading-4 font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-fg-2",
        ink: "bg-ink text-ink-fg",
        signal: "bg-signal text-signal-ink",
        blue: "bg-blue-bg text-blue-ink",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        danger: "bg-danger-bg text-danger",
        outline: "border border-border-strong text-fg-2",
      },
      shape: {
        tag: "rounded-sm",
        pill: "h-[22px] rounded-full px-2",
      },
    },
    defaultVariants: { variant: "neutral", shape: "tag" },
  },
);

function Badge({
  className,
  variant,
  shape,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, shape }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
