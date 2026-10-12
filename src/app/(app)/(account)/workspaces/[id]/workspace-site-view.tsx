"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ClockIcon,
  GlobeIcon,
  ListTreeIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { hasWhiteLabel } from "@/lib/subscription";
import { DEFAULT_BRAND_COLORS, DEFAULT_LOGIN_CAROUSEL, normalizeCarousel } from "@/config/brand";
import CustomDomainService, { type CustomDomainConfig } from "@/services/custom-domain";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { accountHref } from "@/features/account/routes";
import { accountKeys } from "@/features/account/query-keys";
import { useSessionUser } from "@/features/account/use-session-user";
import { ConfirmDialog } from "@/components/account/confirm-dialog";
import {
  ConfigureWhiteLabelDialog,
  type WhiteLabelFormValues,
} from "@/components/account/configure-white-label-dialog";
import { DnsRecordsDialog } from "@/components/account/dns-records-dialog";
import { WhiteLabelUpgradeDialog } from "@/components/account/white-label-upgrade-dialog";
import { EmptyState } from "@/components/brand/empty-state";
import { EntityAvatar } from "@/components/layout/avatars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DomainRecord = {
  id: number | string;
  workspace_id: number | string;
  domain: string;
  status?: string;
  verified?: boolean;
  configured?: boolean;
  ssl_status?: string;
  config?: Partial<CustomDomainConfig> | null;
  created_at?: string;
};

type LiveMessage = "live" | "routing" | "txt" | "waiting" | "network";
type LiveStatus = { verified: boolean; message: LiveMessage; error?: string };

/** How often unverified domains are re-checked while this page is open. */
const VERIFICATION_POLL_MS = 5000;

const SWATCHES = [
  { key: "primary_color", fallback: DEFAULT_BRAND_COLORS.primary_color },
  { key: "secondary_color", fallback: DEFAULT_BRAND_COLORS.secondary_color },
  { key: "button_color", fallback: DEFAULT_BRAND_COLORS.button_color },
  { key: "background_color", fallback: DEFAULT_BRAND_COLORS.background_color },
] as const;

/**
 * Reads ?dns=<domain id> in a Suspense-isolated child. Set when a reseller
 * arrives right after saving a new domain, so the records they still have to
 * add are the first thing they see.
 */
function DnsParamReader({ onChange }: { onChange: (domainId: string | null) => void }) {
  const searchParams = useSearchParams();
  const dnsParam = searchParams.get("dns");
  React.useEffect(() => {
    onChange(dnsParam);
  }, [dnsParam, onChange]);
  return null;
}

/** The workspace's White Label domains: status, DNS, verification polling, edit and delete. */
export function WorkspaceSiteView({ id }: { id: string }) {
  const t = useTranslations("account.site");
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSessionUser();
  const { workspaces, hasLoaded, fetchWorkspaces } = useWorkspaceStore();
  const workspace = workspaces.find((w) => String(w.id) === id);

  React.useEffect(() => {
    if (!hasLoaded) void fetchWorkspaces();
  }, [fetchWorkspaces, hasLoaded]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState(false);
  const [isDnsModalOpen, setIsDnsModalOpen] = React.useState(false);
  const [selectedDomain, setSelectedDomain] = React.useState<DomainRecord | null>(null);
  const [dnsDomain, setDnsDomain] = React.useState<DomainRecord | null>(null);
  const [verifyingId, setVerifyingId] = React.useState<number | string | null>(null);
  const [liveStatus, setLiveStatus] = React.useState<Record<string, LiveStatus>>({});
  const [domainToDelete, setDomainToDelete] = React.useState<DomainRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [pendingDnsId, setPendingDnsId] = React.useState<string | null>(null);

  const hasResellerSeats = hasWhiteLabel(session?.subscriptions);

  const domainsQuery = useQuery({
    queryKey: [...accountKeys.domains(), id],
    enabled: Boolean(workspace),
    queryFn: async (): Promise<DomainRecord[]> => {
      try {
        const res = await CustomDomainService.getUserDomains();
        if (res.success && Array.isArray(res.data)) {
          return res.data.filter((d: DomainRecord) => String(d.workspace_id) === id || d.workspace_id === Number(id));
        }
      } catch (err) {
        console.error("Failed to load workspace domain config", err);
      }
      return [];
    },
  });
  const domainConfig = React.useMemo(() => domainsQuery.data ?? [], [domainsQuery.data]);
  const isLoadingDomain = !domainsQuery.isFetched;

  const setDomainConfig = React.useCallback(
    (update: (prev: DomainRecord[]) => DomainRecord[]) =>
      queryClient.setQueryData<DomainRecord[]>([...accountKeys.domains(), id], (prev) => update(prev ?? [])),
    [queryClient, id],
  );

  const loadDomains = React.useCallback(async () => {
    const result = await domainsQuery.refetch();
    return result.data ?? [];
  }, [domainsQuery]);

  // Read by the poll so it always sees the latest records without the
  // interval re-subscribing every time a status message changes.
  const pendingDomainsRef = React.useRef<DomainRecord[]>([]);
  React.useEffect(() => {
    pendingDomainsRef.current = domainConfig.filter((d) => d.status !== "active");
  }, [domainConfig]);

  /** Opens the DNS records for a domain id, once it is in the list. */
  const openDnsForId = React.useCallback((domainId: number | string, source: DomainRecord[]) => {
    const match = source.find((d) => String(d.id) === String(domainId));
    if (!match) return;
    setDnsDomain(match);
    setIsDnsModalOpen(true);
  }, []);

  // The param is consumed once and stripped, so a refresh doesn't reopen the
  // dialog the reseller just dismissed.
  const [stripDnsParam, setStripDnsParam] = React.useState(false);
  if (pendingDnsId && !isLoadingDomain) {
    setPendingDnsId(null);
    setStripDnsParam(true);
    const match = domainConfig.find((d) => String(d.id) === String(pendingDnsId));
    if (match) {
      setDnsDomain(match);
      setIsDnsModalOpen(true);
    }
  }
  React.useEffect(() => {
    if (stripDnsParam) router.replace(accountHref.workspace(id), { scroll: false });
  }, [stripDnsParam, router, id]);

  const handleDnsParam = React.useCallback((value: string | null) => {
    setPendingDnsId(value);
    if (!value) setStripDnsParam(false);
  }, []);

  const handleEditConfig = (domainData: DomainRecord) => {
    if (!hasResellerSeats) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setSelectedDomain(domainData);
    setIsModalOpen(true);
  };

  const handleAddNewDomain = () => {
    if (!hasResellerSeats) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setSelectedDomain(null);
    setIsModalOpen(true);
  };

  /**
   * Asks Vercel whether ownership (TXT) and routing (CNAME/A) are both in
   * place and folds the answer into the card's live status. Shared by the
   * manual button and the background poll. Writes back to the backend only
   * when the check disagrees with the record, so the poll never PATCHes
   * every five seconds.
   */
  const runVerificationCheck = React.useCallback(
    async (domainData: DomainRecord) => {
      try {
        const [ownershipRes, configRes] = await Promise.all([
          fetch(`/api/custom-domains/${domainData.domain}`),
          fetch(`/api/custom-domains/${domainData.domain}/config`),
        ]);

        const ownership = await ownershipRes.json();

        if (!ownershipRes.ok || !ownership.success) {
          setLiveStatus((prev) => ({
            ...prev,
            [domainData.id]: { verified: false, message: "network", error: ownership?.error } satisfies LiveStatus,
          }));
          return;
        }

        const config = await configRes.json();

        const verified = Boolean(ownership.vercel?.verified);
        const pendingRecords = ownership.vercel?.verification?.length ?? 0;
        const configured = config?.ok && config.vercel ? !config.vercel.misconfigured : Boolean(domainData.configured);

        const isLive = verified && configured;

        setLiveStatus((prev) => ({
          ...prev,
          [domainData.id]: {
            verified: isLive,
            message: isLive ? "live" : verified ? "routing" : pendingRecords > 0 ? "txt" : "waiting",
          } satisfies LiveStatus,
        }));

        const alreadyMatches =
          Boolean(domainData.verified) === verified && Boolean(domainData.configured) === configured;

        if (alreadyMatches) return;

        const updated = await CustomDomainService.updateVerification(
          domainData.id,
          isLive
            ? { verified: true, configured: true, status: "active", ssl_status: "active", error: null }
            : {
                verified,
                configured,
                status: "pending",
                ssl_status: "pending",
                error: "DNS record has not propagated yet.",
              },
        ).catch(() => null);

        // `status` in the response is the backend's own confirmation and the
        // only thing the card should trust.
        if (updated?.data) {
          setDomainConfig((prev) => prev.map((d) => (d.id === domainData.id ? { ...d, ...updated.data } : d)));
        }
      } catch {
        setLiveStatus((prev) => ({
          ...prev,
          [domainData.id]: { verified: false, message: "network" } satisfies LiveStatus,
        }));
      }
    },
    [setDomainConfig],
  );

  const handleCheckVerification = async (domainData: DomainRecord) => {
    setVerifyingId(domainData.id);
    try {
      await runVerificationCheck(domainData);
    } finally {
      setVerifyingId(null);
    }
  };

  // Domains still waiting on DNS are re-checked in the background so the
  // badge flips on its own. The interval stops once none are left.
  const pendingDomainKey = domainConfig
    .filter((d) => d.status !== "active")
    .map((d) => d.id)
    .join(",");

  React.useEffect(() => {
    if (!pendingDomainKey) return;

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      // A slow provider must not stack up requests every 5 s.
      if (inFlight) return;
      inFlight = true;
      try {
        for (const domain of pendingDomainsRef.current) {
          if (cancelled) return;
          await runVerificationCheck(domain);
        }
      } finally {
        inFlight = false;
      }
    };

    const interval = setInterval(tick, VERIFICATION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pendingDomainKey, runVerificationCheck]);

  /**
   * Detach from Vercel first, then delete the record, so a failure at either
   * step leaves the domain listed and retryable instead of orphaning a host.
   */
  const handleDeleteDomain = async () => {
    if (!domainToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/custom-domains/${domainToDelete.domain}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || t("toasts.vercelRemoveFailed"));
        return;
      }

      await CustomDomainService.deleteDomain(domainToDelete.id);

      setDomainConfig((prev) => prev.filter((d) => d.id !== domainToDelete.id));
      setLiveStatus((prev) => {
        const next = { ...prev };
        delete next[domainToDelete.id];
        return next;
      });

      toast.success(t("toasts.removed", { domain: domainToDelete.domain }));
      setDomainToDelete(null);
    } catch {
      toast.error(t("toasts.removeFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  /** After a save, land straight on the DNS records for the domain just configured. */
  const handleWhiteLabelSubmit = async (values: WhiteLabelFormValues) => {
    const domains = await loadDomains();
    if (values.id) openDnsForId(values.id, domains);
  };

  const initialValues = React.useMemo<Partial<WhiteLabelFormValues> | null>(() => {
    if (!selectedDomain || !workspace) return null;
    const config = selectedDomain.config;
    return {
      id: selectedDomain.id || null,
      customDomain: selectedDomain.domain || "",
      brandName: config?.brand_name || workspace.name,
      primaryColor: config?.primary_color || DEFAULT_BRAND_COLORS.primary_color,
      secondaryColor: config?.secondary_color || DEFAULT_BRAND_COLORS.secondary_color,
      backgroundColor: config?.background_color || DEFAULT_BRAND_COLORS.background_color,
      textColor: config?.text_color || DEFAULT_BRAND_COLORS.text_color,
      buttonColor: config?.button_color || DEFAULT_BRAND_COLORS.button_color,
      buttonTextColor: config?.button_text_color || DEFAULT_BRAND_COLORS.button_text_color,
      supportEmail: config?.support_email || "",
      replyToEmail: config?.reply_to_email || "",
      logoUrl: config?.logo_url || "",
      logoIconUrl: config?.logo_icon_url || "",
      faviconUrl: config?.favicon_url || "",
      loginCarousel: normalizeCarousel(config?.login_carousel) ?? DEFAULT_LOGIN_CAROUSEL,
      defaultTheme: config?.default_theme || "user",
    };
  }, [selectedDomain, workspace]);

  if (!hasLoaded) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Skeleton className="h-80" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <EmptyState
        icon={GlobeIcon}
        title={t("notFoundTitle")}
        description={t("notFoundBody")}
        action={
          <Button asChild variant="primary">
            <Link href={accountHref.settings("workspaces")}>{t("backToWorkspaces")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <React.Suspense fallback={null}>
        <DnsParamReader onChange={handleDnsParam} />
      </React.Suspense>

      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={accountHref.settings("workspaces")} aria-label={t("backToWorkspaces")}>
            <ChevronLeftIcon className="rtl:-scale-x-100" />
          </Link>
        </Button>
        <EntityAvatar name={workspace.name} size={40} />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-h1 text-fg">{workspace.name}</h1>
          <p className="text-body text-fg-2">{t("subtitle")}</p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-0.5">
              <CardTitle>{t("domainsTitle")}</CardTitle>
              <CardDescription>{t("domainsBody")}</CardDescription>
            </div>
            <CardAction>
              <Button variant="primary" size="sm" onClick={handleAddNewDomain}>
                <PlusIcon />
                {t("addDomain")}
              </Button>
            </CardAction>
          </CardHeader>

          {isLoadingDomain ? (
            <div className="flex flex-col gap-3" aria-busy>
              <Skeleton className="h-44" />
            </div>
          ) : domainConfig.length === 0 ? (
            <EmptyState
              compact
              icon={GlobeIcon}
              title={t("emptyTitle")}
              description={t("emptyBody")}
              action={
                <Button variant="primary" size="sm" onClick={handleAddNewDomain}>
                  <PlusIcon />
                  {t("addCustomDomain")}
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {domainConfig.map((domain) => {
                const status = liveStatus[domain.id];
                const isVerifying = verifyingId === domain.id;
                // The record's own `status` confirms ownership AND routing;
                // Vercel's `verified` covers ownership only.
                const isLive = domain.status === "active";
                const awaitingSync = Boolean(domain.verified) && !isLive;
                const sslLabel = domain.ssl_status === "active" ? t("ssl.active") : t("ssl.pending");

                return (
                  <li key={domain.id} className="overflow-hidden rounded-md border border-border">
                    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                      {/* A verified domain resolves, so its name becomes the way in. */}
                      {isLive ? (
                        <a
                          href={`https://${domain.domain}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="group flex min-w-0 items-center gap-3 rounded-md"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-bg text-blue-ink">
                            <GlobeIcon aria-hidden className="size-4" />
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span
                              dir="ltr"
                              className="flex items-center gap-1 truncate font-mono text-[14px] font-medium text-fg underline decoration-border-strong underline-offset-4 group-hover:text-blue group-hover:decoration-blue"
                            >
                              {domain.domain}
                              <ArrowUpRightIcon aria-hidden className="size-3.5 shrink-0" />
                            </span>
                            <span className="text-caption font-normal text-fg-3">{sslLabel}</span>
                          </span>
                        </a>
                      ) : (
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-3">
                            <GlobeIcon aria-hidden className="size-4" />
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span dir="ltr" className="truncate font-mono text-[14px] font-medium text-fg">
                              {domain.domain}
                            </span>
                            <span className="text-caption font-normal text-fg-3">{sslLabel}</span>
                          </div>
                        </div>
                      )}

                      {isLive ? (
                        <Badge variant="success" shape="pill">
                          <ShieldCheckIcon />
                          {t("status.verified")}
                        </Badge>
                      ) : awaitingSync ? (
                        <Badge variant="blue" shape="pill">
                          <ClockIcon />
                          {t("status.syncing")}
                        </Badge>
                      ) : (
                        <Badge variant="warning" shape="pill">
                          <ClockIcon />
                          {t("status.pending")}
                        </Badge>
                      )}
                    </div>

                    {status && (
                      <div className="px-4 pb-4">
                        <p
                          role="status"
                          className={cn(
                            "flex items-start gap-2 rounded-md px-3 py-2 text-small",
                            status.verified ? "bg-success-bg text-success" : "bg-warning-bg text-warning",
                          )}
                        >
                          {status.verified ? (
                            <CheckCircle2Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                          ) : (
                            <ClockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                          )}
                          <span className="text-fg">{status.error || t(`live.${status.message}`)}</span>
                        </p>
                      </div>
                    )}

                    <dl className="flex flex-wrap gap-x-6 gap-y-3 border-t border-border px-4 py-3">
                      {SWATCHES.map(({ key, fallback }) => {
                        const raw = domain.config?.[key];
                        const value = typeof raw === "string" && raw ? raw : fallback;
                        return (
                          <div key={key} className="flex min-w-[96px] flex-col gap-1">
                            <dt className="text-overline text-fg-2">{t(`swatches.${key}`)}</dt>
                            <dd className="flex items-center gap-2 text-small text-fg">
                              <span
                                aria-hidden
                                className="size-3.5 shrink-0 rounded-full border border-border-strong"
                                style={{ backgroundColor: value }}
                              />
                              <span dir="ltr" className="num uppercase">
                                {value}
                              </span>
                            </dd>
                          </div>
                        );
                      })}
                      <div className="flex min-w-[96px] flex-col gap-1">
                        <dt className="text-overline text-fg-2">{t("carouselSlides")}</dt>
                        <dd className="num text-small text-fg">
                          {normalizeCarousel(domain.config?.login_carousel)?.length ?? DEFAULT_LOGIN_CAROUSEL.length}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-bg px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" disabled={isVerifying} onClick={() => void handleCheckVerification(domain)}>
                          <RefreshCwIcon className={cn(isVerifying && "animate-spin")} />
                          {isVerifying ? t("checking") : t("checkVerification")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setDnsDomain(domain);
                            setIsDnsModalOpen(true);
                          }}
                        >
                          <ListTreeIcon />
                          {t("dnsRecords")}
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("editAria", { domain: domain.domain })}
                          onClick={() => handleEditConfig(domain)}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("removeAria", { domain: domain.domain })}
                          className="text-danger hover:bg-danger-bg hover:text-danger"
                          onClick={() => setDomainToDelete(domain)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("info.title")}</CardTitle>
          </CardHeader>
          <dl className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-fg-3">{t("info.id")}</dt>
              <dd className="num text-small font-medium text-fg">{workspace.id}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-fg-3">{t("info.status")}</dt>
              <dd className="text-small font-medium text-fg">
                {workspace.active ? t("info.active") : t("info.inactive")}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-fg-3">{t("info.members")}</dt>
              <dd className="text-small font-medium text-fg">{t("info.membersValue", { count: workspace.members })}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-fg-3">{t("info.domains")}</dt>
              <dd className="num text-small font-medium text-fg">{domainConfig.length}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <WhiteLabelUpgradeDialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen} />
      <DnsRecordsDialog open={isDnsModalOpen} domainData={dnsDomain} onOpenChange={setIsDnsModalOpen} />
      <ConfirmDialog
        open={Boolean(domainToDelete)}
        onOpenChange={(open) => {
          if (!open) setDomainToDelete(null);
        }}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.body", { domain: domainToDelete?.domain ?? "" })}
        confirmLabel={t("deleteDialog.confirm")}
        isPending={isDeleting}
        onConfirm={handleDeleteDomain}
      >
        <p className="rounded-md bg-warning-bg px-3.5 py-3 text-small text-fg-2">{t("deleteDialog.warning")}</p>
      </ConfirmDialog>
      <ConfigureWhiteLabelDialog
        open={isModalOpen}
        workspace={workspace}
        initialValues={initialValues}
        onOpenChange={setIsModalOpen}
        onSubmit={handleWhiteLabelSubmit}
      />
    </div>
  );
}
