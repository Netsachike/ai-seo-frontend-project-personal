"use client";

import * as React from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Tweens between values on data refresh (max 400 ms). The first render shows
 * the final value so server HTML and hydration match.
 */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const previous = React.useRef(value);
  const reduce = useReducedMotion();
  const formatRef = React.useRef(format);

  React.useEffect(() => {
    formatRef.current = format;
  });

  React.useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const node = ref.current;
    if (!node || from === value || reduce) {
      if (node) node.textContent = formatRef.current(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.4,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (latest) => {
        node.textContent = formatRef.current(latest);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
