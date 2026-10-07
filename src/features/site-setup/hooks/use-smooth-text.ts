"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";

/**
 * Releases `target` at a steady rate. Model output arrives in bursts; this
 * turns them into an even ~90 characters a second and speeds up when it falls
 * behind, so it never trails the model by more than about a second. `done`
 * means upstream has finished, so the rest is released quickly. With reduced
 * motion the text appears as it arrives.
 */
export function useSmoothText(target: string, { done = false, cps = 90 } = {}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = React.useState(0);
  const [base, setBase] = React.useState(target);
  // Text that was replaced rather than extended (a retry) starts again from the top.
  if (target !== base) {
    setBase(target);
    if (!target.startsWith(base)) setShown(0);
  }
  const count = Math.min(shown, target.length);
  const lastFrame = React.useRef<number | null>(null);

  // One frame per render while there is backlog; each frame releases what the elapsed time allows.
  React.useEffect(() => {
    if (reduce || count >= target.length) {
      lastFrame.current = null;
      return;
    }
    const raf = requestAnimationFrame((now) => {
      const dt = lastFrame.current === null ? 1 / 60 : Math.min(0.1, (now - lastFrame.current) / 1000);
      lastFrame.current = now;
      const backlog = target.length - count;
      const rate = cps + backlog / (done ? 0.4 : 1);
      setShown(count + Math.max(1, Math.round(rate * dt)));
    });
    return () => cancelAnimationFrame(raf);
  }, [count, target.length, done, cps, reduce]);

  const visible = reduce ? target : target.slice(0, count);
  return { visible, isCatchingUp: visible.length < target.length };
}
