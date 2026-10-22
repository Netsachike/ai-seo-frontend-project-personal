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
import { siteMarket } from "@/features/sites/site-utils";

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

/** The assistants the backend tests through OpenRouter, in display order. */
export const TESTED_ENGINES: Engine[] = ["chatgpt", "gemini", "perplexity", "claude"];

/** Every AI test goes through OpenRouter; the model picks the assistant. */
export const AI_TEST_PROVIDER = "openrouter";

/**
 * The OpenRouter models Rankoya tests, one request per model (the test
 * endpoint takes a single model). Labels are product names, not translated.
 */
export const AI_TEST_MODELS: { id: string; engine: Engine; label: string }[] = [
  { id: "openai/gpt-5", engine: "chatgpt", label: "GPT-5" },
  { id: "google/gemini-2.5-flash", engine: "gemini", label: "Gemini 2.5 Flash" },
  // OpenRouter retired anthropic/claude-sonnet-4; older results keep that id and still count as Claude.
  { id: "anthropic/claude-sonnet-4.5", engine: "claude", label: "Claude Sonnet 4.5" },
  { id: "perplexity/sonar", engine: "perplexity", label: "Perplexity Sonar" },
  { id: "perplexity/sonar-deep-research", engine: "perplexity", label: "Sonar Deep Research" },
];

/** A readable name for a model id: the known label, else the id without its vendor. */
export const modelLabel = (model: string | null | undefined) =>
  AI_TEST_MODELS.find((m) => m.id === model)?.label ?? model?.split("/").pop() ?? "";

/** Display order of a model: the order of AI_TEST_MODELS, unknown models last. */
const modelOrder = (model: string | null | undefined) => {
  const i = AI_TEST_MODELS.findIndex((m) => m.id === model);
  return i === -1 ? AI_TEST_MODELS.length : i;
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
const averageOrNull = (values: number[]) => (values.length ? average(values) : null);

const testedAt = (result: AiVisibilityResultWithPrompt) => result.tested_at ?? result.created_at;

/**
 * The newest result per prompt and model. Keyed by model, not engine, so two
 * models of one assistant (Sonar and Sonar Deep Research) both count.
 */
function latestByPromptAndModel(results: AiVisibilityResultWithPrompt[]) {
  const latest = new Map<string, AiVisibilityResultWithPrompt>();
  for (const result of results) {
    const key = `${result.ai_visibility_prompt_id}:${result.model ?? result.provider}`;
    const current = latest.get(key);
    if (!current || testedAt(result) > testedAt(current)) latest.set(key, result);
  }
  return [...latest.values()];
}

/** Score, mention rate and position over a set of latest answers. */
function summarise(rows: AiVisibilityResultWithPrompt[]) {
  const mentioned = rows.filter((r) => r.business_mentioned);
  const positions = mentioned.map((r) => r.mention_position).filter((p): p is number => p !== null);
  return {
    answers: rows.length,
    mentioned: mentioned.length,
    score: average(rows.map((r) => toNumber(r.visibility_score) ?? 0)),
    mentionRate: rows.length ? mentioned.length / rows.length : 0,
    avgPosition: averageOrNull(positions),
  };
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
    testedModels: [...new Set(mine.map((r) => r.model).filter((m): m is string => Boolean(m)))].sort(
      (a, b) => modelOrder(a) - modelOrder(b),
    ),
    lastTested: mine.map(testedAt).sort().pop() ?? null,
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
  // Only active prompts count; old answers to retired prompts would skew the numbers.
  const active = new Set(prompts.map((p) => p.id));
  const results = latestByPromptAndModel(allResults).filter((r) => active.has(r.ai_visibility_prompt_id));
  const byModel = new Map<string, AiVisibilityResultWithPrompt[]>();
  for (const result of results) {
    if (!result.model || !engineOf(result.model)) continue;
    byModel.set(result.model, [...(byModel.get(result.model) ?? []), result]);
  }

  const engines: EngineVisibility[] = [...byModel.entries()]
    .sort(([a], [b]) => modelOrder(a) - modelOrder(b))
    .map(([model, rows]) => {
      const summary = summarise(rows);
      return {
        engine: engineOf(model) as Engine,
        model,
        answers: summary.answers,
        score: summary.score,
        mentionRate: summary.mentionRate,
        avgPosition: summary.avgPosition,
        citations: rows.reduce((sum, r) => sum + (r.citations?.length ?? 0), 0),
        // No sentiment or history in the API yet.
        sentiment: "neutral",
        change: 0,
      };
    });

  const lastTested: Record<string, string> = {};
  for (const result of allResults) {
    if (!result.model) continue;
    const at = testedAt(result);
    if (!lastTested[result.model] || at > lastTested[result.model]) lastTested[result.model] = at;
  }

  // Headline numbers describe where you stand now: the latest answer per question and model.
  const summary = summarise(results);
  return {
    // Null before the first test, so the screen shows its empty state.
    score: overview.total_tests === 0 && results.length === 0 ? null : summary.score,
    scoreDelta: 0,
    rank: null,
    brandCount: 0,
    mentionRate: summary.mentionRate,
    mentionDelta: 0,
    answers: summary.answers,
    mentioned: summary.mentioned,
    avgPosition: summary.avgPosition,
    positionDelta: 0,
    positiveSentiment: 0,
    sentimentDelta: 0,
    checkedAt: Object.values(lastTested).sort().pop() ?? new Date().toISOString(),
    totalTests: overview.total_tests,
    lastTested,
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
  const results = latestByPromptAndModel(allResults)
    .filter((r) => r.ai_visibility_prompt_id === prompt.id)
    .sort((a, b) => modelOrder(a.model) - modelOrder(b.model));
  const answers: EngineAnswer[] = results.flatMap((result) => {
    const engine = engineOf(result.model);
    if (!engine) return [];
    return [
      {
        engine,
        model: result.model ?? undefined,
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
    market: siteMarket(site),
    language: prompt.language ?? site.language ?? "en",
    checkedAt: results.map(testedAt).sort().pop() ?? new Date().toISOString(),
    answers,
    // The API has no improvement plan or history per prompt yet.
    plan: [],
    history: [],
  };
}

/** Visibility score as a 0–100 number from a decimal string. */
export const scoreOf = (value: string | number | null | undefined) => toNumber(value) ?? 0;
