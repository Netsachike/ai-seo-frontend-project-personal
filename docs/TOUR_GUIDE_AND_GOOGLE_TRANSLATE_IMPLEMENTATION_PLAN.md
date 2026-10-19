# Page Tour Guide + Google Translate — Implementation Plan (for Rankoya)

Status: **both shipped in Flowcasta**, written up so Rankoya can build the same pair.

The two features are covered together because they live in the same place (the dashboard top bar and the profile menu), are both client-only, both patch or overlay the live DOM, and have to keep working alongside each other: a tour has to find its targets on a translated page, and its popovers should come out in the user's chosen language.

| Feature | What it is | Backend needed |
| --- | --- | --- |
| **Tour guide** | Guided, per-page walkthroughs built on [`driver.js`](https://driverjs.com) `1.7.0`. They auto-start for brand-new users and can be toggled from the profile menu. | `tour_completed` on the user + `PATCH /user/tour-completed` (shared) |
| **Google Translate** | A custom language dropdown driving Google's free "Website Translator" widget. Google translates the rendered DOM in place. No i18n library, no translation files. | None |

Flowcasta reference files:

| Concern | File |
| --- | --- |
| Tour definitions, persistence, new-user logic | `lib/tours.ts` |
| Tour runner (driver.js) | `components/tour/TourProvider.tsx` |
| Tour mount | `app/(dashboard)/layout.tsx` (`<TourProvider />` after `<main>`) |
| Tour toggle + translate mount | `components/layout/TopBar.tsx` |
| Session cookie (`tour_completed`, `date_joined`, `clearTourState` calls) | `lib/auth-session.ts` |
| User type (`tour_completed`) | `types/types.ts` (`User`) |
| Translate component | `components/layout/GoogleTranslate.tsx` |
| React/Translate DOM polyfill | `app/layout.tsx` (`<Script id="google-translate-polyfill">`) |
| Tour popover styling + Google UI hiding | `app/globals.css` (search `Page tour (driver.js)` and `Google Translate widget`) |

---

## 1. How the two fit together

```text
app/layout.tsx (root)
  └ <Script strategy="beforeInteractive">  Node.prototype polyfill   ◀── needed by Translate, protects the whole app
app/(dashboard)/layout.tsx
  ├ <TopBar>
  │    ├ <GoogleTranslate/>      (next/dynamic, ssr:false)  → language pill + dropdown
  │    └ Profile menu ▸ "Tour" switch (only on routes that have a tour)
  ├ <main>{page}</main>          pages mark targets with data-tour="…"
  └ <TourProvider/>              watches pathname, runs driver.js
```

Integration rules that matter:

1. **Tour targets use `data-tour` attributes, never text or classes.** Google Translate rewrites text nodes and wraps them in `<font>` tags, but it leaves attributes alone, so `[data-tour="new-project"]` still matches on a page translated into Japanese. Don't select tour targets by visible text.
2. **The polyfill protects the tour as well.** driver.js and React both move nodes around. Without the polyfill, a translated page can white-screen the first time React reconciles a node Google has replaced.
3. **The translate pill can itself be a tour step.** Its trigger is a normal button in the top bar, so give it a `data-tour` attribute if you want to point at it. Flowcasta does this for the workspace switcher, plan chip and Facebook group button.

---

## 2. Part A: Tour guide

### 2.1 Behaviour

- **Per page.** Each route has at most one tour. Flowcasta has three: `/home`, `/channels` and `/channels/[id]`.
- **Auto-start for brand-new users.** A user is brand new when `tour_completed` is false **and** the account was created today (`created_at`). Everyone else defaults to off.
- **Manual start.** On a route with a tour, the profile menu shows a **Tour** switch. Turning it on replays that page's tour straight away. Turning it off stops it.
- **Finish vs. cancel.** Clicking **Done** on the last step marks that tour *finished* (`localStorage`, never auto-shows again). Closing early (the X, the injected **Close** button, Esc or overlay click) marks it *dismissed* for this browser session only (`sessionStorage`).
- **Server flag.** Both finishing and dismissing fire `PATCH /user/tour-completed`. That way the new-user auto-start doesn't fire again on another browser.
- **Session boundaries.** Login, register and logout all call `clearTourState()`, so one account's tour flags never carry over to the next account on a shared browser.

### 2.2 Backend contract (shared)

```ts
// On the User returned by POST /login and GET /me
export interface User {
  // ...
  created_at: string;
  // Set to true once the user completes or dismisses the onboarding tour.
  tour_completed?: boolean;
}

// PATCH /user/tour-completed   (authenticated)
// body: { tour_completed: true }
```

The call is fire-and-forget: the front end updates the session cookie first and ignores any failure. **Action for Rankoya:** confirm with the backend that the column and route are switched on for the Rankoya app, and that `tour_completed` is returned on both `/login` and `/me`.

### 2.3 Steps

**Step 1: Install**

```bash
npm install driver.js@1.7.0
```

Import the base stylesheet once, in the provider: `import "driver.js/dist/driver.css";`.

**Step 2: Session shape**

Add `tour_completed?: boolean` to the `User` type. Map `tour_completed` and `date_joined` (`user.created_at`) into the session-cookie user (`mapUserToSession` in Flowcasta). The register-response mapper doesn't need it: undefined counts as "not completed", which is right for a new account.

**Step 3: `lib/tours.ts`, the tour registry and state**

Port the file as-is, then swap the content. It contains:

| Export | Purpose |
| --- | --- |
| `TourId`, `TourDefinition` | `{ id, steps: DriveStep[] }`, where `DriveStep` comes from driver.js |
| `HOME_TOUR`, … | Step lists: `element: '[data-tour="…"]'` + `popover: { title, description, side, align }` |
| `getTourForPath(pathname)` | Route → tour (exact match or regex). This is the only routing table. |
| `isBrandNewUser()` | `!tour_completed && created today` |
| `isTourEnabled()` | `localStorage` flag if set, otherwise `isBrandNewUser()` |
| `isTourOnForPath` / `setTourOnForPath` | Read/flip the per-page switch. Turning on clears that tour's finished + dismissed flags. |
| `finishTour` / `dismissTour` | Write the local flag, emit the toggle event, PATCH the server |
| `clearTourState()` | Wipe all flags at session boundaries. **Keep `ALL_TOUR_IDS` in sync with `TourId`.** |
| `TOUR_TOGGLE_EVENT` | `window` `CustomEvent` linking the top-bar switch and the provider |

Storage keys are namespaced `flowcasta:tour:*`. Rename them to `rankoya:tour:*` along with the event name.

**Step 4: `TourProvider`**

A client component that renders `null`, mounted once inside the authenticated layout (after `<main>`, so it sees every page). It:

1. On every `pathname` change, stops any running tour, then auto-starts the page's tour if it is enabled, not finished and not dismissed. It **waits 900 ms** first so the page can fetch data and render its targets.
2. **Filters out steps whose element isn't in the DOM** (role-gated buttons, empty states). If no steps are left, it does nothing. This is why a missing target never highlights a blank area.
3. Configures driver.js: `showProgress`, `"{{current}} of {{total}}"`, `popoverClass: "flowcasta-tour"`, overlay `#000` at `0.68`, `stagePadding: 6`, `stageRadius: 10`, `smoothScroll: true`.
4. In `onPopoverRender`, adds a **Close** button to the footer that dismisses the tour.
5. In `onDestroyStarted`, uses `instance.hasNextStep()` to tell finish from cancel. **It calls `instance.destroy()` before** `finishTour`/`dismissTour`. Those functions emit the toggle event, which calls `stopTour()`, and destroying first stops that handler from running again on an instance that is already being torn down.
6. Listens for `TOUR_TOGGLE_EVENT` to start or stop on demand.

**Step 5: Mark targets**

Add `data-tour="<name>"` to each element a step points at. Put it on a wrapper that is always rendered, not on something inside a closed popover or a tab that isn't showing.

**Step 6: Toggle in the top bar**

Show the item only when `getTourForPath(pathname) !== null`. Read its state with `useSyncExternalStore`, subscribed to `TOUR_TOGGLE_EVENT`, with a server snapshot of `false` so hydration never mismatches:

```tsx
const tourOn = React.useSyncExternalStore(
  (onStoreChange) => {
    window.addEventListener(TOUR_TOGGLE_EVENT, onStoreChange);
    return () => window.removeEventListener(TOUR_TOGGLE_EVENT, onStoreChange);
  },
  () => isTourOnForPath(pathname),
  () => false,
);
```

In Flowcasta it is a `menuitemcheckbox` in the profile dropdown with a non-interactive `Switch`. **Let the menu close on select**, because an open dropdown would cover the elements the tour highlights.

**Step 7: Session boundaries**

Call `clearTourState()` in `initializeSession` (login), `initializeSessionFromRegistration` (register) and `clearSession` (logout).

**Step 8: Styling**

Flowcasta restyles the popover with `.driver-popover.flowcasta-tour { all: unset; … }` and themes the title, description, footer, buttons, close X and arrows with design tokens (`--surface`, `--border-strong`, `--brand`, `--radius-xl`). Re-skin it with Rankoya's tokens, and give `.driver-popover.rankoya-tour` a `z-index` above every modal and toast.

### 2.4 Known issue to decide on before porting

The comments in `lib/tours.ts` say that dismissing one page's tour leaves other pages to "still auto-show on their first visit". The code doesn't do that today. `dismissTour` and `finishTour` both run `markTourCompletedOnServer()`, which sets `tour_completed: true` in the session cookie. Unless the user has turned the switch on by hand (which writes the `localStorage` flag), `isTourEnabled()` falls back to `isBrandNewUser()`, and that now returns false. **So finishing or closing the first tour stops auto-start on every page.**

Rankoya should pick one behaviour on purpose:

- **"One onboarding tour, then stop":** keep the code and correct the comments.
- **"Each page auto-shows once":** only PATCH the server once every tour is finished, or have `isTourEnabled()` ignore `tour_completed` once the session has started.

---

## 3. Part B: Google Translate

### 3.1 How it works

Google's widget script (`translate.google.com/translate_a/element.js`) mounts a hidden `<select class="goog-te-combo">` and reads a `googtrans` cookie in `/<from>/<to>` form (for example `/en/fr`). We hide all of Google's UI and render our own dropdown. Picking a language does two things:

1. Writes the cookie, so the choice survives reloads.
2. Sets the hidden `<select>` and dispatches `change`, so the page re-translates straight away. If the widget hasn't mounted yet, it reloads instead and the cookie applies on load.

The trade-off: there is no translation content to maintain and every page is covered, but it is client-side machine translation. Quality varies and SEO doesn't benefit.

### 3.2 Steps

**Step 1: Polyfill in the root layout (required)**

Without this, React throws `NotFoundError: Failed to execute 'removeChild' / 'insertBefore' on 'Node'` after Google has replaced text nodes, and the app white-screens at random. Port it as-is, with `next/script` and `strategy="beforeInteractive"` in `<head>`, so it runs before hydration:

```tsx
<Script id="google-translate-polyfill" strategy="beforeInteractive">
  {`
    if (typeof Node === 'function' && Node.prototype) {
      const originalRemoveChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function (child) {
        if (child.parentNode !== this) return child;
        return originalRemoveChild.apply(this, arguments);
      };
      const originalInsertBefore = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function (newNode, referenceNode) {
        if (referenceNode && referenceNode.parentNode !== this) return newNode;
        return originalInsertBefore.apply(this, arguments);
      };
    }
  `}
</Script>
```

> This is Next.js 16. Check `node_modules/next/dist/docs/` for the current `next/script` / `beforeInteractive` rules (root layout only) before wiring it in.

**Step 2: `GoogleTranslate` component**

Port `components/layout/GoogleTranslate.tsx`. Its parts:

- **Typed globals.** `window.google.translate.TranslateElement` and `window.googleTranslateElementInit`, typed properly with no `any`.
- **`LANGUAGES`.** `{ code, short, name, flag }`, English first, then alphabetical. `code` is **Google's** code, which isn't always ISO (Simplified Chinese is `zh-CN`). Cut the list to what Rankoya wants to offer.
- **Constants.** `SCRIPT_ID = "google-translate-script"`, `CONTAINER_ID = "google_translate_element"`, `TRANSLATE_COOKIE = "googtrans"`, `SOURCE_LANGUAGE = "en"` (Rankoya's source content language).
- **Initial state from the cookie.** `useState(readSavedLanguage)`, so the pill opens on the last choice instead of flashing "EN". This is safe because the component is client-only.
- **Effect (runs once).** Defines `window.googleTranslateElementInit` (calls `new TranslateElement({ pageLanguage, autoDisplay: false }, CONTAINER_ID)`), then adds the script once, guarded by `SCRIPT_ID`. The `cb=googleTranslateElementInit` query param **must** match the global's name.
- **`changeLanguage(code)`.** `setCookie("googtrans", "/en/<code>", { path: "/" })` → drive `.goog-te-combo` + dispatch `change` → fall back to `window.location.reload()` if the select isn't there yet. Keep both paths.
- **Markup.** The hidden `<div id="google_translate_element" className="invisible absolute" />` (Google needs it) plus a dropdown: a flag + short-code pill trigger with an `aria-label` naming the current language, and a scrollable list with a check on the active item.

Uses `cookies-next/client` (`getCookie`, `setCookie`). Rankoya can use any cookie helper, as long as the cookie is `googtrans` on path `/`.

**Step 3: Mount client-only**

```tsx
// Browser-only: it injects Google's script and touches window/document.
const GoogleTranslate = dynamic(
  () => import("@/components/layout/GoogleTranslate"),
  { ssr: false },
);
```

Render it in the top bar. Flowcasta puts it between the community button and the profile avatar.

**Step 4: CSS**

```css
/* Hide every piece of UI Google injects, including the banner. */
.goog-te-banner-frame,
.goog-te-gadget-icon,
.skiptranslate,
#google_translate_element {
  display: none !important;
}

/* Undo the top offset Google's banner adds to <body>. */
body {
  top: 0 !important;
}

/* Google wraps translated runs in <font> tags — keep them inheriting. */
font {
  background-color: transparent !important;
  box-shadow: none !important;
  color: inherit !important;
}
```

**Step 5: CSP (only if Rankoya has one)**

Flowcasta sends no Content-Security-Policy header. If Rankoya does, allow `translate.google.com`, `translate.googleapis.com` and `www.gstatic.com` for scripts, styles, images and frames, and allow the polyfill's inline script (with a nonce or hash).

**Step 6 (optional): keep content untranslated**

Add `translate="no"` (or the `notranslate` class) to anything that must stay exactly as written: brand names, code, stream keys, user-entered titles. Flowcasta doesn't do this yet.

---

## 4. Adapting to Rankoya

| Flowcasta | Swap for |
| --- | --- |
| `flowcasta:tour:*` storage keys, `flowcasta:tour-toggle` event | `rankoya:` prefix |
| `popoverClass: "flowcasta-tour"` + `.driver-popover.flowcasta-tour` CSS | `rankoya-tour` + Rankoya design tokens |
| `HOME_TOUR`, `CHANNELS_TOUR`, `CHANNEL_DETAIL_TOUR` and their routes | Rankoya's pages and copy |
| `DropdownMenu`, `Switch`, `CircleHelp` icon, `cn` | Rankoya's UI primitives |
| `getSessionUserFromCookie`, `writeSessionUserCookie`, `api` client | Rankoya's session helpers + shared axios instance |
| `LANGUAGES` list (100+ entries) | Languages Rankoya offers |

Keep these unchanged: the backend contract, the polyfill, the `googtrans` cookie format, the hide-Google CSS, the `data-tour` selector convention, and the destroy-before-emit ordering in `onDestroyStarted`.

---

## 5. QA checklist

**Tour**

- [ ] New account created today, `tour_completed: false`: the tour auto-starts on the first tour page after about 1 s.
- [ ] Existing account: no auto-start, and the Tour switch is off.
- [ ] The Tour switch appears only on pages that have a tour, and turning it on replays the tour.
- [ ] Steps whose target isn't rendered (role-hidden, empty state) are skipped, and the progress count reflects that.
- [ ] **Done** on the last step: the tour doesn't auto-show again on reload and the switch flips off.
- [ ] **Close** / X / Esc mid-way: silenced for this session and back in a new session (subject to the decision in §2.4).
- [ ] `PATCH /user/tour-completed` fires once on finish/dismiss, and `/me` then returns `tour_completed: true`.
- [ ] Log out, then log in as a different user on the same browser: no leftover tour flags.
- [ ] Moving to another route mid-tour tears the old tour down cleanly.
- [ ] Popover is styled in both light and dark themes and sits above modals.

**Translate**

- [ ] The language pill renders, and Google's banner and gadget never appear. `body` isn't pushed down.
- [ ] Choosing French translates the page without a reload. After a reload the page is still French and the pill shows "FR".
- [ ] Choosing a language straight after a hard refresh (widget not ready) reloads into that language.
- [ ] Switching back to English restores the original text.
- [ ] Navigating between pages, opening modals and editing forms on a translated page never white-screens and the console shows no `removeChild`/`insertBefore` errors.

**Together**

- [ ] With the page translated, start the tour: every step still finds its target.
- [ ] Tour popover titles and descriptions come out in the chosen language. If any stay in English, add `translate="yes"` to the popover through `onPopoverRender`, or accept English popovers.
- [ ] Prev/Next/Close still work while translated.
