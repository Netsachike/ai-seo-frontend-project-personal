import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** A labelled count for the reseller and admin consoles. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
}) {
  return (
    <Card className="gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-small font-medium text-fg-2">{label}</p>
        <span aria-hidden className="grid size-8 place-items-center rounded-md bg-blue-bg text-blue-ink">
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-metric text-fg">{value}</p>}
      {hint && <p className="text-caption font-normal text-fg-3">{hint}</p>}
    </Card>
  );
}
