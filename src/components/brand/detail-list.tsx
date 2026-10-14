import * as React from "react";

import { cn } from "@/lib/utils";

type DetailItem = { label: string; value: React.ReactNode; mono?: boolean };

/** Label / value pairs for a detail panel. Items without a value are skipped. */
export function DetailList({
  items,
  className,
}: {
  items: Array<DetailItem | false | null | undefined>;
  className?: string;
}) {
  const rows = items.filter((item): item is DetailItem => Boolean(item) && (item as DetailItem).value != null && (item as DetailItem).value !== "");
  return (
    <dl className={cn("grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-small", className)}>
      {rows.map((row) => (
        <React.Fragment key={row.label}>
          <dt className="text-fg-3">{row.label}</dt>
          <dd className={cn("min-w-0 break-words text-fg", row.mono && "font-mono text-caption")}>{row.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
