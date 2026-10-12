"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CheckCheckIcon, CheckIcon, ListChecksIcon, ScanSearchIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
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
import { Progress } from "@/components/ui/progress";
import { ApprovalCard } from "@/components/agent/approval-card";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { OwnerChip } from "@/components/brand/owner-chip";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

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
                    <BoardCard key={card.id} card={card} onMove={move} />
                  ))}
                </section>
              );
            })}
          </div>
        </>
      )}

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

function BoardCard({
  card,
  onMove,
}: {
  card: ActionCard;
  onMove: (id: string, column: ActionColumn | "removed") => void;
}) {
  const t = useTranslations("actions");
  const format = useFormatter();
  const router = useRouter();

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
          onEdit={card.href ? () => router.push(card.href as string) : undefined}
          onDecided={(a) => onMove(card.id, a.status === "approved" ? "working" : "removed")}
        />
        <div className="px-1">
          <CardMeta card={card} />
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
        <div className="flex flex-col gap-1.5">
          <Progress value={(card.progress ?? 0.05) * 100} tone="ink" aria-label={card.title} />
          <span className="num text-caption text-fg-3">
            {t("progress", { percent: format.number(card.progress ?? 0.05, "percent") })}
          </span>
        </div>
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
    </article>
  );
}
