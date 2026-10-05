"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Wide tables scroll inside their own container, never the page.
 * `density="compact"` drops rows from 44px to 36px.
 */
function Table({
  className,
  containerClassName,
  density = "default",
  ...props
}: React.ComponentProps<"table"> & {
  containerClassName?: string;
  density?: "default" | "compact";
}) {
  return (
    <div
      data-slot="table-container"
      data-density={density}
      className={cn("group/table relative w-full overflow-x-auto", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-small", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-bg [&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-border bg-bg font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "h-11 border-b border-border transition-colors duration-120 group-data-[density=compact]/table:h-9 hover:bg-bg in-[thead]:h-9 in-[thead]:hover:bg-transparent data-[state=selected]:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 px-3 text-start align-middle text-overline whitespace-nowrap text-fg-2 first:ps-5 last:pe-5 has-[[role=checkbox]]:pe-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-3 align-middle whitespace-nowrap first:ps-5 last:pe-5 has-[[role=checkbox]]:pe-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-caption font-normal text-fg-3", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
