import type { CrawlPage, Site } from "@/types/types";
import copilotService from "@/services/copilot";
import { siteLanguage, siteMarket } from "@/features/sites/site-utils";
import { abortable, crawledPages, isHomePage, sleep } from "./crawl";

/**
 * The site profile on the details step, written from the site's first crawl
 * in RankYak's structure. The copilot writes each section from the crawled
 * pages; when it fails or answers with nothing, the section is assembled from
 * the pages themselves in the same structure.
 *
 * Output contract (the UI renders it as it arrives): markdown only, each
 * heading a plain line of its own, bullets under it.
 */

export type ProfileSection = "description" | "audience";
type ProfileSite = Pick<Site, "id" | "name" | "domain" | "language" | "location">;

/** The copilot rejects longer questions. */
const MAX_QUESTION_CHARS = 5000;
/** Characters of page text sent for the homepage and for every other page. */
const HOME_TEXT_CHARS = 900;
const PAGE_TEXT_CHARS = 160;
const MAX_PAGES = 12;

/** The RankYak structure each section follows, as given to the copilot. */
const TEMPLATES: Record<ProfileSection, string> = {
  description: `Core Business
- What the business is and how it presents itself (its name, category and positioning).
- What it does for customers and the outcome it aims for.
- Who it is positioned for.
Key Features
- Feature name: one or two sentences on what it does. When the site states a figure, write "The site claims …".
(4 to 6 feature bullets in this "Name: explanation" form)
Unique Value Proposition
- What sets it apart from alternatives (3 or 4 bullets). Mark testimonial or marketing figures as "testimonial claims, not independently verified".`,
  audience: `Primary Audience
- The roles and company types that buy or use it.
- The teams or people with the specific need it solves.
- The kinds of businesses or consumers it serves.
Key Characteristics
- Professional roles: the job titles that make or influence the decision.
- Business needs: what they want to achieve.
- Pain points: the problems that send them looking.
- Buying behavior: how they evaluate and buy (trials, proof, security, price).
- Company profile: the size and stage of company that fits.`,
};

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

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

const displayName = (code: string, type: "language" | "region", fallback: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type }).of(code) ?? fallback;
  } catch {
    return fallback;
  }
};

function profileQuestion(
  site: ProfileSite,
  section: ProfileSection,
  pages: CrawlPage[],
  locale: string,
  description: string | null,
) {
  const task =
    section === "description"
      ? `Using only the crawled pages of ${site.domain} below, describe the business behind this website.`
      : `Using the confirmed description and the crawled pages of ${site.domain} below, describe who this website is for.`;
  const intro = [
    task,
    `Reply in ${displayName(locale, "language", "English")}, with markdown only and no introduction or closing remarks.`,
    "Follow this structure exactly. Each heading is a plain line of its own with no # or ** markers (translate headings and labels into the reply language). Every point is a bullet of one or two full sentences. State only what the pages support:",
    TEMPLATES[section],
    section === "audience" && description ? `\nConfirmed description:\n${description.slice(0, 900)}` : "",
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
  [...new Set(items.filter((s): s is string => Boolean(s?.trim())).map(squash))].map((s) => `- ${s}`).join("\n");

const section = (heading: string, body: string) => (body ? `${heading}\n\n${body}` : "");

const headingTexts = (page: CrawlPage) =>
  (page.headings ?? [])
    .map((h) => (typeof h.text === "string" ? squash(h.text) : ""))
    .filter((h) => h.length > 3 && h !== page.h1);

/** Without the copilot: the RankYak structure filled from the crawled pages' own text. */
function profileFromPages(site: ProfileSite, key: ProfileSection, pages: CrawlPage[]) {
  const home = pages.find(isHomePage) ?? pages[0];
  const others = pages.filter((p) => p !== home);
  const offers = others.filter((p) => /service|product|category|pricing|solution|feature/i.test(p.page_type ?? ""));
  const featurePages = (offers.length ? offers : others).filter((p) => p.title).slice(0, 6);
  const name = home.title ? squash(home.title.split(/\s[|–—-]\s/)[0]) : site.name;

  if (key === "description") {
    return [
      section(
        "Core Business",
        bullets([
          `${name} is the business behind ${site.domain}.`,
          home.meta_description,
          home.h1 !== home.title ? home.h1 : null,
          home.content_summary,
        ]),
      ),
      section(
        "Key Features",
        bullets(
          featurePages.map((p) => `${squash(p.title!.split(/\s[|–—-]\s/)[0])}: ${p.meta_description ?? p.h1 ?? pathOf(p.url)}`),
        ),
      ),
      section(
        "Unique Value Proposition",
        bullets(headingTexts(home).slice(0, 3).map((h) => `The homepage highlights: ${h}.`)),
      ),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const market = displayName(siteMarket(site), "region", siteMarket(site));
  const language = displayName(siteLanguage(site), "language", "English");
  const offerNames = featurePages.map((p) => squash(p.title!.split(/\s[|–—-]\s/)[0])).slice(0, 4);
  return [
    section(
      "Primary Audience",
      bullets([
        offerNames.length ? `People looking for ${offerNames.join(", ")}.` : null,
        home.meta_description ? `Visitors who need what the homepage offers: ${home.meta_description}` : null,
        `Visitors in ${market} who search in ${language}.`,
      ]),
    ),
    section(
      "Key Characteristics",
      bullets([
        offerNames.length ? `Business needs: ${offerNames.join(", ")}.` : null,
        `Company profile: customers in ${market}.`,
      ]),
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Releases finished text in small bursts, so it writes itself in like a live answer. */
async function* reveal(text: string, signal: AbortSignal) {
  for (let i = 0; i < text.length; i += 40) {
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
  key: ProfileSection,
  { locale, description, signal }: { locale: string; description: string | null; signal: AbortSignal },
) {
  const pages = await abortable(crawledPages(site.id), signal);
  if (pages.length === 0) throw new Error("No readable pages in the crawl.");

  let text = "";
  try {
    text = await abortable(askCopilot(site, key, pages, locale, description), signal);
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
  }
  if (!text) text = profileFromPages(site, key, pages);

  yield* reveal(text, signal);
}
