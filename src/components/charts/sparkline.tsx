import { cn } from "@/lib/utils";

/**
 * Tiny trend line. Values are normalised to the box; time flows in the
 * reading direction, so the line mirrors in RTL.
 */
export function Sparkline({
  values,
  className,
  tone = "you",
  height = 40,
}: {
  values: number[];
  className?: string;
  tone?: "you" | "success" | "danger" | "neutral";
  height?: number;
}) {
  if (values.length < 2) return <div aria-hidden className={cn("w-full", className)} style={{ height }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 200;
  const pad = 3;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const stroke = {
    you: "var(--chart-you)",
    success: "var(--success)",
    danger: "var(--danger)",
    neutral: "var(--text-3)",
  }[tone];

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={cn("block w-full rtl:-scale-x-100", className)}
      style={{ height }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
