"use client";

import * as React from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
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

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Article body editor. `lang` is the brand's content language, which can
 * differ from the UI language; the toolbar stays in the UI language.
 */
export function ArticleEditor({
  content,
  lang,
  label,
  onChange,
  className,
}: {
  content: string;
  lang: string;
  label: string;
  onChange?: (text: string, html: string) => void;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: false })],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "orbit-editor min-h-[420px] px-5 py-4 outline-none",
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
