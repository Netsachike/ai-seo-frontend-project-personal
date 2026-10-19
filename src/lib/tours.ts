import { getSessionUserFromCookie, writeSessionUserCookie } from "@/lib/auth-session";
import authService from "@/services/auth";

/**
 * Page tours (driver.js). Each brand page has at most one; steps point at
 * `data-tour` attributes, never text or classes, so they still match on a
 * page Google Translate has rewritten. Copy lives in messages under `tour`.
 *
 * Behaviour, chosen on purpose (see the Flowcasta plan, §2.4): a brand-new
 * user sees each page's tour once, the first time they open that page.
 * Finishing or closing it means it doesn't start by itself again. Either also
 * tells the server (`PATCH /user/tour-completed`) so another browser doesn't
 * start them again, once that endpoint exists. Turning the Tour switch on in
 * the profile menu replays the page's tour any time.
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
//
// Until `PATCH /user/tour-completed` exists, this browser is the record:
// every flag lives in localStorage, under the signed-in user's id, so it
// survives reloads and sign-outs and never leaks to another account.
// - Done or closed on a page: that page's tour never starts by itself again.
// - The profile menu's switch: off stops tours starting anywhere; on replays
//   this page's tour now.

export const TOUR_TOGGLE_EVENT = "rankoya:tour-toggle";
export type TourToggleDetail = { action: "start" | "stop" };

const userKey = () => getSessionUserFromCookie()?.id ?? "anon";
const KEY = {
  enabled: () => `rankoya:tour:${userKey()}:enabled`,
  done: (id: TourId) => `rankoya:tour:${userKey()}:done:${id}`,
};

const store = {
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

const sameDay = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

/** Joined today and the server hasn't recorded a finished tour. */
export function isBrandNewUser(): boolean {
  const user = getSessionUserFromCookie();
  return Boolean(user && !user.tour_completed && user.date_joined && sameDay(user.date_joined));
}

/** The switch, once the user has used it; before that, on for brand-new users only. */
export function isTourEnabled(): boolean {
  const v = store.get(KEY.enabled());
  if (v === "1") return true;
  if (v === "0") return false;
  return isBrandNewUser();
}

/** Finished or closed on this page before. */
export const isTourDone = (id: TourId) => store.get(KEY.done(id)) === "1";

/** Whether this tour should start by itself on its page. */
export const shouldShowTour = (id: TourId) => isTourEnabled() && !isTourDone(id);

/** The switch's state on this page: tours are on and this one hasn't been seen. */
export function isTourOnForPath(pathname: string): boolean {
  const tour = getTourForPath(pathname);
  return Boolean(tour && shouldShowTour(tour.id));
}

const emit = (action: TourToggleDetail["action"]) =>
  window.dispatchEvent(new CustomEvent<TourToggleDetail>(TOUR_TOGGLE_EVENT, { detail: { action } }));

/** The profile menu's switch. On: tours back on, and this page's plays now. Off: no tours start anywhere. */
export function setTourOnForPath(pathname: string, on: boolean) {
  const tour = getTourForPath(pathname);
  store.set(KEY.enabled(), on ? "1" : "0");
  if (on && tour) {
    store.remove(KEY.done(tour.id));
    emit("start");
  } else {
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

/** Done on the last step. */
export function finishTour(id: TourId) {
  store.set(KEY.done(id), "1");
  emit("stop");
  markTourCompletedOnServer();
}

/** Closed early (X, Close, Esc, clicking outside): remembered the same way, so it doesn't come back. */
export function dismissTour(id: TourId) {
  store.set(KEY.done(id), "1");
  emit("stop");
  markTourCompletedOnServer();
}

/** Flags from the first version, which weren't per user. Safe to call any time. */
export function clearTourState() {
  if (typeof window === "undefined") return;
  for (const k of ["rankoya:tour:enabled", "rankoya:tour:new"]) store.remove(k);
  for (const id of ALL_TOUR_IDS) {
    store.remove(`rankoya:tour:finished:${id}`);
    try {
      window.sessionStorage.removeItem(`rankoya:tour:dismissed:${id}`);
    } catch {
      // Nothing to clear.
    }
  }
}
