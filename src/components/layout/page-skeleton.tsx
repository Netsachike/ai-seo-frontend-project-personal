import { Skeleton } from "@/components/ui/skeleton";
import { KpiCardSkeleton } from "@/components/brand/kpi-card";

/** Route-level loading state: header, KPI row and two panels. */
export function PageSkeleton({ kpis = 4, panels = 2 }: { kpis?: number; panels?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {kpis > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: kpis }, (_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: panels }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
