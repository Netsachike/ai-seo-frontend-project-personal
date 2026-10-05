import { cn } from "@/lib/utils";
import { initials } from "./initials";

/** Square tile for workspaces and brands. */
export function EntityAvatar({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-[6px] bg-ink font-semibold text-ink-fg",
        size <= 24 ? "text-[10px]" : "text-[12px]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

/** Round avatar for people; blue tint matches the "You" owner chip. */
export function UserAvatar({
  name,
  src,
  size = 28,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-blue-bg font-semibold text-blue-ink",
        size <= 28 ? "text-[11px]" : "text-[13px]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads come from any origin
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
