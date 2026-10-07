/**
 * Site setup motion: short (200–450 ms), one entering curve, at most 24px of
 * travel. The point is continuity, not something to watch.
 */
export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const dur = { fast: 0.2, base: 0.35, slow: 0.45 };

/** Step slide distance in px. */
export const SHIFT = 24;
export const STAGGER = 0.04;
