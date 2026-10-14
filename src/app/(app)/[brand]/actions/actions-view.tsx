"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CheckCheckIcon,
  CheckIcon,
  Loader2Icon,
  ListChecksIcon,
  PanelRightOpenIcon,
  ScanSearchIcon,
} from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { opportunityKeys } from "@/lib/api/query-keys";
import { toNumber } from "@/services/api/helpers";
import opportunityService from "@/services/opportunities";
import type { ActionCard, ActionColumn } from "@/lib/mocks/ui-data-work";
import { useActionPlan, useAnalyzeOpportunities, useUpdateOpportunities } from "@/features/actions/hooks";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailList } from "@/components/brand/detail-list";
import { ApprovalCard } from "@/components/agent/approval-card";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { OwnerChip } from "@/components/brand/owner-chip";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";
import { OpportunityEditSheet } from "./opportunity-edit-sheet";

const columns: ActionColumn[] = ["approval", "working", "yours", "done"];

export function ActionsView() {
  const t = useTranslations("actions");
  const { brand } = useShell();
  const query = useActionPlan(brand?.id);
  const update = useUpdateOpportunities(brand?.id ?? 0);
  const analyze = useAnalyzeOpportunities(brand?.id ?? 0);
  // The list endpoint returns open opportunities only, so decisions also move cards locally for this session.
  const [moves, setMoves] = React.useState<Record<string, ActionColumn | "removed">>({});
  const [confirming, setConfirming] = React.useState(false);
  const [approvingAll, setApprovingAll] = React.useState(false);
  const [openId, setOpenId] = useQueryState("open", parseAsInteger);
  const [editId, setEditId] = useQueryState("edit", parseAsInteger);

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (!brand || !query.data) return <PageSkeleton kpis={0} panels={4} />;

  const cards = query.data.cards
    .map((c) => ({ ...c, column: moves[c.id] ?? c.column }))
    .filter((c): c is ActionCard => c.column !== "removed");
  const pending = cards.filter((c) => c.column === "approval");
  const STATUS_FOR: Record<ActionColumn | "removed", "open" | "in_progress" | "completed" | "ignored"> = {
    approval: "open",
    working: "in_progress",
    yours: "in_progress",
    done: "completed",
    removed: "ignored",
  };
  const move = (id: string, column: ActionColumn | "removed") => {
    setMoves((m) => ({ ...m, [id]: column }));
    update.mutate(
      { ids: [Number(id)], status: STATUS_FOR[column] },
      { onError: (error) => toast.error(getErrorMessage(error, t("updateFailed"))) },
    );
  };
  const runAnalysis = () =>
    analyze.mutate(undefined, {
      onSuccess: (result) => toast.success(t("analyzed", { count: result.opportunities_created })),
      onError: (error) => toast.error(getErrorMessage(error, t("analyzeFailed"))),
    });

  const current = query.data.current;
  const projected = Math.min(100, current + cards.filter((c) => c.column !== "done").reduce((s, c) => s + c.points, 0));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="secondary" loading={analyze.isPending} onClick={runAnalysis}>
              <ScanSearchIcon />
              {t("analyze")}
            </Button>
            {pending.length > 0 && (
              <Button variant="primary" loading={approvingAll} onClick={() => setConfirming(true)}>
                <CheckCheckIcon />
                {t("approveAll", { count: pending.length })}
              </Button>
            )}
          </>
        }
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={ListChecksIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button size="sm" variant="secondary" loading={analyze.isPending} onClick={runAnalysis}>
              {t("analyze")}
            </Button>
          }
        />
      ) : (
        <>
          <ProjectedStrip current={current} projected={projected} />
          <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {columns.map((col) => {
              const list = cards.filter((c) => c.column === col);
              return (
                <section
                  key={col}
                  aria-labelledby={`col-${col}`}
                  className="flex min-w-0 flex-col gap-3 rounded-lg bg-surface-2/60 p-3"
                >
                  <header className="flex items-center justify-between gap-2 px-1">
                    <h2 id={`col-${col}`} className="flex items-center gap-2 text-h3">
                      {t(`columns.${col}`)}
                      <span className="rounded-full bg-surface px-2 num text-caption text-fg-2">{list.length}</span>
                    </h2>
                  </header>
                  {list.length === 0 && (
                    <p className="px-1 py-6 text-center text-small text-fg-3">{t(`emptyColumn.${col}`)}</p>
                  )}
                  {list.map((card) => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      onMove={move}
                      onOpen={() => void setOpenId(Number(card.id))}
                      onEdit={() => void setEditId(Number(card.id))}
                    />
                  ))}
                </section>
              );
            })}
          </div>
        </>
      )}

      <OpportunitySheet siteId={brand.id} id={openId} onClose={() => void setOpenId(null)} />
      <OpportunityEditSheet siteId={brand.id} id={editId} onClose={() => void setEditId(null)} />

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle", { count: pending.length })}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-small text-fg">
            {pending.map((c) => (
              <li key={c.id}>{c.title}</li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setApprovingAll(true);
                try {
                  await update.mutateAsync({ ids: pending.map((c) => Number(c.id)), status: "in_progress" });
                  setMoves((m) => ({ ...m, ...Object.fromEntries(pending.map((c) => [c.id, "working" as const])) }));
                  toast.success(t("approvedAll", { count: pending.length }));
                } catch (error) {
                  toast.error(getErrorMessage(error, t("updateFailed")));
                } finally {
                  setApprovingAll(false);
                }
              }}
            >
              {t("approveAll", { count: pending.length })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectedStrip({ current, projected }: { current: number; projected: number }) {
  const t = useTranslations("actions");
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:gap-6">
      <p className="text-small text-fg-2 sm:w-72">
        {t.rich("projected", {
          current,
          projected,
          strong: (chunks) => <strong className="num font-semibold text-fg">{chunks}</strong>,
        })}
      </p>
      <div
        role="img"
        aria-label={t("projectedAria", { current, projected })}
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
      >
        <span className="absolute inset-y-0 start-0 rounded-full bg-success/30" style={{ width: `${projected}%` }} />
        <span className="absolute inset-y-0 start-0 rounded-full bg-chart-you" style={{ width: `${current}%` }} />
      </div>
      <span className="num text-small font-medium text-success">{t("gain", { points: projected - current })}</span>
    </div>
  );
}

function CardMeta({ card }: { card: ActionCard }) {
  const t = useTranslations("actions");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <OwnerChip owner={card.owner} />
      <Badge variant="outline">{t(`areas.${card.area}`)}</Badge>
      <Badge variant={card.impact === "high" ? "success" : "neutral"}>{t(`impact.${card.impact}`)}</Badge>
      <Badge variant="neutral">{t(`effort.${card.effort}`)}</Badge>
      {card.points > 0 && <span className="num text-caption text-fg-3">{t("points", { points: card.points })}</span>}
    </div>
  );
}

function DetailsButton({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("actions");
  return (
    <Button size="sm" variant="ghost" onClick={onOpen}>
      <PanelRightOpenIcon />
      {t("details")}
    </Button>
  );
}

function BoardCard({
  card,
  onMove,
  onOpen,
  onEdit,
}: {
  card: ActionCard;
  onMove: (id: string, column: ActionColumn | "removed") => void;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const t = useTranslations("actions");

  if (card.column === "approval") {
    return (
      <div className="flex flex-col gap-2">
        <ApprovalCard
          approval={{
            id: `apr_${card.id}`,
            title: card.title,
            status: "pending",
            items: card.items,
            channels: ["web", "telegram"],
          }}
          onEdit={onEdit}
          onDecided={(a) => onMove(card.id, a.status === "approved" ? "working" : "removed")}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <CardMeta card={card} />
          <DetailsButton onOpen={onOpen} />
        </div>
      </div>
    );
  }

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card",
        card.column === "done" && "opacity-80",
      )}
    >
      <h3
        className={cn("flex items-start gap-2 text-small font-medium text-fg", card.column === "done" && "text-fg-2")}
      >
        {card.column === "done" && <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />}
        {card.title}
      </h3>
      <CardMeta card={card} />
      {card.column === "working" && (
        <span className="flex items-center gap-1.5 text-caption text-fg-2">
          <Loader2Icon aria-hidden className="size-3.5 animate-spin" />
          {t("inProgress")}
        </span>
      )}
      {card.column === "yours" && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              onMove(card.id, "done");
              toast.success(t("markedDone"));
            }}
          >
            <CheckIcon />
            {t("markDone")}
          </Button>
          {card.href && (
            <Button asChild size="sm" variant="ghost">
              <Link href={card.href}>
                {t("open")}
                <ArrowRightIcon className="rtl:-scale-x-100" />
              </Link>
            </Button>
          )}
        </div>
      )}
      <div className="-mb-1 flex justify-end">
        <DetailsButton onOpen={onOpen} />
      </div>
    </article>
  );
}

/** One opportunity in full: why it matters, what to do, its scores and evidence. */
function OpportunitySheet({ siteId, id, onClose }: { siteId: number; id: number | null; onClose: () => void }) {
  const t = useTranslations("actions.detail");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const query = useQuery({
    queryKey: opportunityKeys.detail(siteId, id ?? 0),
    enabled: Boolean(id),
    queryFn: async () => (await opportunityService.get(siteId, id as number)).data,
  });
  const o = query.data;
  const evidence = o?.evidence ? Object.entries(o.evidence).filter(([, v]) => v !== null && typeof v !== "object") : [];
  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="end" className="gap-0 overflow-y-auto data-[side=end]:max-w-[520px]">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{o?.title ?? t("title")}</SheetTitle>
          <SheetDescription>{o?.type.replaceAll("_", " ")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-5">
          {query.isPending ? (
            <Skeleton className="h-48" />
          ) : query.isError ? (
            <ErrorState compact onRetry={() => query.refetch()} />
          ) : (
            o && (
              <>
                {o.description && <p className="text-small text-fg-2">{o.description}</p>}
                {o.recommended_action && (
                  <div className="rounded-lg bg-blue-bg p-3 text-small text-blue-ink">
                    <span className="font-semibold">{t("todo")}</span> {o.recommended_action}
                  </div>
                )}
                <DetailList
                  items={[
                    { label: t("status.label"), value: t(`status.${o.status}`) },
                    { label: t("priority"), value: o.priority },
                    { label: t("impact"), value: Math.round(toNumber(o.impact_score) ?? 0) },
                    { label: t("effort"), value: Math.round(toNumber(o.effort_score) ?? 0) },
                    { label: t("score"), value: Math.round(toNumber(o.opportunity_score) ?? 0) },
                    {
                      label: t("detected"),
                      value: o.detected_at ? format.relativeTime(new Date(o.detected_at), now) : null,
                    },
                  ]}
                />
                {evidence.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-small font-semibold text-fg">{t("evidence")}</h3>
                    <DetailList
                      items={evidence.map(([k, v]) => ({ label: k.replaceAll("_", " "), value: String(v) }))}
                    />
                  </section>
                )}
              </>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
