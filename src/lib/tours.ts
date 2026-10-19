import { getSessionUserFromCookie, writeSessionUserCookie } from "@/lib/auth-session";
import authService from "@/services/auth";

/**
 * Page tours (driver.js). Each brand page has at most one; steps point at
 * `data-tour` attributes, never text or classes, so they still match on a
 * page Google Translate has rewritten. Copy lives in messages under `tour`.
 *
 * Behaviour, chosen on purpose (see the Flowcasta plan, §2.4): a brand-new
 * user sees each page's tour once, the first time they open that page.
 * Finishing a tour (Done) silences it for good in this browser; closing it
 * early silences it for this browser session. Either also tells the server
 * (`PATCH /user/tour-completed`) so another browser doesn't start them again.
 * Turning a page's Tour switch on in the profile menu replays it any time.
 */

export type TourId =
  | "overview"
  | "visibility"
  | "rankings"
  | "integrations"
  | "competitors"
  | "audit"
  | "keywords"
  | "articles"
  | "authority";

/** Keep in step with TourId: clearTourState() wipes these. */
const ALL_TOUR_IDS: TourId[] = [
  "overview",
  "visibility",
  "rankings",
  "integrations",
  "competitors",
  "audit",
  "keywords",
  "articles",
  "authority",
];

export type TourStepDef = {
  /** `data-tour` value of the element the step points at. */
  target: string;
  /** Message key under `tour.<id>.<key>` (title + body). */
  key: string;
  side?: "top" | "right" | "bottom" | "left";
};

export type TourDefinition = { id: TourId; steps: TourStepDef[] };

const shell: TourStepDef[] = [
  { target: "site-card", key: "site", side: "right" },
  { target: "sidebar-nav", key: "nav", side: "right" },
];
const header: TourStepDef[] = [
  { target: "page-header", key: "header", side: "bottom" },
  { target: "page-actions", key: "actions", side: "bottom" },
];

const TOURS: Record<TourId, TourDefinition> = {
  overview: {
    id: "overview",
    steps: [
      ...shell,
      ...header,
      { target: "ask-rankoya", key: "assistant", side: "bottom" },
      { target: "language", key: "language", side: "bottom" },
      { target: "profile-menu", key: "profile", side: "bottom" },
    ],
  },
  visibility: { id: "visibility", steps: [...header, { target: "question-tests", key: "questions", side: "top" }] },
  rankings: { id: "rankings", steps: [...header, { target: "gsc-card", key: "gsc", side: "top" }] },
  integrations: { id: "integrations", steps: [...header, { target: "integrations-list", key: "list", side: "top" }] },
  competitors: { id: "competitors", steps: [...header, { target: "competitors-guide", key: "guide", side: "bottom" }] },
  audit: { id: "audit", steps: [...header, { target: "audit-tabs", key: "tabs", side: "bottom" }] },
  keywords: { id: "keywords", steps: header },
  articles: { id: "articles", steps: header },
  authority: { id: "authority", steps: header },
};

/** `/{siteId}/{section}` (brand pages are keyed by the numeric site id). */
const BRAND_PAGE = /^\/\d+\/([a-z-]+)\/?$/;

/** Route → tour. The only routing table for tours. */
export function getTourForPath(pathname: string): TourDefinition | null {
  const section = BRAND_PAGE.exec(pathname)?.[1];
  return section && section in TOURS ? TOURS[section as TourId] : null;
}

// ── State ────────────────────────────────────────────────────────────────

const KEY = {
  enabled: "rankoya:tour:enabled",
  isNew: "rankoya:tour:new",
  finished: (id: TourId) => `rankoya:tour:finished:${id}`,
  dismissed: (id: TourId) => `rankoya:tour:dismissed:${id}`,
};

export const TOUR_TOGGLE_EVENT = "rankoya:tour-toggle";
export type TourToggleDetail = { action: "start" | "stop" };

const local = {
  get: (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      // Storage blocked: the tour just won't remember.
    }
  },
  remove: (k: string) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // Nothing to clear.
    }
  },
};
const session = {
  get: (k: string) => {
    try {
      return window.sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      window.sessionStorage.setItem(k, v);
    } catch {
      // Storage blocked.
    }
  },
  remove: (k: string) => {
    try {
      window.sessionStorage.removeItem(k);
    } catch {
      // Nothing to clear.
    }
  },
};

const sameDay = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

/**
 * Not finished a tour yet and joined today. Remembered for the session the
 * first time it's true, so finishing one page's tour (which tells the
 * server) doesn't stop the other pages' tours from showing once.
 */
export function isBrandNewUser(): boolean {
  if (local.get(KEY.isNew) === "1") return true;
  const user = getSessionUserFromCookie();
  const isNew = Boolean(user && !user.tour_completed && user.date_joined && sameDay(user.date_joined));
  if (isNew) local.set(KEY.isNew, "1");
  return isNew;
}

/** The switch in the profile menu, if the user has touched it; otherwise on for brand-new users only. */
export function isTourEnabled(): boolean {
  const v = local.get(KEY.enabled);
  if (v === "1") return true;
  if (v === "0") return false;
  return isBrandNewUser();
}

export const isTourFinished = (id: TourId) => local.get(KEY.finished(id)) === "1";
export const isTourDismissed = (id: TourId) => session.get(KEY.dismissed(id)) === "1";

/** Whether this tour should start on its page. */
export const shouldShowTour = (id: TourId) => isTourEnabled() && !isTourFinished(id) && !isTourDismissed(id);

export function isTourOnForPath(pathname: string): boolean {
  const tour = getTourForPath(pathname);
  return Boolean(tour && shouldShowTour(tour.id));
}

const emit = (action: TourToggleDetail["action"]) =>
  window.dispatchEvent(new CustomEvent<TourToggleDetail>(TOUR_TOGGLE_EVENT, { detail: { action } }));

/** The profile menu's switch: on replays this page's tour now, off stops it. */
export function setTourOnForPath(pathname: string, on: boolean) {
  const tour = getTourForPath(pathname);
  if (!tour) return;
  if (on) {
    local.set(KEY.enabled, "1");
    local.remove(KEY.finished(tour.id));
    session.remove(KEY.dismissed(tour.id));
    emit("start");
  } else {
    session.set(KEY.dismissed(tour.id), "1");
    emit("stop");
  }
}

/** Fire-and-forget: the cookie is updated first and a failed request is ignored. */
function markTourCompletedOnServer() {
  const user = getSessionUserFromCookie();
  if (!user || user.tour_completed) return;
  writeSessionUserCookie({ ...user, tour_completed: true });
  void authService.markTourCompleted().catch(() => {});
}

export function finishTour(id: TourId) {
  local.set(KEY.finished(id), "1");
  emit("stop");
  markTourCompletedOnServer();
}

export function dismissTour(id: TourId) {
  session.set(KEY.dismissed(id), "1");
  emit("stop");
  markTourCompletedOnServer();
}

/** At sign-in and sign-out, so one account's tour flags never carry over to the next. */
export function clearTourState() {
  if (typeof window === "undefined") return;
  local.remove(KEY.enabled);
  local.remove(KEY.isNew);
  for (const id of ALL_TOUR_IDS) {
    local.remove(KEY.finished(id));
    session.remove(KEY.dismissed(id));
  }
}
