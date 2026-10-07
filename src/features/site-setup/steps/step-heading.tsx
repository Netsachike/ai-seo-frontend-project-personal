import { cn } from "@/lib/utils";

/** Title and one line of context at the top of every setup step. */
export function StepHeading({
  title,
  description,
  badge,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[32px] leading-[38px] font-semibold tracking-[-0.025em] text-fg">{title}</h1>
        {badge}
      </div>
      {description && <p className="text-body-lg text-fg-2">{description}</p>}
    </div>
  );
}
