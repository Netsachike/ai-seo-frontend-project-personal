import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "press group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent whitespace-nowrap select-none",
    "disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
    // a loading button is busy, not unavailable: keep full strength
    "data-loading:opacity-100",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5]",
    // touch hit area of at least 44px without changing the visual size
    "after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:min-h-full after:-translate-y-1/2 after:content-['']",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ink text-ink-fg hover:bg-ink-hover",
        secondary: "border-border-strong bg-surface text-fg hover:bg-surface-hover aria-expanded:bg-surface-hover",
        ghost:
          "bg-transparent text-fg-2 hover:bg-surface-2 hover:text-fg aria-expanded:bg-surface-2 aria-expanded:text-fg",
        agent: "bg-signal text-signal-ink hover:bg-signal-hover",
        destructive: "bg-danger text-ink-fg hover:bg-danger-hover",
        link: "h-auto! px-0! text-blue underline-offset-4 after:hidden hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] leading-[18px] font-medium [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-10 px-4 text-[14px] leading-5 font-medium [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 px-5 text-[15px] leading-5 font-semibold [&_svg:not([class*='size-'])]:size-[18px]",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-10 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner and keeps the button's width. */
    loading?: boolean;
  };

function Button({
  className,
  variant = "secondary",
  size = "md",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {asChild || !loading ? (
        children
      ) : (
        <>
          <span className="invisible inline-flex items-center gap-2">{children}</span>
          <Loader2Icon aria-hidden className="absolute animate-spin" />
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants, type ButtonProps };
