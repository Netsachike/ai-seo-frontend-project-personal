"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, PlayIcon, XIcon } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { JsonObject, McpToolName, SchemaGeneratorPayload, SchemaType } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import freeToolsService from "@/services/free-tools";
import mcpService from "@/services/mcp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DetailList } from "@/components/brand/detail-list";
import { ErrorState } from "@/components/brand/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { useShell } from "@/components/layout/shell-context";

const tools = ["meta", "redirects", "broken", "robots", "clustering", "schema", "agent"] as const;
type Tool = (typeof tools)[number];

/**
 * SEO tools: quick one-off checks on any URL (meta tags, redirects, broken
 * links, robots.txt), keyword clustering and schema markup, plus the agent
 * (MCP) tools that run against this site.
 */
export function ToolsView() {
  const t = useTranslations("tools");
  const { brand } = useShell();
  const [tool, setTool] = useQueryState("tool", parseAsStringLiteral(tools).withDefault("meta"));
  const siteUrl = brand?.url ?? (brand ? `https://${brand.domain}` : "");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs value={tool} onValueChange={(v) => void setTool(v as Tool)}>
        <TabsList aria-label={t("label")} className="flex-wrap">
          {tools.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {tool === "meta" && <MetaTagsTool defaultUrl={siteUrl} />}
      {tool === "redirects" && <RedirectTool defaultUrl={siteUrl} />}
      {tool === "broken" && <BrokenLinksTool defaultUrl={siteUrl} />}
      {tool === "robots" && <RobotsTool defaultUrl={siteUrl} />}
      {tool === "clustering" && <ClusteringTool />}
      {tool === "schema" && <SchemaTool defaultUrl={siteUrl} siteName={brand?.name ?? ""} />}
      {tool === "agent" && brand && <AgentTools siteId={brand.id} />}
    </div>
  );
}

/** Title, explanation, a URL field and Run, then the result. */
function UrlToolCard({
  tool,
  defaultUrl,
  run,
  pending,
  children,
}: {
  tool: Exclude<Tool, "clustering" | "schema" | "agent">;
  defaultUrl: string;
  run: (url: string) => void;
  pending: boolean;
  children?: React.ReactNode;
}) {
  const t = useTranslations("tools");
  const [url, setUrl] = React.useState(defaultUrl);
  const id = React.useId();
  return (
    <Card className="gap-5">
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t(`${tool}.title`)}</CardTitle>
        <CardDescription>{t(`${tool}.body`)}</CardDescription>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) run(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
        }}
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={id}>{t("url")}</Label>
          <Input id={id} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("urlPlaceholder")} />
        </div>
        <Button type="submit" variant="primary" loading={pending} disabled={!url.trim()}>
          <PlayIcon />
          {t("run")}
        </Button>
      </form>
      {children}
    </Card>
  );
}

const Check = ({ ok, label }: { ok: boolean; label: string }) => (
  <li className="flex items-center gap-2 text-small">
    {ok ? <CheckIcon className="size-4 text-success" /> : <XIcon className="size-4 text-danger" />}
    <span className={ok ? "text-fg" : "text-fg-2"}>{label}</span>
  </li>
);

function ResultMessage({ message }: { message?: string }) {
  return message ? <p className="rounded-lg bg-warning-bg p-3 text-small text-warning">{message}</p> : null;
}

function MetaTagsTool({ defaultUrl }: { defaultUrl: string }) {
  const t = useTranslations("tools.meta");
  const m = useMutation({ mutationFn: async (url: string) => (await freeToolsService.metaTags({ url })).data });
  const r = m.data;
  return (
    <UrlToolCard
      tool="meta"
      defaultUrl={defaultUrl}
      run={(url) => m.mutate(url, { onError: (e) => toast.error(getErrorMessage(e, t("failed"))) })}
      pending={m.isPending}
    >
      {r && (
        <div className="flex flex-col gap-5">
          <ResultMessage message={r.message} />
          <DetailList
            items={[
              { label: t("status"), value: `${r.status_code} ${r.status_text}` },
              {
                label: t("titleTag"),
                value: r.title.value ? t("withLength", { value: r.title.value, count: r.title.length }) : t("missing"),
              },
              {
                label: t("descriptionTag"),
                value: r.description.value
                  ? t("withLength", { value: r.description.value, count: r.description.length })
                  : t("missing"),
              },
              { label: t("canonical"), value: r.canonical.value ?? t("missing"), mono: Boolean(r.canonical.value) },
              { label: t("robots"), value: r.robots.value ?? t("robotsDefault") },
              { label: t("h1"), value: r.headings.h1s.length ? r.headings.h1s.join(" · ") : t("missing") },
              { label: t("lang"), value: r.html.lang },
            ]}
          />
          {Object.keys(r.checks).length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {Object.entries(r.checks).map(([key, ok]) => (
                <Check key={key} ok={ok} label={key.replaceAll("_", " ")} />
              ))}
            </ul>
          )}
          {Object.keys(r.open_graph).length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-small font-semibold text-fg">{t("openGraph")}</h3>
              <DetailList items={Object.entries(r.open_graph).map(([k, v]) => ({ label: k, value: v }))} />
            </div>
          )}
        </div>
      )}
    </UrlToolCard>
  );
}

function RedirectTool({ defaultUrl }: { defaultUrl: string }) {
  const t = useTranslations("tools.redirects");
  const format = useFormatter();
  const m = useMutation({ mutationFn: async (url: string) => (await freeToolsService.redirectChecker({ url })).data });
  const r = m.data;
  return (
    <UrlToolCard
      tool="redirects"
      defaultUrl={defaultUrl}
      run={(url) => m.mutate(url, { onError: (e) => toast.error(getErrorMessage(e, t("failed"))) })}
      pending={m.isPending}
    >
      {r && (
        <div className="flex flex-col gap-4">
          <ResultMessage message={r.message} />
          <p className="text-small text-fg">
            {r.redirected
              ? t("summary", { count: r.redirect_count, url: r.final_url })
              : t("noRedirect", { status: r.status_code ?? 0 })}
          </p>
          {(r.redirect_loop || r.too_many_redirects) && (
            <Badge variant="danger">{r.redirect_loop ? t("loop") : t("tooMany")}</Badge>
          )}
          <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {r.chain.map((hop, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 px-3 py-2 text-small">
                <Badge variant={hop.status_code >= 400 ? "danger" : hop.redirect ? "warning" : "success"}>
                  {hop.status_code}
                </Badge>
                <span className="min-w-0 flex-1 break-all text-fg">{hop.url}</span>
                <span className="num text-caption text-fg-3">{t("ms", { value: format.number(hop.duration_ms) })}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </UrlToolCard>
  );
}

function BrokenLinksTool({ defaultUrl }: { defaultUrl: string }) {
  const t = useTranslations("tools.broken");
  const m = useMutation({
    mutationFn: async (url: string) => (await freeToolsService.brokenLinks({ url, limit: 100 })).data,
  });
  const r = m.data;
  const broken = r?.links.filter((l) => l.broken) ?? [];
  return (
    <UrlToolCard
      tool="broken"
      defaultUrl={defaultUrl}
      run={(url) => m.mutate(url, { onError: (e) => toast.error(getErrorMessage(e, t("failed"))) })}
      pending={m.isPending}
    >
      {r && (
        <div className="flex flex-col gap-4">
          <ResultMessage message={r.message} />
          <p className="num text-small text-fg">
            {t("summary", {
              found: r.links_found,
              broken: r.broken_links,
              internal: r.internal_links,
              external: r.external_links,
            })}
          </p>
          {broken.length === 0 ? (
            <p className="text-small text-success">{t("none")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {broken.map((link) => (
                <li key={link.url} className="flex flex-col gap-0.5 px-3 py-2 text-small">
                  <span className="flex items-center gap-2">
                    <Badge variant="danger">{link.status_code ?? t("error")}</Badge>
                    <span className="min-w-0 break-all text-fg">{link.url}</span>
                  </span>
                  <span className="text-caption font-normal text-fg-3">
                    {t("anchor", { text: link.anchor_text || "—" })} · {link.internal ? t("internal") : t("external")}
                    {link.error ? ` · ${link.error}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </UrlToolCard>
  );
}

function RobotsTool({ defaultUrl }: { defaultUrl: string }) {
  const t = useTranslations("tools.robots");
  const m = useMutation({ mutationFn: async (url: string) => (await freeToolsService.robotsTxt({ url })).data });
  const r = m.data;
  return (
    <UrlToolCard
      tool="robots"
      defaultUrl={defaultUrl}
      run={(url) => m.mutate(url, { onError: (e) => toast.error(getErrorMessage(e, t("failed"))) })}
      pending={m.isPending}
    >
      {r && (
        <div className="flex flex-col gap-4">
          <ResultMessage message={r.message} />
          <DetailList
            items={[
              { label: t("found"), value: r.exists ? t("yes") : t("no") },
              { label: t("status"), value: r.status_code },
              {
                label: t("sitemaps"),
                value: r.sitemaps.length ? r.sitemaps.join("\n") : t("none"),
                mono: r.sitemaps.length > 0,
              },
              { label: t("groups"), value: r.rules.length },
            ]}
          />
          {r.content && (
            <pre className="max-h-80 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-caption whitespace-pre-wrap text-fg">
              {r.content}
            </pre>
          )}
        </div>
      )}
    </UrlToolCard>
  );
}

function ClusteringTool() {
  const t = useTranslations("tools.clustering");
  const [text, setText] = React.useState("");
  const keywords = text
    .split(/[\n,]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  const m = useMutation({
    mutationFn: async (list: string[]) => (await freeToolsService.keywordClustering({ keywords: list })).data,
  });
  const r = m.data;
  const id = React.useId();
  return (
    <Card className="gap-5">
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{t("keywords")}</Label>
        <Textarea
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          className="min-h-40"
        />
        <span className="num text-caption font-normal text-fg-3">{t("count", { count: keywords.length })}</span>
      </div>
      <Button
        variant="primary"
        className="self-start"
        loading={m.isPending}
        disabled={keywords.length < 2}
        onClick={() => m.mutate(keywords, { onError: (e) => toast.error(getErrorMessage(e, t("failed"))) })}
      >
        <PlayIcon />
        {t("run")}
      </Button>
      {r && (
        <div className="flex flex-col gap-3">
          <p className="num text-small text-fg">
            {t("summary", { clusters: r.clusters_found, unclustered: r.unclustered_keywords })}
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {r.clusters.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <span className="flex items-center justify-between gap-2 text-small font-medium text-fg">
                  {c.name}
                  <Badge variant="neutral">{c.keyword_count}</Badge>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {c.keywords.map((k) => (
                    <Badge key={k} variant="outline">
                      {k}
                    </Badge>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

const SCHEMA_TYPES: SchemaType[] = ["organization", "local_business", "service", "product", "article", "faq"];

function SchemaTool({ defaultUrl, siteName }: { defaultUrl: string; siteName: string }) {
  const t = useTranslations("tools.schema");
  const [type, setType] = React.useState<SchemaType>("organization");
  const [name, setName] = React.useState(siteName);
  const [description, setDescription] = React.useState("");
  const [url, setUrl] = React.useState(defaultUrl);
  const [faq, setFaq] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const ids = React.useId();
  const m = useMutation({
    mutationFn: async (payload: SchemaGeneratorPayload) => (await freeToolsService.schemaGenerator(payload)).data,
  });

  const submit = () => {
    const questions = faq
      .split("\n")
      .map((line) => line.split("|").map((s) => s.trim()))
      .filter(([q, a]) => q && a)
      .map(([question, answer]) => ({ question, answer }));
    const data: SchemaGeneratorPayload["data"] =
      type === "article"
        ? { headline: name, description, url }
        : type === "faq"
          ? { questions }
          : { name, description, url };
    m.mutate({ type, data }, { onError: (e) => toast.error(getErrorMessage(e, t("failed"))) });
  };

  const copy = async () => {
    if (!m.data) return;
    await navigator.clipboard.writeText(`<script type="application/ld+json">\n${m.data.json_ld}\n</script>`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="gap-5">
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-type`}>{t("type")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as SchemaType)}>
            <SelectTrigger id={`${ids}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEMA_TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`types.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {type !== "faq" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-name`}>{type === "article" ? t("headline") : t("name")}</Label>
              <Input id={`${ids}-name`} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-url`}>{t("url")}</Label>
              <Input id={`${ids}-url`} value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor={`${ids}-description`}>{t("descriptionField")}</Label>
              <Textarea
                id={`${ids}-description`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </>
        )}
        {type === "faq" && (
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor={`${ids}-faq`}>{t("questions")}</Label>
            <Textarea
              id={`${ids}-faq`}
              value={faq}
              onChange={(e) => setFaq(e.target.value)}
              placeholder={t("questionsPlaceholder")}
              className="min-h-32"
            />
          </div>
        )}
      </div>
      <Button variant="primary" className="self-start" onClick={submit} loading={m.isPending}>
        <PlayIcon />
        {t("run")}
      </Button>
      {m.data && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-small font-semibold text-fg">{t("output")}</h3>
            <Button size="sm" variant="secondary" onClick={() => void copy()}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <pre className="max-h-96 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-caption text-fg">
            {m.data.json_ld}
          </pre>
        </div>
      )}
    </Card>
  );
}

/** The MCP tools the agent uses, runnable by hand against this site. */
function AgentTools({ siteId }: { siteId: number }) {
  const t = useTranslations("tools.agent");
  const list = useQuery({ queryKey: ["mcp", "tools"], queryFn: mcpService.tools, staleTime: Infinity });
  const [name, setName] = React.useState<McpToolName | null>(null);
  const [args, setArgs] = React.useState("{}");
  const [argsError, setArgsError] = React.useState<string | null>(null);
  const call = useMutation({
    mutationFn: (payload: { tool: McpToolName; arguments: JsonObject }) => mcpService.call(siteId, payload),
  });
  const ids = React.useId();
  const tool = list.data?.tools.find((x) => x.name === name) ?? list.data?.tools[0];
  const properties = (tool?.inputSchema?.properties ?? {}) as Record<string, { type?: string; description?: string }>;
  const required = (tool?.inputSchema?.required ?? []) as string[];

  const run = () => {
    if (!tool) return;
    let parsed: JsonObject;
    try {
      parsed = args.trim() ? (JSON.parse(args) as JsonObject) : {};
    } catch {
      return setArgsError(t("badJson"));
    }
    setArgsError(null);
    call.mutate(
      { tool: tool.name, arguments: parsed },
      { onError: (e) => toast.error(getErrorMessage(e, t("failed"))) },
    );
  };

  if (list.isPending) return <Skeleton className="h-64" />;
  if (list.isError) return <ErrorState onRetry={() => list.refetch()} />;
  return (
    <Card className="gap-5">
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${ids}-tool`}>{t("tool")}</Label>
        <Select
          value={tool?.name}
          onValueChange={(v) => {
            setName(v as McpToolName);
            setArgs("{}");
            call.reset();
          }}
        >
          <SelectTrigger id={`${ids}-tool`} className="sm:w-96">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {list.data.tools.map((x) => (
              <SelectItem key={x.name} value={x.name}>
                {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tool && <p className="text-small text-fg-2">{tool.description}</p>}
      </div>
      {Object.keys(properties).length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-small font-semibold text-fg">{t("arguments")}</h3>
          <ul className="flex flex-col gap-1.5">
            {Object.entries(properties).map(([key, p]) => (
              <li key={key} className="text-small">
                <code className="font-mono text-caption text-fg">{key}</code>
                {p.type && <span className="ms-2 text-caption text-fg-3">{p.type}</span>}
                {required.includes(key) && (
                  <Badge variant="warning" className="ms-2">
                    {t("required")}
                  </Badge>
                )}
                {p.description && <span className="block text-caption font-normal text-fg-3">{p.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${ids}-args`}>{t("json")}</Label>
        <Textarea
          id={`${ids}-args`}
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          className={cn("min-h-28 font-mono text-caption", argsError && "border-danger")}
        />
        {argsError && <p className="text-small text-danger">{argsError}</p>}
      </div>
      <Button variant="primary" className="self-start" onClick={run} loading={call.isPending} disabled={!tool}>
        <PlayIcon />
        {t("run")}
      </Button>
      {call.data && (
        <pre className="max-h-[32rem] overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-caption text-fg">
          {JSON.stringify(call.data.result, null, 2)}
        </pre>
      )}
    </Card>
  );
}
