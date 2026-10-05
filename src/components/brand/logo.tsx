import { cn } from "@/lib/utils";

/** Product wordmark. A brand name, not UI copy, so it is not translated. */
export const WORDMARK = "orbit";

export function OrbitMark({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={cn("shrink-0", className)}>
      <circle cx="11" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="18.5" cy="5.5" r="3.3" fill="var(--signal)" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Small agent avatar: the ring mark on a Signal disc. */
export function OrbitAvatar({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full bg-signal text-signal-ink", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
        <circle cx="11" cy="13" r="7" fill="none" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="18.5" cy="5.5" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-fg", className)}>
      <OrbitMark />
      <span className="text-[18px] leading-none font-semibold tracking-[-0.03em]" translate="no">
        {WORDMARK}
      </span>
    </span>
  );
}
