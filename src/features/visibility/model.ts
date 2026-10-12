import type {
  AiVisibilityOverview,
  AiVisibilityPromptWithKeyword,
  AiVisibilityResultWithPrompt,
  Engine,
  Site,
} from "@/types/types";
import type {
  CitedSource,
  EngineAnswer,
  EngineVisibility,
  QuestionDetail,
  TrackedQuestion,
  VisibilityData,
} from "@/lib/mocks/ui-data";
import { toNumber } from "@/services/api/helpers";

/**
 * The backend tests through OpenRouter and records the model of each answer
 * ("openai/gpt-4o-mini"). The model family tells which assistant answered.
 */
const ENGINE_BY_VENDOR: Record<string, Engine> = {
  openai: "chatgpt",
  anthropic: "claude",
  google: "gemini",
  perplexity: "perplexity",
};

export function engineOf(model: string | null | undefined): Engine | null {
  const vendor = model?.split("/")[0]?.toLowerCase() ?? "";
  return ENGINE_BY_VENDOR[vendor] ?? null;
}

/** Competitors and citations arrive as strings or objects, depending on the provider. */
function label(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["name", "domain", "title", "url"])
      if (typeof record[key] === "string") return record[key] as string;
  }
  return null;
}

function domainOf(value: string) {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/** The newest result per prompt and engine (results arrive newest first). */
function latestByPromptAndEngine(results: AiVisibilityResultWithPrompt[]) {
  const latest = new Map<string, AiVisibilityResultWithPrompt>();
  for (const result of results) {
    const key = `${result.ai_visibility_prompt_id}:${engineOf(result.model) ?? result.model ?? result.provider}`;
    if (!latest.has(key)) latest.set(key, result);
  }
  return [...latest.values()];
}

function trackedQuestion(
  prompt: AiVisibilityPromptWithKeyword,
  results: AiVisibilityResultWithPrompt[],
): TrackedQuestion {
  const mine = results.filter((r) => r.ai_visibility_prompt_id === prompt.id);
  const mentioned = mine.filter((r) => r.business_mentioned);
  const positions = mentioned.map((r) => r.mention_position).filter((p): p is number => p !== null);
  const competitor =
    mine
      .flatMap((r) => r.competitors_mentioned ?? [])
      .map(label)
      .find(Boolean) ?? "—";
  return {
    id: String(prompt.id),
    text: prompt.prompt,
    mentionedBy: [...new Set(mentioned.map((r) => engineOf(r.model)).filter((e): e is Engine => e !== null))],
    rank: positions.length ? Math.min(...positions) : null,
    topCompetitor: competitor,
    intent:
      prompt.prompt_type === "comparison"
        ? "comparison"
        : prompt.prompt_type === "informational"
          ? "informational"
          : "commercial",
  };
}

function citedSources(results: AiVisibilityResultWithPrompt[], site: Pick<Site, "domain">): CitedSource[] {
  const counts = new Map<string, number>();
  for (const result of results) {
    for (const citation of result.citations ?? []) {
      const value = label(citation);
      if (value) counts.set(domainOf(value), (counts.get(domainOf(value)) ?? 0) + 1);
    }
  }
  const own = site.domain.replace(/^www\./, "");
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([domain, citations]) => ({ domain, citations, status: domain === own ? "yourSite" : "missing" }));
}

/** The AI visibility screen from the backend overview, prompts and latest results. */
export function buildVisibilityData(
  overview: AiVisibilityOverview,
  prompts: AiVisibilityPromptWithKeyword[],
  allResults: AiVisibilityResultWithPrompt[],
  site: Pick<Site, "domain">,
): VisibilityData {
  const results = latestByPromptAndEngine(allResults);
  const byEngine = new Map<Engine, AiVisibilityResultWithPrompt[]>();
  for (const result of results) {
    const engine = engineOf(result.model);
    if (engine) byEngine.set(engine, [...(byEngine.get(engine) ?? []), result]);
  }

  const engines: EngineVisibility[] = [...byEngine.entries()].map(([engine, rows]) => {
    const positions = rows.map((r) => r.mention_position).filter((p): p is number => p !== null);
    return {
      engine,
      mentionRate: rows.filter((r) => r.business_mentioned).length / rows.length,
      avgPosition: average(positions),
      citations: rows.reduce((sum, r) => sum + (r.citations?.length ?? 0), 0),
      // No sentiment or history in the API yet.
      sentiment: "neutral",
      change: 0,
    };
  });

  const positions = results.map((r) => r.mention_position).filter((p): p is number => p !== null);
  return {
    score: overview.total_tests > 0 ? overview.visibility_score : null,
    scoreDelta: 0,
    rank: null,
    brandCount: 0,
    mentionRate: overview.mention_rate / 100,
    mentionDelta: 0,
    answers: overview.total_tests,
    mentioned: overview.mentioned,
    avgPosition: average(positions),
    positionDelta: 0,
    positiveSentiment: 0,
    sentimentDelta: 0,
    checkedAt: allResults[0]?.tested_at ?? allResults[0]?.created_at ?? new Date().toISOString(),
    engines,
    questions: prompts.map((prompt) => trackedQuestion(prompt, results)),
    sources: citedSources(results, site),
  };
}

/** One prompt's answers per engine, from the latest results. */
export function buildQuestionDetail(
  prompt: AiVisibilityPromptWithKeyword,
  allResults: AiVisibilityResultWithPrompt[],
  site: Pick<Site, "location" | "language">,
): QuestionDetail {
  const results = latestByPromptAndEngine(allResults).filter((r) => r.ai_visibility_prompt_id === prompt.id);
  const answers: EngineAnswer[] = results.flatMap((result) => {
    const engine = engineOf(result.model);
    if (!engine) return [];
    return [
      {
        engine,
        position: result.business_mentioned ? result.mention_position : null,
        listed: result.competitors_mentioned_count + (result.business_mentioned ? 1 : 0),
        answer: result.response_text ?? "",
        citations: (result.citations ?? []).map(label).filter((c): c is string => Boolean(c)),
        whyMissing: null,
        status: result.response_text === null ? "unreachable" : "ok",
      },
    ];
  });
  return {
    question: trackedQuestion(prompt, results),
    market: site.location.country ?? "US",
    language: prompt.language ?? site.language ?? "en",
    checkedAt: results[0]?.tested_at ?? results[0]?.created_at ?? new Date().toISOString(),
    answers,
    // The API has no improvement plan or history per prompt yet.
    plan: [],
    history: [],
  };
}

/** Visibility score as a 0–100 number from a decimal string. */
export const scoreOf = (value: string | number | null | undefined) => toNumber(value) ?? 0;
