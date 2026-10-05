import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  [
    "w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 text-fg transition-colors duration-120",
    "placeholder:text-fg-3 focus-visible:border-blue",
    "disabled:cursor-not-allowed disabled:opacity-40",
    "read-only:border-border read-only:bg-surface-2 read-only:text-fg-3",
    "aria-invalid:border-danger",
    "file:me-3 file:border-0 file:bg-transparent file:text-small file:font-medium file:text-fg",
  ],
  {
    variants: {
      size: {
        md: "h-10 text-[14px] leading-5",
        lg: "h-12 text-[15px] leading-5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

function Input({
  className,
  type,
  size,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return <input type={type} data-slot="input" className={cn(inputVariants({ size }), className)} {...props} />;
}

export { Input, inputVariants };
