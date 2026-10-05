import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-5 text-fg shadow-card",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-wrap items-start justify-between gap-x-3 gap-y-1", className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  as: Comp = "h2",
  ...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" | "div" }) {
  return <Comp data-slot="card-title" className={cn("text-h3 text-fg", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-caption font-normal text-fg-3", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("flex shrink-0 items-center gap-2", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("min-w-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-2 border-t border-border pt-4", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
