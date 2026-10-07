"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Markdown that may still be arriving. Headings come as plain lines (the
 * prompt asks for that), so a half-written line never shows stray markers.
 * The live region is only attached once writing ends, so screen readers hear
 * the finished text rather than every character.
 */
export function StreamedMarkdown({ text, writing, className }: { text: string; writing: boolean; className?: string }) {
  return (
    <div
      aria-live={writing ? undefined : "polite"}
      aria-busy={writing || undefined}
      className={cn(
        "text-body-lg text-fg [&_li]:mt-1.5 [&_li]:ps-1 [&_p]:mt-5 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:ps-7",
        className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
      {writing && (
        <span aria-hidden className="ms-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-signal" />
      )}
    </div>
  );
}
