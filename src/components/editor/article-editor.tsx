"use client";

import * as React from "react";
import { EditorContent, Extension, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { internalLinkKey, isInternalHref } from "@/lib/internal-links";
import { cn } from "@/lib/utils";

/** Marks the body's on-site links (`[data-internal-link]`) so they stand out and can be scrolled to. */
export const INTERNAL_LINK_ATTR = "data-internal-link";

/**
 * Decorates links to the site's own pages. Decorations only change what the
 * editor shows, never the HTML that is saved or published.
 */
const InternalLinks = Extension.create<{ domain: string }>({
  name: "internalLinks",
  addOptions: () => ({ domain: "" }),
  addProseMirrorPlugins() {
    const { domain } = this.options;
    const decorate = (doc: PmNode) => {
      const decorations: Decoration[] = [];
      doc.descendants((node, pos) => {
        const href: unknown = node.marks.find((m) => m.type.name === "link")?.attrs.href;
        if (node.isText && typeof href === "string" && isInternalHref(href, domain))
          decorations.push(
            Decoration.inline(pos, pos + node.nodeSize, {
              class: "internal-link",
              [INTERNAL_LINK_ATTR]: internalLinkKey(href, domain),
            }),
          );
      });
      return DecorationSet.create(doc, decorations);
    };
    const plugin: Plugin<DecorationSet> = new Plugin<DecorationSet>({
      state: {
        init: (_, state) => decorate(state.doc),
        apply: (tr, old) => (tr.docChanged ? decorate(tr.doc) : old),
      },
      props: { decorations: (state) => plugin.getState(state) },
    });
    return [plugin];
  },
});
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Article body editor. `lang` is the brand's content language, which can
 * differ from the UI language; the toolbar stays in the UI language.
 */
export function ArticleEditor({
  content,
  lang,
  label,
  domain = "",
  onChange,
  sync,
  onSynced,
  className,
}: {
  content: string;
  /**
   * A newer body from the server (it rewrites internal links on save). Each
   * new `version` replaces the editor's content, keeping the cursor where it
   * was. Only send it when the user hasn't typed since that save.
   */
  sync?: { html: string; version: number } | null;
  /** After a sync: the new text and HTML. Not an edit, so it must not trigger a save. */
  onSynced?: (text: string, html: string) => void;
  lang: string;
  /** The site's domain, to tell its own pages from other sites. */
  domain?: string;
  label: string;
  onChange?: (text: string, html: string) => void;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Keep the body's links exactly as written: no autolinking, no added
        // target/rel (an added nofollow would hurt internal links).
        link: { openOnClick: false, autolink: false, HTMLAttributes: { target: null, rel: null, class: null } },
      }),
      InternalLinks.configure({ domain }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rankoya-editor min-h-[420px] px-5 py-4 outline-none",
        lang,
        dir: "auto",
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor: e }) => onChange?.(e.getText(), e.getHTML()),
    onCreate: ({ editor: e }) => onChange?.(e.getText(), e.getHTML()),
  });

  const syncedVersion = React.useRef(0);
  const onSyncedRef = React.useRef(onSynced);
  React.useEffect(() => {
    onSyncedRef.current = onSynced;
  });
  React.useEffect(() => {
    if (!editor || !sync || sync.version === syncedVersion.current) return;
    syncedVersion.current = sync.version;
    if (sync.html === editor.getHTML()) return;
    const { from, to } = editor.state.selection;
    // No update event: this isn't an edit, so it mustn't trigger another save.
    editor.commands.setContent(sync.html, { emitUpdate: false });
    const size = editor.state.doc.content.size;
    editor.commands.setTextSelection({ from: Math.min(from, size), to: Math.min(to, size) });
    onSyncedRef.current?.(editor.getText(), editor.getHTML());
  }, [editor, sync]);

  return (
    <div
      className={cn("flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card", className)}
    >
      {editor ? <Toolbar editor={editor} /> : <Skeleton className="h-11 rounded-none" />}
      {editor ? <EditorContent editor={editor} /> : <Skeleton className="m-5 h-[380px]" />}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const t = useTranslations("editor.toolbar");
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const groups: {
    key: string;
    icon: LucideIcon;
    label: string;
    active?: boolean;
    disabled?: boolean;
    run: () => void;
  }[][] = [
    [
      {
        key: "h2",
        icon: Heading2Icon,
        label: t("h2"),
        active: state.h2,
        run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        key: "h3",
        icon: Heading3Icon,
        label: t("h3"),
        active: state.h3,
        run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      {
        key: "bold",
        icon: BoldIcon,
        label: t("bold"),
        active: state.bold,
        run: () => editor.chain().focus().toggleBold().run(),
      },
      {
        key: "italic",
        icon: ItalicIcon,
        label: t("italic"),
        active: state.italic,
        run: () => editor.chain().focus().toggleItalic().run(),
      },
    ],
    [
      {
        key: "bullet",
        icon: ListIcon,
        label: t("bullet"),
        active: state.bullet,
        run: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        key: "ordered",
        icon: ListOrderedIcon,
        label: t("ordered"),
        active: state.ordered,
        run: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        key: "quote",
        icon: QuoteIcon,
        label: t("quote"),
        active: state.quote,
        run: () => editor.chain().focus().toggleBlockquote().run(),
      },
    ],
    [
      {
        key: "undo",
        icon: Undo2Icon,
        label: t("undo"),
        disabled: !state.canUndo,
        run: () => editor.chain().focus().undo().run(),
      },
      {
        key: "redo",
        icon: Redo2Icon,
        label: t("redo"),
        disabled: !state.canRedo,
        run: () => editor.chain().focus().redo().run(),
      },
    ],
  ];

  return (
    <div
      role="toolbar"
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-1 border-b border-border bg-surface px-2 py-1.5"
    >
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <span aria-hidden className="mx-1 h-5 w-px bg-border" />}
          {group.map(({ key, icon: Icon, label, active, disabled, run }) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={active === undefined ? undefined : active}
              disabled={disabled}
              onClick={run}
              className={cn(
                "grid size-8 place-items-center rounded-md text-fg-2 transition-colors duration-120 hover:bg-surface-2 hover:text-fg disabled:opacity-40",
                active && "bg-surface-2 text-fg",
                (key === "undo" || key === "redo") && "rtl:-scale-x-100",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}
