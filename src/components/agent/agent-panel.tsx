"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, ExternalLinkIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { AgentThread } from "@/lib/api/types";
import { api, unwrap } from "@/lib/api/client";
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
    queryFn: async () => unwrap(await api.GET("/agent/threads/{threadId}", { params: { path: { threadId } } })),
  });
}

export function useSendAgentMessage(workspaceId: string, threadId = MAIN_THREAD_ID) {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const key = agentKeys.thread(workspaceId, threadId);
  return useMutation({
    mutationFn: async (text: string) => unwrap(await api.POST("/agent/messages", { body: { threadId, text, locale } })),
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
export function AgentPanel({ workspaceId, agentHref }: { workspaceId: string; agentHref: string }) {
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
        <div className="border-t border-border px-4 pt-2 pb-1">
          <Button asChild variant="link" size="sm" className="text-caption">
            <Link href={agentHref} onClick={() => setOpen(false)}>
              {t("openFull")}
              <ExternalLinkIcon aria-hidden className="size-3.5 rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AgentThreadView({ workspaceId, dense = false }: { workspaceId: string; dense?: boolean }) {
  const t = useTranslations("agent");
  const thread = useAgentThread(workspaceId);
  const send = useSendAgentMessage(workspaceId);
  const draft = useUiStore((s) => s.agentDraft);
  const setDraft = useUiStore((s) => s.setAgentDraft);
  const endRef = React.useRef<HTMLDivElement>(null);
  const count = thread.data?.messages.length ?? 0;

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft("");
    send.mutate(text);
  };

  const first = thread.data?.messages[0];

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
        {first && <DayDivider date={new Date(first.createdAt)} note={t("sameAsTelegram")} />}
        {thread.data?.messages.map((m) => (
          <Message key={m.id} message={m} dense={dense} />
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="border-t border-border p-3">
        <label className="flex items-end gap-2 rounded-lg border border-border-strong bg-surface p-2 ps-3 focus-within:border-blue">
          <span className="sr-only">{t("composerLabel")}</span>
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
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
