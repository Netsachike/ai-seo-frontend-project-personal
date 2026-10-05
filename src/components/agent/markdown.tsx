"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const components: Components = {
  p: ({ node: _node, ...props }) => <p dir="auto" className="[&:not(:first-child)]:mt-3" {...props} />,
  a: ({ node: _node, ...props }) => <a className="text-blue underline underline-offset-3" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="mt-3 list-disc ps-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="mt-3 list-decimal ps-5" {...props} />,
  code: ({ node: _node, ...props }) => (
    <code className="rounded-sm bg-surface-2 px-1 font-mono text-[13px]" {...props} />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="mt-3 overflow-x-auto rounded-md border border-border">
      <table dir="auto" className="w-full border-collapse text-small" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }) => <thead className="bg-bg text-fg-2" {...props} />,
  th: ({ node: _node, style, ...props }) => (
    <th
      className={cn(
        "px-3 py-2 text-start font-semibold whitespace-nowrap",
        style?.textAlign === "right" && "text-end num",
      )}
      {...props}
    />
  ),
  td: ({ node: _node, style, ...props }) => (
    <td
      className={cn(
        "border-t border-border px-3 py-2 whitespace-nowrap",
        style?.textAlign === "right" && "text-end num",
      )}
      {...props}
    />
  ),
};

/** Agent markdown: GFM tables, right-aligned numeric columns rendered in mono. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div dir="auto" className={cn("min-w-0 break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
