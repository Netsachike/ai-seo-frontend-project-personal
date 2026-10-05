import type { Engine, Job } from "@/lib/api/types";

/**
 * Jobs advance with wall-clock time from their first poll, so progress is
 * real and identical across the server and browser mock instances.
 */
const started = new Map<string, number>();

const scanEngines: { engine: Engine; seconds: number; fails?: boolean }[] = [
  { engine: "gemini", seconds: 40 },
  { engine: "chatgpt", seconds: 70 },
  { engine: "perplexity", seconds: 95 },
  { engine: "claude", seconds: 130 },
  { engine: "aio", seconds: 160, fails: true },
];

export function resetJob(id: string) {
  started.set(id, Date.now());
}

export function getMockJob(id: string): Job {
  if (!started.has(id)) started.set(id, Date.now());
  const elapsed = (Date.now() - (started.get(id) ?? Date.now())) / 1000;

  if (id.startsWith("job_article")) {
    const total = 90;
    const progress = Math.min(1, elapsed / total);
    return {
      id,
      type: "article",
      status: progress >= 1 ? "done" : "running",
      progress,
      etaSeconds: Math.max(0, Math.round(total - elapsed)),
      steps: [{ key: "draft", status: progress >= 1 ? "done" : "running", progress }],
    };
  }

  const steps = scanEngines.map(({ engine, seconds, fails }) => {
    const p = Math.min(1, elapsed / seconds);
    const failed = Boolean(fails) && p >= 1;
    return {
      key: engine,
      status: failed
        ? ("failed" as const)
        : p >= 1
          ? ("done" as const)
          : p > 0
            ? ("running" as const)
            : ("queued" as const),
      progress: failed ? 0.6 : p,
      retryAt: failed ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
    };
  });
  const longest = Math.max(...scanEngines.map((s) => s.seconds));
  const progress = Math.min(1, elapsed / longest);
  return {
    id,
    type: "scan",
    status: progress >= 1 ? "done" : "running",
    progress,
    etaSeconds: Math.max(0, Math.round(longest - elapsed)),
    steps,
  };
}
