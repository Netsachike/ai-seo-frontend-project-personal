"use client";

import * as React from "react";
import { CheckIcon, FilePenLineIcon, ListPlusIcon, MailIcon, PlusIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import { fakeRequest } from "@/lib/auth/session";
import { useFakeQuery } from "@/lib/fake-query";
import { DOMAIN_PATTERN } from "@/features/onboarding/data";
import { competitorsData, type CompetitorRow } from "@/lib/mocks/ui-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { OwnerChip } from "@/components/brand/owner-chip";
import { colorize } from "@/components/charts/series-colors";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

export function CompetitorsView() {
  const t = useTranslations("competitors");
  const { brand } = useShell();
  const [adding, setAdding] = React.useState(false);
  const query = useFakeQuery(["competitors", brand?.id], () => competitorsData(brand?.id ?? ""), {
    enabled: Boolean(brand),
  });

  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={4} />;
  const data = query.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={
          data && data.rows.length > 0 ? t("insight", { leader: data.leader, lead: data.lead }) : t("descriptionEmpty")
        }
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <PlusIcon />
            {t("add")}
          </Button>
        }
      />
      <AddCompetitorDialog open={adding} onOpenChange={setAdding} />

      {query.isError && <ErrorState onRetry={() => query.refetch()} />}
      {data && data.rows.length === 0 && (
        <EmptyState icon={UsersIcon} title={t("emptyTitle")} description={t("emptyDescription")} />
      )}
      {data && data.rows.length > 0 && (
        <>
          <ComparisonTable rows={data.rows} />
          <div className="grid gap-4 xl:grid-cols-2">
            <QuestionGaps gaps={data.questionGaps} />
            <KeywordGaps gaps={data.keywordGaps} />
          </div>
          <LinkSites sites={data.sites} />
        </>
      )}
    </div>
  );
}

function ComparisonTable({ rows }: { rows: CompetitorRow[] }) {
  const t = useTranslations("competitors.table");
  const tKpi = useTranslations("kpi");
  const format = useFormatter();
  const colored = colorize(rows);
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <caption className="sr-only">{t("caption")}</caption>
          <TableHeader>
            <TableRow>
              <TableHead>{t("brand")}</TableHead>
              <TableHead className="text-end">{t("score")}</TableHead>
              <TableHead className="text-end">{t("share")}</TableHead>
              <TableHead className="text-end">{t("position")}</TableHead>
              <TableHead className="text-end">{t("citations")}</TableHead>
              <TableHead className="text-end">{t("top10")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colored.map((r) => (
              <TableRow key={r.id} className={cn(r.isYou && "bg-blue-bg/50 hover:bg-blue-bg/60")}>
                <TableCell>
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                    <span className="flex min-w-0 flex-col">
                      <span className={cn("text-small text-fg", r.isYou ? "font-semibold" : "font-medium")}>
                        {r.isYou ? t("you", { name: r.name }) : r.name}
                      </span>
                      <span dir="ltr" className="text-start font-mono text-[12px] text-fg-3">
                        {r.domain}
                      </span>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-end num">{format.number(r.score, "integer")}</TableCell>
                <TableCell className="text-end num">{format.number(r.share, "percent")}</TableCell>
                <TableCell className="text-end num">
                  {tKpi("avgAiPosition.value", { value: format.number(r.avgPosition, "decimal") })}
                </TableCell>
                <TableCell className="text-end num">{r.citations}</TableCell>
                <TableCell className="text-end num">{r.top10}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function QuestionGaps({ gaps }: { gaps: ReturnType<typeof competitorsData>["questionGaps"] }) {
  const t = useTranslations("competitors.questionGaps");
  const format = useFormatter();
  const [drafting, setDrafting] = React.useState<Record<string, "busy" | "done">>({});
  const draft = async (id: string) => {
    setDrafting((s) => ({ ...s, [id]: "busy" }));
    await fakeRequest(1200);
    setDrafting((s) => ({ ...s, [id]: "done" }));
    toast.success(t("drafted"));
  };
  return (
    <Card>
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {gaps.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
              <q className="text-small font-medium text-fg">{g.question}</q>
              <span className="text-caption font-normal text-fg-3">
                {format.list(
                  g.winners.map((w) => t("winner", { name: w.name, engines: w.engines })),
                  { type: "conjunction" },
                )}
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              loading={drafting[g.id] === "busy"}
              disabled={drafting[g.id] === "done"}
              onClick={() => draft(g.id)}
            >
              {drafting[g.id] === "done" ? <CheckIcon /> : <FilePenLineIcon />}
              {drafting[g.id] === "done" ? t("draftReady") : t("write")}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function KeywordGaps({ gaps }: { gaps: ReturnType<typeof competitorsData>["keywordGaps"] }) {
  const t = useTranslations("competitors.keywordGaps");
  const format = useFormatter();
  const [added, setAdded] = React.useState<string[]>([]);
  return (
    <Card>
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {gaps.map((g) => {
          const on = added.includes(g.id);
          return (
            <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
                <span className="text-small font-medium text-fg">{g.keyword}</span>
                <span className="text-caption font-normal text-fg-3">
                  {t("who", { name: g.competitor, position: g.position })}
                </span>
              </div>
              <span className="num text-small text-fg-2">
                {t("volume", { volume: format.number(g.volume, "integer") })}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={on}
                onClick={() => {
                  setAdded((a) => [...a, g.id]);
                  toast.success(t("added", { keyword: g.keyword }));
                }}
              >
                {on ? <CheckIcon /> : <ListPlusIcon />}
                {on ? t("inPlan") : t("addToPlan")}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function LinkSites({ sites }: { sites: ReturnType<typeof competitorsData>["sites"] }) {
  const t = useTranslations("competitors.sites");
  const [state, setState] = React.useState<"idle" | "busy" | "done">("idle");
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t("title")}</CardTitle>
            <OwnerChip owner="you" />
          </div>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <CardAction>
          <Button
            variant="agent"
            size="sm"
            loading={state === "busy"}
            disabled={state === "done"}
            onClick={async () => {
              setState("busy");
              await fakeRequest(1500);
              setState("done");
              toast.success(t("drafted", { count: sites.length }));
            }}
          >
            {state === "done" ? <CheckIcon /> : <MailIcon />}
            {state === "done" ? t("draftedShort") : t("draftAll")}
          </Button>
        </CardAction>
      </CardHeader>
      <ul className="grid gap-3 md:grid-cols-2">
        {sites.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-[13px] font-medium text-fg">
                {s.domain}
              </span>
              <Badge variant="neutral">{t(`kinds.${s.kind}`)}</Badge>
            </div>
            <p className="text-small text-fg-2">{s.why}</p>
            <span className="num text-caption text-fg-3">{t("authority", { score: s.authority })}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AddCompetitorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("competitors.addDialog");
  const tCommon = useTranslations("common");
  const [domain, setDomain] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!DOMAIN_PATTERN.test(domain)) return setError(t("invalid"));
            setSaving(true);
            await fakeRequest();
            setSaving(false);
            onOpenChange(false);
            setDomain("");
            toast.success(t("added", { domain }));
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <FormField label={t("label")} error={error} helper={t("helper")}>
            {(props) => (
              <DomainInput
                {...props}
                autoFocus
                value={domain}
                onChange={(v) => {
                  setDomain(v);
                  setError(undefined);
                }}
                placeholder={t("placeholder")}
              />
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
