import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-[14px] leading-5 text-fg transition-colors duration-120",
        "placeholder:text-fg-3 focus-visible:border-blue disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger",
        "read-only:border-border read-only:bg-surface-2 read-only:text-fg-3",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
