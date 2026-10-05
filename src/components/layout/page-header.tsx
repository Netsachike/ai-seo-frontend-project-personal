import * as React from "react";

import { cn } from "@/lib/utils";

/** H1, one supporting line and the view's actions. Tabs (synced to the URL) sit underneath. */
export function PageHeader({
  title,
  description,
  actions,
  tabs,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[72ch] min-w-0 flex-col gap-1">
          <h1 className="text-h1 text-fg">{title}</h1>
          {description && <p className="text-body text-fg-2">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs}
    </header>
  );
}
