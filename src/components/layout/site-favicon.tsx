"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { EntityAvatar } from "./avatars";

/** The site's favicon on a white tile; the initials tile when there is none or it fails to load. */
export function SiteFavicon({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) return <EntityAvatar name={name} size={size} className={cn("rounded-lg", className)} />;
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-lg border border-border bg-white", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- favicons come from any origin */}
      <img src={src} alt="" onError={() => setFailed(true)} className="size-1/2 object-contain" />
    </span>
  );
}
