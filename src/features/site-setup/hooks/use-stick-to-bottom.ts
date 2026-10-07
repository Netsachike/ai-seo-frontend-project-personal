"use client";

import * as React from "react";

/** The setup column's scroll container. */
export const SETUP_SCROLL_ID = "setup-scroll";

/**
 * While text writes itself in, keeps the newest line in view. Stops following
 * as soon as the user scrolls up, and picks up again once they are back near
 * the bottom.
 */
export function useStickToBottom(active: boolean, dep: unknown) {
  const pinned = React.useRef(true);

  React.useEffect(() => {
    const el = document.getElementById(SETUP_SCROLL_ID);
    if (!el || !active) return;
    pinned.current = true;
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [active]);

  React.useEffect(() => {
    const el = document.getElementById(SETUP_SCROLL_ID);
    if (el && active && pinned.current) el.scrollTo({ top: el.scrollHeight });
  }, [active, dep]);
}
