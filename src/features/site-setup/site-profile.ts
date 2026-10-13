import type { CrawlPage, Site } from "@/types/types";
import crawlerService from "@/services/crawler";
import copilotService from "@/services/copilot";
import { siteLanguage, siteMarket } from "@/features/sites/site-utils";
import { patchDraft, useSetupStore } from "./store";
import { sleep, waitForCrawl } from "./topics";

/**
 * The site profile on the details step, written from the site's first crawl.
 * The copilot writes each section from the crawled pages; when it fails or
 * answers with nothing, the section is assembled from the pages themselves.
 *
 * Output contract (the UI renders it as it arrives): markdown only, each
 * heading a plain line of its own, 3–6 one- or two-sentence bullets under it.
 */

export type ProfileSection = "description" | "audience";
type ProfileSite = Pick<Site, "id" | "name" | "domain" | "language" | "location">;

/** How long to wait for the domain step's crawl run id before starting a crawl here. */
const RUN_ID_WAIT_MS = 10_000;
/** The copilot rejects longer questions. */
const MAX_QUESTION_CHARS = 5000;
/** Characters of page text sent for the homepage and for every other page. */
const HOME_TEXT_CHARS = 1200;
const PAGE_TEXT_CHARS = 220;
const MAX_PAGES = 12;

const HEADINGS: Record<ProfileSection, readonly string[]> = {
  description: ["Core Business", "Key Features", "Unique Value Proposition"],
  audience: ["Primary Audience", "Key Characteristics", "Search Behaviour"],
};

const abortError = () => new DOMException("Aborted", "AbortError");

/** Rejects as soon as `signal` aborts, without cancelling the shared work behind `promise`. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/** The crawl the domain step started (its id lands in the draft shortly after), or a new one. */
async function firstCrawlRun(siteId: number) {
  const started = Date.now();
  while (Date.now() - started < RUN_ID_WAIT_MS) {
    const runId = useSetupStore.getState().drafts[siteId]?.crawlRunId;
    if (runId) return (await crawlerService.getRun(siteId, runId)).data;
    await sleep(500);
  }
  const { data: run } = await crawlerService.start(siteId);
  patchDraft(siteId, { crawlRunId: run.id });
  return run;
}

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

const isHome = (page: CrawlPage) => pathOf(page.url).replace(/\/+$/, "") === "";

/** Pages that loaded and have something to read, homepage first. */
function readablePages(pages: CrawlPage[]) {
  const ok = pages.filter(
    (p) =>
      !p.error_message &&
      (p.status_code === null || (p.status_code >= 200 && p.status_code < 300)) &&
      Boolean(p.title || p.meta_description || p.h1 || p.content_summary || p.content_text),
  );
  return [...ok.filter(isHome), ...ok.filter((p) => !isHome(p))];
}

/**
 * The first page of crawled pages, shared by both sections (and by retries)
 * so the crawl is waited on once. A failed or empty read is dropped so Retry
 * reads again.
 */
const pagesBySite = new Map<number, Promise<CrawlPage[]>>();

function crawledPages(siteId: number) {
  let pending = pagesBySite.get(siteId);
  if (!pending) {
    pending = (async () => {
      const run = await waitForCrawl(siteId, await firstCrawlRun(siteId));
      const { data } = await crawlerService.listPages(siteId, run.id);
      return readablePages(data);
    })();
    pagesBySite.set(siteId, pending);
    pending.then(
      (pages) => pages.length === 0 && pagesBySite.delete(siteId),
      () => pagesBySite.delete(siteId),
    );
  }
  return pending;
}

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

function pageDigest(page: CrawlPage, textChars: number) {
  const lines = [`URL: ${pathOf(page.url)}`];
  if (page.page_type) lines.push(`Type: ${page.page_type}`);
  if (page.title) lines.push(`Title: ${squash(page.title)}`);
  if (page.meta_description) lines.push(`Meta description: ${squash(page.meta_description)}`);
  if (page.h1 && page.h1 !== page.title) lines.push(`H1: ${squash(page.h1)}`);
  const body = page.content_summary || page.content_text;
  if (body) lines.push(`Text: ${squash(body).slice(0, textChars)}`);
  return lines.join("\n");
}

const languageName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? "English";
  } catch {
    return "English";
  }
};

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

function profileQuestion(
  site: ProfileSite,
  section: ProfileSection,
  pages: CrawlPage[],
  locale: string,
  description: string | null,
) {
  const headings = HEADINGS[section].join(", ");
  const task =
    section === "description"
      ? `Using only the crawled pages of ${site.domain} below, describe what this website's business is and what it offers.`
      : `Using the confirmed description and the crawled pages of ${site.domain} below, describe who this website is for.`;
  const intro = [
    task,
    `Reply in ${languageName(locale)}. Reply with markdown only, with no introduction or closing remarks.`,
    `Use exactly these headings, translated into the reply language, each as a plain line of its own with no # or ** markers: ${headings}.`,
    "Under each heading write 3 to 6 bullets of one or two sentences. State only what the pages support.",
    section === "audience" && description ? `\nConfirmed description:\n${description.slice(0, 1200)}` : "",
    "\nCrawled pages:",
  ]
    .filter(Boolean)
    .join("\n");

  let question = intro;
  for (const [i, page] of pages.slice(0, MAX_PAGES).entries()) {
    const digest = `\n\n${pageDigest(page, i === 0 ? HOME_TEXT_CHARS : PAGE_TEXT_CHARS)}`;
    if (question.length + digest.length > MAX_QUESTION_CHARS) break;
    question += digest;
  }
  return question.slice(0, MAX_QUESTION_CHARS);
}

/** Headings as plain lines: drops `#` and whole-line `**bold**` markers the model may add anyway. */
const normalise = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^\s*#{1,6}\s+/, "").replace(/^\s*\*\*(.+?)\*\*:?\s*$/, "$1"))
    .join("\n")
    .trim();

/** One copilot thread per site, so both sections land in the same conversation. */
const conversationBySite = new Map<number, number>();

async function askCopilot(
  site: ProfileSite,
  section: ProfileSection,
  pages: CrawlPage[],
  locale: string,
  description: string | null,
) {
  const response = await copilotService.ask(site.id, {
    question: profileQuestion(site, section, pages, locale, description),
    conversation_id: conversationBySite.get(site.id) ?? null,
  });
  conversationBySite.set(site.id, response.conversation.id);
  return normalise(response.answer ?? "");
}

const bullets = (items: (string | null | undefined)[]) =>
  [...new Set(items.filter((s): s is string => Boolean(s)).map(squash))].map((s) => `- ${s}`).join("\n");

/** Without the copilot: the sections assembled from the crawled pages' own text. */
function profileFromPages(site: ProfileSite, section: ProfileSection, pages: CrawlPage[]) {
  const home = pages.find(isHome) ?? pages[0];
  const others = pages.filter((p) => p !== home);
  const offers = others.filter((p) => /service|product|category|pricing|solution/i.test(p.page_type ?? ""));

  if (section === "description") {
    const core = bullets([
      home.title ? `${home.title} is the website at ${site.domain}.` : `${site.name} is the website at ${site.domain}.`,
      home.meta_description,
      home.h1 !== home.title ? home.h1 : null,
      home.content_summary,
    ]);
    const keyPages = bullets(
      (offers.length ? offers : others)
        .filter((p) => p.title)
        .slice(0, 6)
        .map((p) => `${p.title}${p.meta_description ? `: ${p.meta_description}` : ""}`),
    );
    return [`Core Business\n\n${core}`, keyPages && `Key Pages\n\n${keyPages}`].filter(Boolean).join("\n\n");
  }

  const market = countryName(siteMarket(site));
  const language = languageName(siteLanguage(site));
  const primary = bullets([
    offers.length
      ? `People looking for ${offers
          .slice(0, 4)
          .map((p) => p.title)
          .filter(Boolean)
          .join(", ")}.`
      : home.meta_description
        ? `People looking for what the homepage offers: ${home.meta_description}`
        : null,
    `Visitors in ${market} who search in ${language}.`,
  ]);
  return `Primary Audience\n\n${primary}`;
}

/** Releases finished text in small bursts, so it writes itself in like a live answer. */
async function* reveal(text: string, signal: AbortSignal) {
  for (let i = 0; i < text.length; i += 40) {
    if (signal.aborted) throw abortError();
    yield text.slice(i, i + 40);
    await sleep(90, signal);
  }
}

/**
 * One profile section for the details step. Waits for the crawl, asks the
 * copilot, and falls back to the pages' own text. Throws when no page could
 * be read, so the step offers Retry.
 */
export async function* streamProfileSection(
  site: ProfileSite,
  section: ProfileSection,
  { locale, description, signal }: { locale: string; description: string | null; signal: AbortSignal },
) {
  const pages = await abortable(crawledPages(site.id), signal);
  if (pages.length === 0) throw new Error("No readable pages in the crawl.");

  let text = "";
  try {
    text = await abortable(askCopilot(site, section, pages, locale, description), signal);
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
  }
  if (!text) text = profileFromPages(site, section, pages);

  yield* reveal(text, signal);
}
