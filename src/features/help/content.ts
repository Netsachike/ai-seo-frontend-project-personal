import { PRODUCT } from "@/config/product";
import type { IntegrationProvider } from "@/features/integrations/catalog";

/**
 * Help center content. Videos are added by hand: give each one a category,
 * a message key under `help.videos.items`, and its URL. A video with a
 * `provider` also shows a "Watch demo" button on that integration's card.
 */
export const HELP_CATEGORIES = ["integrations", "articles", "keywords", "visibility", "account"] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export type HelpVideo = {
  /** Also the message key under `help.videos.items`. */
  id: string;
  category: HelpCategory;
  src: string;
  provider?: IntegrationProvider;
};

export const HELP_VIDEOS: HelpVideo[] = [
  {
    id: "shopifyConnect",
    category: "integrations",
    provider: "shopify",
    src: "https://viralgeniusapp.s3.amazonaws.com/Vg/videos/1794316856380t6s2sa-screen-recording-2026-11-10-140639.mp4",
  },
];

export const videosIn = (category: HelpCategory) => HELP_VIDEOS.filter((v) => v.category === category);
export const videoForProvider = (provider: IntegrationProvider) => HELP_VIDEOS.find((v) => v.provider === provider);

export const HELP_TABS = ["videos", "contact"] as const;
export type HelpTab = (typeof HELP_TABS)[number];
export const normalizeHelpTab = (tab: string | null | undefined): HelpTab =>
  (HELP_TABS as readonly string[]).includes(tab ?? "") ? (tab as HelpTab) : "videos";

/** Mailboxes on the Contact tab. Support follows the workspace's white-label address when it has one. */
export const HELP_EMAILS = [
  { id: "support", email: PRODUCT.supportEmail },
  { id: "agency", email: PRODUCT.agencyEmail },
] as const;

/**
 * Rankoya's social accounts. Only the ones with a URL are shown, so add the
 * real profile links here (no placeholders go live).
 */
export const HELP_SOCIALS: { id: "x" | "linkedin" | "instagram" | "youtube" | "facebook"; url: string }[] = [
  { id: "x", url: "" },
  { id: "linkedin", url: "" },
  { id: "instagram", url: "" },
  { id: "youtube", url: "" },
  { id: "facebook", url: "" },
];
