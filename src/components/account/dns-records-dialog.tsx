"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, ClockIcon, CopyIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import CustomDomainService from "@/services/custom-domain";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** The subset of the backend's domain record this dialog needs. */
type DnsDomainRecord = { id: number | string; domain: string };

/** A pending ownership challenge, as Vercel returns it. */
type VercelVerification = { type: string; domain: string; value: string };

/** Vercel's recommended routing targets; IPv4 entries carry a list of values. */
type RecommendedRecord<T> = { rank: number; value: T };

type DnsRecordRow = { type: string; name: string; content: string };

type ConfigRecords = { misconfigured: boolean; cnames: string[]; aValues: string[] };

/**
 * Asks Vercel for the ownership (TXT) and routing (CNAME / A) state, then
 * writes the result back to the backend record.
 */
async function fetchRecords(domainData: DnsDomainRecord) {
  let verificationStatus: "idle" | "unverified" | "verified" = "idle";
  let verificationRecords: VercelVerification[] = [];
  let configRecords: ConfigRecords | null = null;

  // 1. TXT verification
  const resTxt = await fetch(`/api/custom-domains/${domainData.domain}`);
  const txtData = await resTxt.json();

  let isVerified = false;
  if (txtData.success && txtData.vercel) {
    if (!txtData.vercel.verified) {
      verificationRecords = txtData.vercel.verification || [];
      verificationStatus = "unverified";
    } else {
      isVerified = true;
      verificationStatus = "verified";
    }
  }

  // 2. Routing config (CNAME / A)
  let isConfigured = false;
  const resConfig = await fetch(`/api/custom-domains/${domainData.domain}/config`);
  const configData = await resConfig.json();

  if (configData.ok && configData.vercel) {
    configRecords = {
      misconfigured: configData.vercel.misconfigured,
      cnames: configData.vercel.recommendedCNAME?.map((record: RecommendedRecord<string>) => record.value) || [],
      aValues:
        configData.vercel.recommendedIPv4?.map((record: RecommendedRecord<string[]>) => record.value).flat() || [],
    };
    isConfigured = !configData.vercel.misconfigured;
  }

  // 3. Patch backend state
  if (isVerified && isConfigured) {
    await CustomDomainService.updateVerification(domainData.id, {
      verified: true,
      configured: true,
      status: "active",
      ssl_status: "active",
      error: null,
    });
  } else {
    await CustomDomainService.updateVerification(domainData.id, {
      verified: isVerified,
      configured: isConfigured,
      status: "pending",
      ssl_status: "pending",
      error: "DNS record has not propagated yet.",
    });
  }

  return { verificationStatus, verificationRecords, configRecords };
}

/**
 * The TXT (ownership) and CNAME/A (routing) records a reseller adds at their
 * DNS provider, laid out like Cloudflare's own DNS table. Every fetch writes
 * the result back to the backend record.
 */
export function DnsRecordsDialog({
  open,
  domainData,
  onOpenChange,
}: {
  open: boolean;
  domainData: DnsDomainRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("account.site.dns");
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  // Fresh records every time the dialog opens; Refresh refetches.
  const records = useQuery({
    queryKey: ["account", "dns-records", domainData?.id, domainData?.domain],
    enabled: open && Boolean(domainData?.domain),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: () => fetchRecords(domainData as DnsDomainRecord),
  });

  React.useEffect(() => {
    if (records.isError) toast.error(t("fetchFailed"));
  }, [records.isError, t]);

  const isLoading = records.isFetching;
  const verificationStatus = records.data?.verificationStatus ?? "idle";
  const verificationRecords = records.data?.verificationRecords ?? [];
  const configRecords = records.data?.configRecords ?? null;

  const routingRows: DnsRecordRow[] = React.useMemo(() => {
    if (!configRecords) return [];
    if (configRecords.cnames.length > 0) {
      return [{ type: "CNAME", name: domainData?.domain ?? "", content: configRecords.cnames[0] }];
    }
    if (configRecords.aValues.length > 0) {
      return [{ type: "A", name: domainData?.domain ?? "", content: configRecords.aValues[0] }];
    }
    return [];
  }, [configRecords, domainData?.domain]);

  const valueCell = (value: string) => (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-sm bg-surface-2 px-2 py-1">
      <span dir="ltr" className="truncate font-mono text-[12px] text-fg">
        {value}
      </span>
      <button
        type="button"
        onClick={() => void copyToClipboard(value)}
        aria-label={t("copyAria", { value })}
        className="grid size-6 shrink-0 place-items-center rounded-sm text-fg-3 hover:bg-surface hover:text-fg"
      >
        {copiedText === value ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
      </button>
    </div>
  );

  const recordTable = (rows: DnsRecordRow[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-small">
        <thead>
          <tr className="text-start text-overline text-fg-2">
            <th className="pe-3 pb-2 text-start font-semibold">{t("columns.type")}</th>
            <th className="pe-3 pb-2 text-start font-semibold">{t("columns.name")}</th>
            <th className="pe-3 pb-2 text-start font-semibold">{t("columns.content")}</th>
            <th className="pe-3 pb-2 text-start font-semibold">{t("columns.proxy")}</th>
            <th className="pb-2 text-start font-semibold">{t("columns.ttl")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.type}-${row.name}-${row.content}`} className="align-middle">
              <td className="w-24 py-1.5 pe-3">{valueCell(row.type)}</td>
              <td className="max-w-[180px] py-1.5 pe-3">{valueCell(row.name)}</td>
              <td className="max-w-[220px] py-1.5 pe-3">{valueCell(row.content)}</td>
              <td className="py-1.5 pe-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-caption whitespace-nowrap text-fg-2">
                  <span aria-hidden className="size-1.5 rounded-full bg-fg-3" />
                  {t("dnsOnly")}
                </span>
              </td>
              <td className="py-1.5 whitespace-nowrap text-fg-3">{t("auto")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const notice = (
    <p className="flex items-start gap-2 text-caption font-normal text-fg-2">
      <ClockIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {t("propagation")}
    </p>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle", { domain: domainData?.domain ?? "" })}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-small text-fg-2">
            {t.rich("intro", { strong: (chunks) => <strong className="font-semibold text-fg">{chunks}</strong> })}
          </p>
          <Button size="sm" className="shrink-0" disabled={isLoading} onClick={() => void records.refetch()}>
            <RefreshCwIcon className={cn(isLoading && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>

        {isLoading && verificationStatus === "idle" ? (
          <div className="grid h-32 place-items-center" aria-busy>
            <Loader2Icon aria-hidden className="size-6 animate-spin text-blue" />
            <span className="sr-only">{t("loading")}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {verificationStatus === "unverified" && verificationRecords.length > 0 && (
              <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-h3 text-warning">{t("verifyTitle")}</h3>
                  <p className="text-small text-fg-2">{t("verifyBody")}</p>
                </div>
                {recordTable(
                  verificationRecords.map((record) => ({
                    type: record.type,
                    name: record.domain,
                    content: record.value,
                  })),
                )}
                {notice}
              </section>
            )}

            {configRecords && configRecords.misconfigured && (
              <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-h3 text-blue">
                    {verificationStatus === "verified" ? t("routingTitleStep") : t("routingTitle")}
                  </h3>
                  <p className="text-small text-fg-2">{t("routingBody")}</p>
                </div>
                {routingRows.length > 0 ? (
                  <>
                    {recordTable(routingRows)}
                    {notice}
                  </>
                ) : (
                  <p className="text-small text-fg-3">{t("noRouting")}</p>
                )}
              </section>
            )}

            {verificationStatus === "verified" && configRecords && !configRecords.misconfigured && (
              <div className="flex flex-col items-center gap-2 rounded-lg bg-success-bg p-8 text-center">
                <span aria-hidden className="grid size-11 place-items-center rounded-full bg-success text-ink-fg">
                  <CheckIcon className="size-5" />
                </span>
                <h3 className="text-h3 text-success">{t("doneTitle")}</h3>
                <p className="text-small text-fg-2">{t("doneBody")}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
