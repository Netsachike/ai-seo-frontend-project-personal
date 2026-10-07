"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, ExternalLinkIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { AgentMessage, AgentThread } from "@/lib/api/types";
import { getAgentThread, sendAgentMessage } from "@/lib/mocks/store";
import { agentKeys } from "@/lib/api/query-keys";
import { useUiStore } from "@/lib/store/ui";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { OrbitAvatar } from "@/components/brand/logo";
import { DayDivider, Message } from "./message";

export const MAIN_THREAD_ID = "thr_main";

export function useAgentThread(workspaceId: string, threadId = MAIN_THREAD_ID) {
  return useQuery({
    queryKey: agentKeys.thread(workspaceId, threadId),
    queryFn: getAgentThread,
  });
}

export function useSendAgentMessage(workspaceId: string, threadId = MAIN_THREAD_ID) {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const key = agentKeys.thread(workspaceId, threadId);
  return useMutation({
    mutationFn: (text: string) => sendAgentMessage(text, locale),
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AgentThread>(key);
      queryClient.setQueryData<AgentThread>(key, (thread) =>
        thread
          ? {
              ...thread,
              messages: [
                ...thread.messages,
                {
                  id: `tmp_${Date.now()}`,
                  role: "user",
                  createdAt: new Date().toISOString(),
                  source: "web",
                  body: text,
                  approval: null,
                  task: null,
                },
              ],
            }
          : thread,
      );
      return { previous };
    },
    onError: (_error, _text, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** ⌘J / Ctrl+J toggles the panel from anywhere in the app. */
export function useAgentHotkey() {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        const { agentPanelOpen, setAgentPanelOpen } = useUiStore.getState();
        setAgentPanelOpen(!agentPanelOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * 400px end-side sheet. Same thread as /agent and Telegram. Opens from the
 * left in RTL because the sheet side is logical.
 */
/** `agentHref` links to the full agent page; left out where there is no site yet (the sites page). */
export function AgentPanel({ workspaceId, agentHref }: { workspaceId: string; agentHref?: string }) {
  const t = useTranslations("agent");
  const open = useUiStore((s) => s.agentPanelOpen);
  const setOpen = useUiStore((s) => s.setAgentPanelOpen);
  useAgentHotkey();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="end" overlay={false} className="gap-0">
        <SheetHeader className="flex-row items-center gap-3">
          <OrbitAvatar size={28} />
          <div className="flex min-w-0 flex-col">
            <SheetTitle>{t("panelTitle")}</SheetTitle>
            <SheetDescription>{t("panelDescription")}</SheetDescription>
          </div>
        </SheetHeader>
        <AgentThreadView workspaceId={workspaceId} dense />
        {agentHref && (
          <div className="border-t border-border px-4 pt-2 pb-1">
            <Button asChild variant="link" size="sm" className="text-caption">
              <Link href={agentHref} onClick={() => setOpen(false)}>
                {t("openFull")}
                <ExternalLinkIcon aria-hidden className="size-3.5 rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function AgentThreadView({
  workspaceId,
  dense = false,
  suggestions,
}: {
  workspaceId: string;
  dense?: boolean;
  /** One-tap prompts shown above the composer. */
  suggestions?: string[];
}) {
  const t = useTranslations("agent");
  const thread = useAgentThread(workspaceId);
  const send = useSendAgentMessage(workspaceId);
  const draft = useUiStore((s) => s.agentDraft);
  const setDraft = useUiStore((s) => s.setAgentDraft);
  const endRef = React.useRef<HTMLDivElement>(null);
  // Replies after the last send are revealed as a stream (SSE stub). -1 = nothing sent yet.
  const [sentAfter, setSentAfter] = React.useState(-1);
  const messages = thread.data?.messages ?? [];
  const count = messages.length;

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count, send.isPending]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || send.isPending) return;
    setDraft("");
    setSentAfter(count);
    send.mutate(value);
  };

  const streamingId =
    sentAfter >= 0 ? messages.findLast((m, i) => i >= sentAfter && m.role === "agent")?.id : undefined;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5" aria-live="polite">
        {thread.isPending &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-6 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </div>
          ))}
        {thread.isError && <p className="text-body text-danger">{t("loadError")}</p>}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          return (
            <React.Fragment key={m.id}>
              {newDay && <DayDivider date={new Date(m.createdAt)} note={i === 0 ? t("sameAsTelegram") : undefined} />}
              {m.id === streamingId ? (
                <StreamingMessage key={m.id} message={m} dense={dense} />
              ) : (
                <Message message={m} dense={dense} />
              )}
            </React.Fragment>
          );
        })}
        {send.isPending && <TypingIndicator />}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        className="flex flex-col gap-2 border-t border-border p-3"
      >
        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                disabled={send.isPending}
                className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-small text-fg-2 hover:border-fg-3 hover:text-fg disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <label className="flex items-end gap-2 rounded-lg border border-border-strong bg-surface p-2 ps-3 focus-within:border-blue">
          <span className="sr-only">{t("composerLabel")}</span>
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit(draft);
              }
            }}
            placeholder={t("composerPlaceholder")}
            className="min-h-11 flex-1 resize-none bg-transparent py-1 text-body text-fg outline-hidden placeholder:text-fg-3 focus-visible:outline-none!"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon-sm"
            aria-label={t("send")}
            disabled={!draft.trim()}
            loading={send.isPending}
          >
            <ArrowUpIcon />
          </Button>
        </label>
      </form>
    </>
  );
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reveals a reply word by word, like a streamed SSE response. Instant with reduced motion. */
function StreamingMessage({ message, dense }: { message: AgentMessage; dense?: boolean }) {
  const words = React.useMemo(() => message.body.split(/(\s+)/), [message.body]);
  const [shown, setShown] = React.useState(() => (prefersReducedMotion() ? words.length : 0));
  React.useEffect(() => {
    if (shown >= words.length) return;
    const timer = setTimeout(() => setShown((n) => Math.min(words.length, n + 2)), 28);
    return () => clearTimeout(timer);
  }, [shown, words.length]);
  const done = shown >= words.length;
  return (
    <div aria-busy={!done}>
      <Message
        message={done ? message : { ...message, body: words.slice(0, shown).join(""), approval: null, task: null }}
        dense={dense}
      />
    </div>
  );
}

function TypingIndicator() {
  const t = useTranslations("agent");
  return (
    <div className="flex items-center gap-3" role="status">
      <OrbitAvatar size={24} />
      <span className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className="size-1.5 animate-pulse rounded-full bg-fg-3"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
        <span className="sr-only">{t("typing")}</span>
      </span>
    </div>
  );
}
