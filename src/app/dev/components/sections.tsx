"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  LineChartIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RadarIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { AgentMessage, Engine } from "@/lib/api/types";
import { engines } from "@/lib/api/types";
import { agentThread, brandSummary } from "@/lib/mocks/fixtures";
import { useUiStore } from "@/lib/store/ui";
import { cn } from "@/lib/utils";
import { AgentPanel } from "@/components/agent/agent-panel";
import { ApprovalCard } from "@/components/agent/approval-card";
import { DayDivider, Message } from "@/components/agent/message";
import { TaskRow } from "@/components/agent/task-row";
import { DeltaChip } from "@/components/brand/delta-chip";
import { EmptyState } from "@/components/brand/empty-state";
import { EngineChip } from "@/components/brand/engine-chip";
import { EngineName } from "@/components/brand/engine-icon";
import { KpiCard, KpiCardSkeleton } from "@/components/brand/kpi-card";
import { OrbitAvatar } from "@/components/brand/logo";
import { OwnerChip } from "@/components/brand/owner-chip";
import { RankCell } from "@/components/brand/rank-cell";
import { ScoreRing } from "@/components/brand/score-ring";
import { StatusBadge, statuses } from "@/components/brand/status-badge";
import { RankDistribution } from "@/components/charts/rank-distribution";
import { ShareOfVoice } from "@/components/charts/share-of-voice";
import { Sparkline } from "@/components/charts/sparkline";
import { VisibilityTrend } from "@/components/charts/visibility-trend";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { DomainInput, FormField, ReadOnlyField } from "@/components/forms/form-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ───────────────────────── layout helpers ───────────────────────── */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-32 flex-col gap-6">
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <h2 id={`${id}-title`} className="text-h2">
          {title}
        </h2>
        {description && <p className="max-w-[72ch] text-body text-fg-2">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Specimen({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <span className="text-caption text-fg-3">{label}</span>
      {children}
    </div>
  );
}

/* ───────────────────────── tokens ───────────────────────── */

const swatches = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["border", "bg-border"],
  ["border-strong", "bg-border-strong"],
  ["text", "bg-fg"],
  ["text-2", "bg-fg-2"],
  ["text-3", "bg-fg-3"],
  ["ink", "bg-ink"],
  ["signal", "bg-signal"],
  ["blue", "bg-blue"],
  ["success", "bg-success"],
  ["success-bg", "bg-success-bg"],
  ["warning", "bg-warning"],
  ["warning-bg", "bg-warning-bg"],
  ["danger", "bg-danger"],
  ["danger-bg", "bg-danger-bg"],
  ["chart-you", "bg-chart-you"],
  ["chart-a", "bg-chart-a"],
  ["chart-b", "bg-chart-b"],
  ["chart-c", "bg-chart-c"],
  ["chart-other", "bg-chart-other"],
] as const;

export function TokensSection() {
  const t = useTranslations("dev.tokens");
  return (
    <Section id="tokens" title={t("title")} description={t("description")}>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3">
        {swatches.map(([name, cls]) => (
          <li key={name} className="flex flex-col gap-2">
            <span className={cn("h-14 rounded-md border border-border", cls)} />
            <span dir="ltr" className="text-start font-mono text-[12px] text-fg-2">
              {name}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ───────────────────────── typography ───────────────────────── */

const typeScale = [
  ["display", "text-display", "44/48 · 600"],
  ["h1", "text-h1", "28/34 · 600"],
  ["h2", "text-h2", "20/28 · 600"],
  ["h3", "text-h3", "15/22 · 600"],
  ["bodyLg", "text-body-lg", "16/24 · 400"],
  ["body", "text-body", "14/20 · 400"],
  ["small", "text-small", "13/18 · 400"],
  ["caption", "text-caption", "12/16 · 500"],
  ["overline", "text-overline", "11/16 · 600"],
] as const;

const METRIC_CLASSES = "text-metric-xl / text-metric / text-mono";

export function TypographySection() {
  const t = useTranslations("dev.type");
  const format = useFormatter();
  return (
    <Section id="type" title={t("title")} description={t("description")}>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {typeScale.map(([key, cls, spec]) => (
          <div key={key} className="grid gap-2 px-5 py-4 md:grid-cols-[180px_1fr] md:items-baseline">
            <span dir="ltr" className="text-start font-mono text-[12px] text-fg-3">
              {cls} {spec}
            </span>
            <span className={cn(cls, "min-w-0 break-words")}>{t(`samples.${key}`)}</span>
          </div>
        ))}
        <div className="grid gap-2 px-5 py-4 md:grid-cols-[180px_1fr] md:items-baseline">
          <span dir="ltr" className="text-start font-mono text-[12px] text-fg-3">
            {METRIC_CLASSES}
          </span>
          <span className="flex flex-wrap items-baseline gap-6">
            <span className="text-metric-xl">{format.number(64, "integer")}</span>
            <span className="text-metric">{format.number(0.452, "percentPrecise")}</span>
            <span className="text-mono">{t("monoSample")}</span>
          </span>
        </div>
      </div>
    </Section>
  );
}

/* ───────────────────────── buttons ───────────────────────── */

const variants = ["primary", "secondary", "ghost", "agent", "destructive", "link"] as const;
const sizes = ["sm", "md", "lg"] as const;

export function ButtonsSection() {
  const t = useTranslations("dev.buttons");
  return (
    <Section id="buttons" title={t("title")} description={t("description")}>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-small">
          <thead>
            <tr className="text-overline text-fg-3">
              <th className="px-5 py-3 text-start font-semibold">{t("variant")}</th>
              {sizes.map((s) => (
                <th key={s} className="px-3 py-3 text-start font-semibold">
                  {t(`size.${s}`)}
                </th>
              ))}
              <th className="px-3 py-3 text-start font-semibold">{t("disabled")}</th>
              <th className="px-5 py-3 text-start font-semibold">{t("loading")}</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v} className="border-t border-border">
                <td className="px-5 py-3 font-mono text-[12px] text-fg-2">{v}</td>
                {sizes.map((s) => (
                  <td key={s} className="px-3 py-3">
                    <Button variant={v} size={s}>
                      {v === "agent" && <OrbitIconSmall />}
                      {t(`label.${v}`)}
                    </Button>
                  </td>
                ))}
                <td className="px-3 py-3">
                  <Button variant={v} disabled>
                    {t(`label.${v}`)}
                  </Button>
                </td>
                <td className="px-5 py-3">
                  <Button variant={v} loading>
                    {t(`label.${v}`)}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <Specimen label={t("iconButtons")}>
          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label={t("aria.settings")}>
              <SettingsIcon />
            </Button>
            <Button size="icon" variant="secondary" aria-label={t("aria.add")}>
              <PlusIcon />
            </Button>
            <Button size="icon" variant="primary" aria-label={t("aria.next")}>
              <ArrowRightIcon className="rtl:-scale-x-100" />
            </Button>
          </div>
        </Specimen>
        <Specimen label={t("withIcon")}>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">
              <RadarIcon aria-hidden />
              {t("runScan")}
            </Button>
            <Button variant="secondary">
              {t("continue")}
              <ArrowRightIcon aria-hidden className="rtl:-scale-x-100" />
            </Button>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

function OrbitIconSmall() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.6A8.5 8.5 0 1 1 20.5 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ───────────────────────── forms ───────────────────────── */

export function FormsSection() {
  const t = useTranslations("dev.forms");
  const [domain, setDomain] = React.useState("northwindroasters.com");
  const [name, setName] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  return (
    <Section id="forms" title={t("title")} description={t("description")}>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <FormField label={t("brandName")} helper={t("brandNameHelper")}>
          {(p) => <Input {...p} defaultValue="Northwind Roasters" />}
        </FormField>
        <FormField label={t("workspaceName")} error={touched && !name ? t("required") : undefined}>
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={t("workspacePlaceholder")}
            />
          )}
        </FormField>
        <ReadOnlyField
          label={t("email")}
          value="ada@northwindroasters.com"
          action={
            <Button variant="link" size="sm" className="text-caption">
              {t("changeEmail")}
            </Button>
          }
        />
        <FormField label={t("website")} helper={t("websiteHelper")}>
          {(p) => <DomainInput {...p} value={domain} onChange={setDomain} />}
        </FormField>
        <FormField label={t("websiteLarge")}>
          {(p) => (
            <DomainInput
              {...p}
              size="lg"
              value={domain}
              onChange={setDomain}
              status={<span className="text-success">{t("crawled", { pages: 148 })}</span>}
            />
          )}
        </FormField>
        <FormField label={t("market")}>
          {(p) => (
            <Select defaultValue="us">
              <SelectTrigger id={p.id} aria-describedby={p["aria-describedby"]}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">{t("markets.us")}</SelectItem>
                <SelectItem value="gb">{t("markets.gb")}</SelectItem>
                <SelectItem value="de">{t("markets.de")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label={t("voice")} helper={t("voiceHelper")} className="md:col-span-2">
          {(p) => <Textarea {...p} rows={3} defaultValue={t("voiceSample")} />}
        </FormField>
        <FormField label={t("disabledField")}>
          {(p) => <Input {...p} disabled defaultValue="12" className="num" />}
        </FormField>
      </div>
      <div className="flex flex-wrap gap-10">
        <Specimen label={t("checkboxes")}>
          <div className="flex flex-col gap-3">
            <Label className="font-normal">
              <Checkbox defaultChecked /> {t("notifyTelegram")}
            </Label>
            <Label className="font-normal">
              <Checkbox /> {t("notifyEmail")}
            </Label>
            <Label className="font-normal">
              <Checkbox checked="indeterminate" /> {t("someSelected")}
            </Label>
          </div>
        </Specimen>
        <Specimen label={t("switches")}>
          <div className="flex flex-col gap-3">
            <Label className="font-normal">
              <Switch defaultChecked /> {t("darkMode")}
            </Label>
            <Label className="font-normal">
              <Switch disabled /> {t("disabledSwitch")}
            </Label>
          </div>
        </Specimen>
        <Specimen label={t("radios")}>
          <RadioGroup defaultValue="ask" className="gap-3">
            {(["ask", "content", "full"] as const).map((v) => (
              <Label key={v} className="font-normal">
                <RadioGroupItem value={v} /> {t(`autopilot.${v}`)}
              </Label>
            ))}
          </RadioGroup>
        </Specimen>
        <Specimen label={t("tabs")}>
          <div className="flex flex-col gap-4">
            <Tabs defaultValue="30d">
              <TabsList variant="segmented" aria-label={t("range")}>
                <TabsTrigger value="7d">{t("ranges.7d")}</TabsTrigger>
                <TabsTrigger value="30d">{t("ranges.30d")}</TabsTrigger>
                <TabsTrigger value="90d">{t("ranges.90d")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs defaultValue="all" className="w-[min(420px,80vw)]">
              <TabsList aria-label={t("views")}>
                <TabsTrigger value="all">{t("viewTabs.all", { count: 62 })}</TabsTrigger>
                <TabsTrigger value="improved">{t("viewTabs.improved", { count: 21 })}</TabsTrigger>
                <TabsTrigger value="declined">{t("viewTabs.declined", { count: 7 })}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

/* ───────────────────────── data display ───────────────────────── */

export function DataDisplaySection() {
  const t = useTranslations("dev.display");
  const tk = useTranslations("kpi");
  const format = useFormatter();
  const [bump, setBump] = React.useState(0);
  const summary = brandSummary("br_northwind", "30d");
  const kpis = summary.kpis;

  return (
    <Section id="display" title={t("title")} description={t("description")}>
      <div className="flex flex-wrap gap-8">
        <Specimen label={t("scoreRings")}>
          <div className="flex flex-wrap items-center gap-6">
            <ScoreRing score={28} label={t("scoreLabel")} />
            <ScoreRing score={64} label={t("scoreLabel")} />
            <ScoreRing score={86} label={t("scoreLabel")} />
            <ScoreRing score={null} label={t("scoreLabel")} />
            <ScoreRing score={58} size="sm" label={t("scoreLabel")} />
          </div>
        </Specimen>
        <Specimen label={t("deltas")}>
          <div className="flex max-w-md flex-wrap gap-2">
            <DeltaChip value={12.3} unit="percent" />
            <DeltaChip value={-4.1} unit="percent" />
            <DeltaChip value={0} unit="percent" />
            <DeltaChip value={6.2} unit="points" />
            <DeltaChip value={4} unit="count" />
            <DeltaChip value={-5} unit="rank" />
            <DeltaChip value={3} unit="rank" />
            <DeltaChip value={-6} unit="count" invert />
            <DeltaChip value={-2.1} unit="points" variant="text" />
          </div>
        </Specimen>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <Specimen label={t("statuses")}>
          <div className="flex max-w-sm flex-wrap gap-2">
            {statuses.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </Specimen>
        <Specimen label={t("owners")}>
          <div className="flex gap-2">
            <OwnerChip owner="orbit" />
            <OwnerChip owner="you" />
          </div>
        </Specimen>
        <Specimen label={t("ranks")}>
          <div className="flex flex-col items-end gap-2">
            <RankCell position={3} change={-5} />
            <RankCell position={14} change={4} />
            <RankCell position={null} />
          </div>
        </Specimen>
        <Specimen label={t("engines")}>
          <div className="flex flex-col gap-2">
            {engines.map((e) => (
              <EngineName key={e} engine={e} className="text-small" />
            ))}
          </div>
        </Specimen>
      </div>

      <Specimen label={t("engineChips")}>
        <EngineChipsDemo />
      </Specimen>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption text-fg-3">{t("kpiCards")}</span>
          <Button size="sm" variant="secondary" onClick={() => setBump((b) => b + 1)}>
            {t("refreshData")}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => {
            const shift = bump % 2 === 1 ? [0.03, -0.3, 2, 4][i] : 0;
            const value = k.value + shift;
            return (
              <KpiCard
                key={k.key}
                label={tk(`${k.key}.label`)}
                value={value}
                format={(v) =>
                  k.key === "mentionRate"
                    ? format.number(v, "percent")
                    : k.key === "avgAiPosition"
                      ? tk("avgAiPosition.value", { value: format.number(v, "decimal") })
                      : format.number(v, "integer")
                }
                suffix={k.total ? tk("ofTotal", { total: k.total }) : undefined}
                delta={k.delta}
                spark={k.spark}
                note={tk(`${k.key}.note`, { mentioned: 113, answers: 250 })}
                href="#display"
              />
            );
          })}
          <KpiCardSkeleton />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EmptyState
          icon={RadarIcon}
          tone="agent"
          title={t("emptyTitle")}
          description={t("emptyDescription", { minutes: 3 })}
          action={<Button variant="secondary">{t("emptyAction")}</Button>}
        />
        <EmptyState
          icon={LineChartIcon}
          title={t("errorTitle")}
          description={t("errorDescription", { engine: "AI Overviews", time: "10:00" })}
          tone="danger"
          compact
        />
      </div>

      <Specimen label={t("skeletons")}>
        <Card className="max-w-md">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="size-[120px] rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        </Card>
      </Specimen>

      <Specimen label={t("progress")}>
        <div className="flex max-w-md flex-col gap-3">
          <Progress value={64} aria-label={t("progress")} />
          <Progress value={18} tone="warning" aria-label={t("progress")} />
          <Progress value={100} tone="success" aria-label={t("progress")} />
        </div>
      </Specimen>
    </Section>
  );
}

function EngineChipsDemo() {
  const [selected, setSelected] = React.useState<Engine | "all">("all");
  return (
    <div className="flex flex-wrap gap-2">
      {(["all", ...engines] as const).map((e) => (
        <EngineChip key={e} engine={e} pressed={selected === e} onPressedChange={() => setSelected(e)} />
      ))}
    </div>
  );
}

/* ───────────────────────── charts ───────────────────────── */

export function ChartsSection() {
  const t = useTranslations("dev.charts");
  const [range, setRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const summary = brandSummary("br_northwind", range);

  return (
    <Section id="charts" title={t("title")} description={t("description")}>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-0.5">
              <CardTitle>{t("trendTitle")}</CardTitle>
              <CardDescription>{t("trendDescription")}</CardDescription>
            </div>
            <CardAction>
              <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
                <TabsList variant="segmented" aria-label={t("range")}>
                  <TabsTrigger value="7d">{t("ranges.7d")}</TabsTrigger>
                  <TabsTrigger value="30d">{t("ranges.30d")}</TabsTrigger>
                  <TabsTrigger value="90d">{t("ranges.90d")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardAction>
          </CardHeader>
          <VisibilityTrend series={summary.trend} ariaLabel={t("trendAria")} domain={[20, 80]} />
        </Card>
        <Card>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{t("sovTitle")}</CardTitle>
            <CardDescription>{t("sovDescription")}</CardDescription>
          </div>
          <ShareOfVoice items={summary.shareOfVoice} />
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>{t("distributionTitle")}</CardTitle>
          <RankDistribution
            ariaLabel={t("distributionTitle")}
            bands={[
              { label: t("bands.top3"), count: 5, tone: "best" },
              { label: t("bands.top10"), count: 13, tone: "good" },
              { label: t("bands.top20"), count: 9, tone: "good" },
              { label: t("bands.top50"), count: 14, tone: "mid" },
              { label: t("bands.top100"), count: 8, tone: "mid" },
              { label: t("bands.none"), count: 13, tone: "none" },
            ]}
          />
        </Card>
        <Card>
          <CardTitle>{t("sparklines")}</CardTitle>
          <div className="grid grid-cols-3 gap-4">
            <Sparkline values={[20, 18, 19, 14, 11, 8, 5]} tone="success" />
            <Sparkline values={[6, 8, 7, 11, 14, 15, 18]} tone="danger" />
            <Sparkline values={[12, 13, 11, 12, 12, 11, 12]} tone="neutral" />
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ───────────────────────── agent ───────────────────────── */

export function AgentSection() {
  const t = useTranslations("dev.agent");
  const setOpen = useUiStore((s) => s.setAgentPanelOpen);
  const messages = agentThread.messages;
  const approvalMessage = messages.find((m) => m.approval);
  const failedTask: AgentMessage["task"] = {
    id: "tsk_failed",
    title: t("failedTask"),
    status: "failed",
    jobId: null,
    detail: null,
  };
  const waitingTask: AgentMessage["task"] = {
    id: "tsk_wait",
    title: t("waitingTask"),
    status: "waiting",
    jobId: null,
    detail: null,
  };

  return (
    <Section id="agent" title={t("title")} description={t("description")}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,760px)_1fr]">
        <Card className="gap-6 p-6">
          <DayDivider date={new Date(messages[0].createdAt)} note={t("sameAsTelegram")} />
          {messages.slice(0, 3).map((m) => (
            <Message key={m.id} message={m} />
          ))}
        </Card>
        <div className="flex flex-col gap-4">
          {approvalMessage?.approval && (
            <Specimen label={t("approvalCard")}>
              <ApprovalCard approval={approvalMessage.approval} onEdit={() => toast(t("editClicked"))} />
            </Specimen>
          )}
          <Specimen label={t("approvalDone")}>
            <ApprovalCard
              approval={{
                id: "apr_done",
                title: t("doneTitle"),
                status: "approved",
                items: [],
                channels: ["web", "telegram"],
              }}
            />
          </Specimen>
          <Specimen label={t("taskRows")}>
            <div className="flex flex-col gap-2">
              <TaskRow
                task={{
                  id: "tsk_live",
                  title: t("liveTask"),
                  status: "working",
                  jobId: "job_article_demo",
                  detail: null,
                }}
              />
              {waitingTask && <TaskRow task={waitingTask} />}
              {failedTask && <TaskRow task={failedTask} />}
              <TaskRow task={{ id: "tsk_done", title: t("doneTask"), status: "done", jobId: null, detail: null }} />
            </div>
          </Specimen>
          <Button variant="agent" className="self-start" onClick={() => setOpen(true)}>
            <OrbitAvatar size={20} className="bg-signal-ink text-signal" />
            {t("openPanel")}
            <kbd className="font-mono text-[11px] opacity-70">{t("shortcut")}</kbd>
          </Button>
        </div>
      </div>
      <AgentPanel workspaceId="ws_greek" agentHref="#agent" />
    </Section>
  );
}

/* ───────────────────────── table ───────────────────────── */

type KeywordRow = {
  keyword: string;
  position: number | null;
  change: number | null;
  volume: number;
  difficulty: number;
  url: string;
  status: "published" | "draft" | "failed";
};

export function TableSection() {
  const t = useTranslations("dev.table");
  const format = useFormatter();
  const [loading, setLoading] = React.useState(false);
  const [empty, setEmpty] = React.useState(false);

  const rows: KeywordRow[] = [
    {
      keyword: "single origin coffee subscription",
      position: 2,
      change: -3,
      volume: 2900,
      difficulty: 34,
      url: "/subscriptions",
      status: "published",
    },
    {
      keyword: "fresh roasted coffee beans",
      position: 4,
      change: -5,
      volume: 6600,
      difficulty: 41,
      url: "/shop/beans",
      status: "published",
    },
    {
      keyword: "best coffee subscription",
      position: 7,
      change: -2,
      volume: 14800,
      difficulty: 62,
      url: "/subscriptions",
      status: "draft",
    },
    {
      keyword: "how to brew pour over coffee",
      position: 14,
      change: 4,
      volume: 9900,
      difficulty: 48,
      url: "/guides/pour-over",
      status: "published",
    },
    {
      keyword: "low acid coffee",
      position: 38,
      change: 2,
      volume: 12100,
      difficulty: 45,
      url: "/blog/low-acid",
      status: "failed",
    },
    {
      keyword: "whole bean coffee online",
      position: null,
      change: null,
      volume: 4400,
      difficulty: 51,
      url: "—",
      status: "draft",
    },
  ];

  const columns = React.useMemo<DataColumn<KeywordRow>[]>(
    () => [
      {
        accessorKey: "keyword",
        header: t("cols.keyword"),
        meta: { label: t("cols.keyword"), pinned: true, className: "font-medium" },
      },
      {
        accessorKey: "position",
        header: t("cols.position"),
        meta: { label: t("cols.position"), numeric: true },
        sortUndefined: "last",
        cell: ({ row }) => <RankCell position={row.original.position} change={row.original.change} />,
      },
      {
        accessorKey: "volume",
        header: t("cols.volume"),
        meta: { label: t("cols.volume"), numeric: true },
        cell: ({ getValue }) => format.number(getValue() as number, "integer"),
      },
      { accessorKey: "difficulty", header: t("cols.difficulty"), meta: { label: t("cols.difficulty"), numeric: true } },
      {
        accessorKey: "url",
        header: t("cols.url"),
        meta: { label: t("cols.url") },
        cell: ({ getValue }) => (
          <span dir="ltr" className="font-mono text-[12px] text-fg-2">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("cols.status"),
        enableSorting: false,
        meta: { label: t("cols.status") },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [t, format],
  );

  return (
    <Section id="table" title={t("title")} description={t("description")}>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={loading ? "primary" : "secondary"} onClick={() => setLoading((v) => !v)}>
          {t("toggleLoading")}
        </Button>
        <Button size="sm" variant={empty ? "primary" : "secondary"} onClick={() => setEmpty((v) => !v)}>
          {t("toggleEmpty")}
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-surface shadow-card">
        <DataTable
          caption={t("caption")}
          data={empty ? [] : rows}
          columns={columns}
          loading={loading}
          csvFilename="keywords.csv"
          maxHeight={420}
          toolbar={<span className="text-h3">{t("caption")}</span>}
          empty={
            <EmptyState
              compact
              icon={SearchIcon}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <Button size="sm" variant="primary">
                  {t("emptyAction")}
                </Button>
              }
            />
          }
        />
      </div>
    </Section>
  );
}

/* ───────────────────────── overlays ───────────────────────── */

export function OverlaysSection() {
  const t = useTranslations("dev.overlays");
  const [commandOpen, setCommandOpen] = React.useState(false);
  return (
    <Section id="overlays" title={t("title")} description={t("description")}>
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">{t("dialog")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
              <DialogDescription>{t("dialogDescription")}</DialogDescription>
            </DialogHeader>
            <FormField label={t("workspaceName")}>
              {(p) => <Input {...p} autoFocus placeholder={t("workspacePlaceholder")} />}
            </FormField>
            <DialogFooter>
              <Button variant="secondary">{t("cancel")}</Button>
              <Button variant="primary">{t("create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="secondary">
              <Trash2Icon aria-hidden />
              {t("destructive")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("alertTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("alertDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction>{t("remove")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">{t("sheet")}</Button>
          </SheetTrigger>
          <SheetContent side="end">
            <SheetHeader>
              <SheetTitle>{t("sheetTitle")}</SheetTitle>
              <SheetDescription>{t("sheetDescription")}</SheetDescription>
            </SheetHeader>
            <div className="p-5 text-body text-fg-2">{t("sheetBody")}</div>
          </SheetContent>
        </Sheet>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">{t("popover")}</Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>{t("popoverTitle")}</PopoverTitle>
              <PopoverDescription>{t("popoverDescription")}</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary">{t("tooltip")}</Button>
          </TooltipTrigger>
          <TooltipContent>{t("tooltipBody")}</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              {t("menu")}
              <ChevronDownIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{t("menuLabel")}</DropdownMenuLabel>
            <DropdownMenuItem>
              <SettingsIcon />
              {t("menuSettings")}
              <DropdownMenuShortcut>{t("menuShortcut")}</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <MoreHorizontalIcon />
              {t("menuMore")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOutIcon />
              {t("menuSignOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="secondary"
          onClick={() => toast.success(t("toastBody"), { description: t("toastDescription") })}
        >
          {t("toast")}
        </Button>
        <Button variant="secondary" onClick={() => toast.error(t("toastError"))}>
          {t("toastErrorButton")}
        </Button>

        <Button variant="secondary" onClick={() => setCommandOpen(true)}>
          <SearchIcon aria-hidden />
          {t("command")}
        </Button>
        <CommandDialog
          open={commandOpen}
          onOpenChange={setCommandOpen}
          title={t("command")}
          description={t("commandDescription")}
        >
          <CommandInput placeholder={t("commandPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("commandEmpty")}</CommandEmpty>
            <CommandGroup heading={t("commandGroup")}>
              <CommandItem>
                <RadarIcon />
                {t("commandScan")}
              </CommandItem>
              <CommandItem>
                <SettingsIcon />
                {t("menuSettings")}
                <CommandShortcut>{t("menuShortcut")}</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </Section>
  );
}
