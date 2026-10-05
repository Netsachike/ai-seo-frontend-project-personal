/** Competitor palette order. The user's brand is always `chart-you`. */
export const competitorColors = ["var(--chart-a)", "var(--chart-b)", "var(--chart-c)", "var(--chart-other)"] as const;

export function seriesColor(isYou: boolean, competitorIndex: number): string {
  return isYou ? "var(--chart-you)" : competitorColors[competitorIndex % competitorColors.length];
}

/** Assigns colors with "you" first and competitors in stable order. */
export function colorize<T extends { isYou: boolean }>(items: T[]): (T & { color: string })[] {
  let i = 0;
  return items.map((item) => ({ ...item, color: item.isYou ? seriesColor(true, 0) : seriesColor(false, i++) }));
}
