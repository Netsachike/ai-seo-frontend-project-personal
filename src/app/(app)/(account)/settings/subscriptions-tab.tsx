"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCardIcon, PackageIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { getActivePlan, PLAN_META } from "@/lib/plan";
import { getNextBillingDate, isValidAddon, type ValidAddonKey } from "@/lib/subscription";
import SubscriptionService from "@/services/subscriptions";
import type { SubscriptionDataNew } from "@/types/shared";
import { accountHref } from "@/features/account/routes";
import { useSessionUser } from "@/features/account/use-session-user";
import { ConfirmDialog } from "@/components/account/confirm-dialog";
import { EmptyState } from "@/components/brand/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PendingCancel = { id: string | number; name: string; subscription: SubscriptionDataNew };

const validDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * The active plan (built from the session's subscriptions) with its renewal
 * date and a cancel-renewal flow, plus the account's add-ons. Cancelling is
 * reflected optimistically for this session.
 */
export function SubscriptionsTab() {
  const t = useTranslations("account.subscriptions");
  const tPlan = useTranslations("account.plans");
  const tBilling = useTranslations("account.billingTypes");
  const tAddon = useTranslations("account.addons");
  const format = useFormatter();
  const session = useSessionUser();

  const formatBillingDate = (date: Date) => format.dateTime(date, { dateStyle: "long" });

  // The active plan (single subscription), cancellable when not lifetime.
  const activePlans = React.useMemo(() => {
    const subs = session?.subscriptions;
    if (!subs || typeof subs !== "object") return [];
    const plan = getActivePlan(subs);
    if (plan !== "free" && subs.subscription) {
      return [
        {
          id: subs.subscription.id ?? "plan",
          plan,
          name: tPlan(`${plan}.label`),
          type: subs.subscription.type || "subscription",
          subscription: subs.subscription,
        },
      ];
    }
    return [];
  }, [session?.subscriptions, tPlan]);

  // Active add-ons. These are never cancellable here.
  const additionalPackages = React.useMemo(() => {
    const addons = session?.subscriptions?.addons;
    const entries: Array<{ id: string; key: ValidAddonKey; type: string }> = [];
    if (addons && !Array.isArray(addons)) {
      for (const [key, value] of Object.entries(addons)) {
        // Only real add-ons; legacy package flags are skipped.
        if (!isValidAddon(key)) continue;
        if (value && typeof value === "object" && "status" in value) {
          const addon = value as { status?: boolean; type?: string };
          if (addon.status) entries.push({ id: `addon-${key}`, key, type: addon.type || "add-on" });
        }
      }
    }
    return entries;
  }, [session?.subscriptions]);

  const [subscriptionToCancel, setSubscriptionToCancel] = React.useState<PendingCancel | null>(null);
  const [isCancellingSubscription, setIsCancellingSubscription] = React.useState(false);
  // Ids cancelled this session, so the UI reflects it optimistically.
  const [cancelledSubscriptionIds, setCancelledSubscriptionIds] = React.useState<Set<string | number>>(new Set());

  async function handleConfirmCancelSubscription() {
    if (!subscriptionToCancel) return;

    setIsCancellingSubscription(true);
    try {
      await SubscriptionService.cancelSubscription(subscriptionToCancel.id);
      setCancelledSubscriptionIds((prev) => new Set(prev).add(subscriptionToCancel.id));
      toast.success(t("cancelled"));
      setSubscriptionToCancel(null);
    } catch (error) {
      toast.error(getErrorMessage(error, t("cancelFailed")));
    } finally {
      setIsCancellingSubscription(false);
    }
  }

  const cancelNextBillingDate = subscriptionToCancel ? getNextBillingDate(subscriptionToCancel.subscription) : null;
  const billingLabel = (type: string) =>
    tBilling.has(type as "monthly") ? tBilling(type as "monthly") : type.replace(/[_-]+/g, " ");

  if (session === undefined) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
      </CardHeader>

      <Tabs defaultValue="active-plans" className="gap-5">
        <TabsList variant="segmented">
          <TabsTrigger value="active-plans">{t("activeTab", { count: activePlans.length })}</TabsTrigger>
          <TabsTrigger value="additional-packages">{t("addonsTab", { count: additionalPackages.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="active-plans">
          {activePlans.length === 0 ? (
            <EmptyState
              compact
              icon={CreditCardIcon}
              title={t("noPlanTitle")}
              description={t("noPlanBody")}
              action={
                <Button asChild variant="agent" size="sm">
                  <Link href={accountHref.upgrade()}>{t("viewPlans")}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-4 xl:grid-cols-2">
              {activePlans.map((plan) => {
                // Cancelled per backend (is_cancelled 1 or true) or this session (optimistic).
                const isCancelled = Boolean(plan.subscription.is_cancelled) || cancelledSubscriptionIds.has(plan.id);
                const isLifetime = plan.type === "lifetime";
                const renewalDate = getNextBillingDate(plan.subscription);
                const endDate = validDate(plan.subscription.end_date);
                const PlanIcon = PLAN_META[plan.plan].icon;

                return (
                  <li key={plan.id} className="flex flex-col gap-4 rounded-md border border-border p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span aria-hidden className="grid size-10 place-items-center rounded-md bg-blue-bg text-blue-ink">
                          <PlanIcon className="size-[18px]" />
                        </span>
                        <div className="flex flex-col">
                          <h3 className="text-h3 text-fg">{plan.name}</h3>
                          <p className="text-caption font-normal text-fg-3">{billingLabel(plan.type)}</p>
                        </div>
                      </div>
                      <Badge variant={isCancelled ? "warning" : "success"} shape="pill">
                        {isCancelled ? t("renewalCancelled") : t("active")}
                      </Badge>
                    </div>

                    <dl className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1 rounded-md bg-bg p-3">
                        <dt className="text-overline text-fg-2">{t("status")}</dt>
                        <dd className="text-small font-semibold text-fg">
                          {isCancelled ? t("cancelsAtPeriodEnd") : t("active")}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1 rounded-md bg-bg p-3">
                        <dt className="text-overline text-fg-2">
                          {isLifetime ? t("type") : isCancelled ? t("expires") : t("renews")}
                        </dt>
                        <dd className="text-small font-semibold text-fg">
                          {isLifetime
                            ? tBilling("lifetime")
                            : isCancelled
                              ? endDate
                                ? formatBillingDate(endDate)
                                : billingLabel(plan.type)
                              : renewalDate
                                ? formatBillingDate(renewalDate)
                                : billingLabel(plan.type)}
                        </dd>
                      </div>
                    </dl>

                    {/* Cancelled: nudge to reset the billing cycle. */}
                    {isCancelled && !isLifetime && (
                      <p className="text-small text-fg-2">
                        {t.rich("expireNotice", {
                          hasDate: endDate ? "yes" : "no",
                          date: endDate ? formatBillingDate(endDate) : "",
                          pay: (chunks) => (
                            <Link href={accountHref.upgrade()} className="font-medium text-blue hover:underline">
                              {chunks}
                            </Link>
                          ),
                        })}
                      </p>
                    )}

                    {/* Cancel renewal: non-lifetime plans only. */}
                    {!isLifetime && !isCancelled && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() =>
                            setSubscriptionToCancel({ id: plan.id, name: plan.name, subscription: plan.subscription })
                          }
                        >
                          {t("cancelPlan")}
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="additional-packages">
          {additionalPackages.length === 0 ? (
            <EmptyState
              compact
              icon={PackageIcon}
              title={t("noAddonsTitle")}
              description={t("noAddonsBody")}
              action={
                <Button asChild size="sm">
                  <Link href={accountHref.upgrade("whitelabel")}>{t("browseAddons")}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-4 xl:grid-cols-2">
              {additionalPackages.map((pkg) => (
                <li key={pkg.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-5">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-h3 text-fg">{tAddon(`${pkg.key}.name`)}</h3>
                    <p className="text-small text-fg-2">{tAddon(`${pkg.key}.description`)}</p>
                    <p className="text-caption font-normal text-fg-3">{billingLabel(pkg.type)}</p>
                  </div>
                  <Badge variant="success" shape="pill">
                    {t("active")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={subscriptionToCancel !== null}
        onOpenChange={(open) => {
          if (!open) setSubscriptionToCancel(null);
        }}
        title={t("cancelDialog.title", { plan: subscriptionToCancel?.name ?? "" })}
        description={t("cancelDialog.body", {
          plan: subscriptionToCancel?.name ?? "",
          hasDate: cancelNextBillingDate ? "yes" : "no",
          date: cancelNextBillingDate ? formatBillingDate(cancelNextBillingDate) : "",
        })}
        cancelLabel={t("cancelDialog.keep")}
        confirmLabel={t("cancelPlan")}
        isPending={isCancellingSubscription}
        onConfirm={handleConfirmCancelSubscription}
      >
        <p className="text-small text-fg-3">
          {t.rich("cancelDialog.switch", {
            upgrade: (chunks) => (
              <Link href={accountHref.upgrade()} className="font-medium text-blue hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </ConfirmDialog>
    </Card>
  );
}
