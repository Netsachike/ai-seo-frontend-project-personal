"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckIcon, FolderDownIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { getActivePlan, type PlanName } from "@/lib/plan";
import { getNextBillingDate } from "@/lib/subscription";
import { getPlanPriceId, type BillingPeriod } from "@/lib/paddle-config";
import { PLAN_PRICES, WHITE_LABEL_TIERS, type WhiteLabelTier } from "@/config/pricing";
import SubscriptionService from "@/services/subscriptions";
import { PaddleContext } from "@/providers/paddle-provider";
import { accountHref } from "@/features/account/routes";
import { useSessionUser } from "@/features/account/use-session-user";
import { useWhiteLabelAccess } from "@/features/account/use-white-label-access";
import { ConfirmDialog } from "@/components/account/confirm-dialog";
import { WhiteLabelUpgradeDialog } from "@/components/account/white-label-upgrade-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type en from "@/messages/en.json";

type PaidPlan = Exclude<PlanName, "free">;
type FeatureKey = keyof (typeof en)["account"]["upgrade"]["features"];
type CardKey = PaidPlan | WhiteLabelTier;

type PlanCard = {
  key: CardKey;
  /** Subscription plan key; White Label licences are one-time and have none. */
  planKey: PlanName | WhiteLabelTier;
  features: { key: FeatureKey; included: boolean }[];
  variant: "primary" | "secondary" | "agent";
  popular: boolean;
  isOneTime?: boolean;
  /** Direct Paddle price ID: used for the one-time White Label licences. */
  paddlePriceId?: string;
};

// Plan hierarchy: decides whether a card is an upgrade, downgrade or cancellation.
const PLAN_RANK: Record<PlanName, number> = { free: 0, professional: 1, agency: 2, reseller: 3 };

type PlanAction = "current" | "upgrade" | "downgrade" | "cancel";

function getPlanAction(cardPlan: PlanName, activePlan: PlanName): PlanAction {
  if (cardPlan === activePlan) return "current";
  // Moving to Free from any paid plan is a cancellation.
  if (cardPlan === "free") return "cancel";
  return PLAN_RANK[cardPlan] > PLAN_RANK[activePlan] ? "upgrade" : "downgrade";
}

const feature = (key: FeatureKey, included = true) => ({ key, included });

const PLANS: PlanCard[] = [
  {
    key: "professional",
    planKey: "professional",
    variant: "primary",
    popular: false,
    features: [
      feature("aiVisibility"),
      feature("rankings"),
      feature("competitors"),
      feature("audit"),
      feature("agentArticles"),
      feature("telegram"),
      feature("team", false),
      feature("workspaces", false),
      feature("agencyKit", false),
      feature("resellerConsole", false),
    ],
  },
  {
    key: "agency",
    planKey: "agency",
    variant: "secondary",
    popular: false,
    features: [
      feature("everythingGrowth"),
      feature("team"),
      feature("multiBrand"),
      feature("clientReports"),
      feature("agencyKit"),
      feature("autopilot"),
      feature("resellerConsole", false),
      feature("unlimitedWorkspaces", false),
      feature("unlimitedTeam", false),
    ],
  },
  {
    key: "reseller",
    planKey: "reseller",
    variant: "agent",
    popular: true,
    features: [
      feature("everythingAgency"),
      feature("resellerConsole"),
      feature("resellerAccounts"),
      feature("unlimitedWorkspaces"),
      feature("unlimitedTeam"),
      feature("partnerSupport"),
    ],
  },
];

const WHITELABEL_PLANS: PlanCard[] = (["whitelabel_starter", "whitelabel_pro", "whitelabel_unlimited"] as const).map(
  (tier) => ({
    key: tier,
    planKey: tier,
    variant: tier === "whitelabel_pro" ? "agent" : "secondary",
    popular: tier === "whitelabel_pro",
    isOneTime: true,
    paddlePriceId: getPlanPriceId(tier, "one-time"),
    features: [
      feature("wlSeats"),
      feature("wlPricing"),
      feature("wlBrand"),
      feature("wlDashboard"),
      feature("wlKit"),
      feature("wlSupport"),
    ],
  }),
);

type UpgradeTab = "app" | "whitelabel";

/** Reads ?tab in a Suspense-isolated child, like the settings page. */
function UpgradeParamsReader({ onChange }: { onChange: (tab: UpgradeTab) => void }) {
  const searchParams = useSearchParams();
  const tab: UpgradeTab = searchParams.get("tab") === "whitelabel" ? "whitelabel" : "app";
  React.useEffect(() => {
    onChange(tab);
  }, [tab, onChange]);
  return null;
}

/**
 * Plans and White Label licences, checked out with Paddle. Free or
 * already-cancelled accounts go straight to checkout; an active paid plan is
 * confirmed first, cancelled, and then the new plan opens in checkout.
 */
export function UpgradeView() {
  const t = useTranslations("account.upgrade");
  const tPlan = useTranslations("account.plans");
  const format = useFormatter();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<UpgradeTab>("app");
  const handleTabParam = React.useCallback((tab: UpgradeTab) => setActiveTab(tab), []);

  const { paddle, paddleReady, paddleConfigured } = React.useContext(PaddleContext);
  const sessionUser = useSessionUser();
  const [period, setPeriod] = React.useState<BillingPeriod>("annually");
  const activePlan = getActivePlan(sessionUser?.subscriptions);
  const activeSubscription = sessionUser?.subscriptions?.subscription;
  const activePlanLabel = tPlan(`${activePlan}.label`);
  const nextBillingDate = getNextBillingDate(activeSubscription);
  const formatDate = (date: Date) => format.dateTime(date, { dateStyle: "long" });

  // The plan is already set to expire (renewal cancelled) when is_cancelled is 1.
  const isCancelled = activeSubscription?.is_cancelled === 1;
  const endDate = activeSubscription?.end_date ? new Date(activeSubscription.end_date) : null;
  const endDateValid = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null;
  const expireNotice =
    isCancelled && activePlan !== "free"
      ? t("expireNotice", {
          plan: activePlanLabel,
          hasDate: endDateValid ? "yes" : "no",
          date: endDateValid ? formatDate(endDateValid) : "",
        })
      : null;

  // The agency kit ships with the White Label add-on: cookie first, then the backend.
  const { hasAccess: canAccessMarketingAssets } = useWhiteLabelAccess();
  const [isWhiteLabelUpgradeOpen, setIsWhiteLabelUpgradeOpen] = React.useState(false);

  const openMarketingAssets = React.useCallback(() => {
    if (!canAccessMarketingAssets) {
      setIsWhiteLabelUpgradeOpen(true);
      return;
    }
    router.push(accountHref.agency());
  }, [canAccessMarketingAssets, router]);

  const [pendingPlan, setPendingPlan] = React.useState<PlanCard | null>(null);
  const [pendingAction, setPendingAction] = React.useState<PlanAction | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const cardName = React.useCallback(
    (plan: PlanCard) => (plan.isOneTime ? t(`whiteLabelPlans.${plan.key as WhiteLabelTier}.name`) : tPlan(`${plan.key as PaidPlan}.label`)),
    [t, tPlan],
  );

  const openCheckout = React.useCallback(
    (plan: PlanCard) => {
      // White Label licences carry their own one-time price ID.
      const priceId = plan.paddlePriceId || getPlanPriceId(plan.planKey, period);

      if (!priceId) {
        toast.error(t("errors.noPrice"));
        return;
      }
      if (!paddle || !paddleReady) {
        toast.error(t("errors.notReady"));
        return;
      }
      try {
        // customData.userId lets the backend webhook attribute the payment.
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: { email: sessionUser?.email ?? "" },
          customData: { userId: sessionUser?.id, email: sessionUser?.email },
          settings: {
            theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
            displayMode: "overlay",
            variant: "one-page",
          },
        });
      } catch (error) {
        toast.error(getErrorMessage(error, t("errors.checkout")));
      }
    },
    [paddle, paddleReady, period, sessionUser, t],
  );

  const handleCardAction = React.useCallback(
    (plan: PlanCard, action: PlanAction) => {
      if (action === "current") return;

      // White Label licences are standalone purchases: straight to checkout.
      if (plan.paddlePriceId || plan.planKey.startsWith("whitelabel_")) {
        if (!plan.paddlePriceId) {
          toast.error(t("errors.noPriceContact"));
          return;
        }
        openCheckout(plan);
        return;
      }

      // Free accounts and plans already set to expire have nothing to confirm.
      if ((action === "upgrade" || action === "downgrade") && (activePlan === "free" || isCancelled)) {
        openCheckout(plan);
        return;
      }

      // Active paid plan: confirm the immediate switch (or the cancellation).
      setPendingPlan(plan);
      setPendingAction(action);
    },
    [activePlan, isCancelled, openCheckout, t],
  );

  const closeModal = React.useCallback(() => {
    if (isProcessing) return;
    setPendingPlan(null);
    setPendingAction(null);
  }, [isProcessing]);

  const confirmPlanChange = React.useCallback(async () => {
    if (!pendingAction) return;
    setIsProcessing(true);
    try {
      // Every plan change cancels the current subscription first; the new
      // plan is then bought in checkout. Cancel-only stops here.
      if (activeSubscription?.id != null) {
        await SubscriptionService.cancelSubscription(activeSubscription.id);
      }
      if (pendingAction === "cancel") {
        toast.success(t("cancelled"));
      } else if (pendingPlan) {
        openCheckout(pendingPlan);
      }
      setPendingPlan(null);
      setPendingAction(null);
    } catch (error) {
      toast.error(getErrorMessage(error, t("errors.update")));
    } finally {
      setIsProcessing(false);
    }
  }, [pendingAction, pendingPlan, activeSubscription, openCheckout, t]);

  const isCancelFlow = pendingAction === "cancel";
  const isDowngradeFlow = pendingAction === "downgrade";
  const pendingName = pendingPlan ? cardName(pendingPlan) : "";
  const renewalDate = nextBillingDate ? formatDate(nextBillingDate) : "";

  const dialogTitle = isCancelFlow
    ? t("confirm.cancelTitle", { plan: activePlanLabel })
    : isDowngradeFlow
      ? t("confirm.downgradeTitle", { plan: pendingName })
      : t("confirm.upgradeTitle", { plan: pendingName });

  const strong = (chunks: React.ReactNode) => <strong className="font-semibold text-fg">{chunks}</strong>;
  const dialogBody = isCancelFlow
    ? t("confirm.cancelBody", { plan: activePlanLabel, hasDate: renewalDate ? "yes" : "no", date: renewalDate })
    : isDowngradeFlow
      ? t.rich("confirm.downgradeBody", {
          plan: activePlanLabel,
          next: pendingName,
          hasDate: endDateValid ? "yes" : "no",
          date: endDateValid ? formatDate(endDateValid) : "",
          strong,
        })
      : t.rich("confirm.upgradeBody", { plan: activePlanLabel, next: pendingName, strong });

  return (
    <div className="flex flex-col gap-6">
      <React.Suspense fallback={null}>
        <UpgradeParamsReader onChange={handleTabParam} />
      </React.Suspense>

      <PageHeader title={t("title")} description={t("description")} />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UpgradeTab)} className="gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList variant="segmented">
            <TabsTrigger value="app">{t("tabs.app")}</TabsTrigger>
            <TabsTrigger value="whitelabel">{t("tabs.whitelabel")}</TabsTrigger>
          </TabsList>
          {activeTab === "app" && (
            <Tabs value={period} onValueChange={(value) => setPeriod(value as BillingPeriod)}>
              <TabsList variant="segmented" aria-label={t("period.label")}>
                <TabsTrigger value="monthly">{t("period.monthly")}</TabsTrigger>
                <TabsTrigger value="annually">{t("period.annually")}</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {!paddleConfigured && (
          <p role="status" className="rounded-md bg-warning-bg px-4 py-3 text-small text-fg-2">
            {t("checkoutOff")}
          </p>
        )}

        <TabsContent value="app">
          <ul className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            {PLANS.map((plan) => (
              <PricingCard
                key={plan.key}
                plan={plan}
                name={cardName(plan)}
                period={period}
                action={getPlanAction(plan.planKey as PlanName, activePlan)}
                paddleReady={paddleReady}
                paddleConfigured={paddleConfigured}
                expireNotice={expireNotice}
                onAction={handleCardAction}
              />
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="whitelabel" className="flex flex-col gap-6">
          {/* The sales kit ships with a White Label licence; owners go straight in. */}
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-signal text-signal-ink">
                <FolderDownIcon className="size-[18px]" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-h3 text-fg">{t("kit.title")}</h2>
                <p className="text-small text-fg-2">{t("kit.body")}</p>
              </div>
            </div>
            <Button variant="primary" className="shrink-0" onClick={openMarketingAssets}>
              <FolderDownIcon />
              {canAccessMarketingAssets ? t("kit.open") : t("kit.view")}
            </Button>
          </section>

          <ul className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            {WHITELABEL_PLANS.map((plan) => (
              <PricingCard
                key={plan.key}
                plan={plan}
                name={cardName(plan)}
                period={period}
                // White Label licences always show as a purchase.
                action="upgrade"
                paddleReady={paddleReady}
                paddleConfigured={paddleConfigured}
                expireNotice={null}
                onAction={handleCardAction}
              />
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <WhiteLabelUpgradeDialog open={isWhiteLabelUpgradeOpen} onOpenChange={setIsWhiteLabelUpgradeOpen} />

      <ConfirmDialog
        open={pendingAction !== null && pendingAction !== "current"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        tone={isCancelFlow ? "danger" : "primary"}
        title={dialogTitle}
        description={dialogBody}
        cancelLabel={t("confirm.keep")}
        confirmLabel={
          isCancelFlow ? t("confirm.cancel") : isDowngradeFlow ? t("confirm.cancelDowngrade") : t("confirm.cancelUpgrade")
        }
        isPending={isProcessing}
        onConfirm={confirmPlanChange}
      />
    </div>
  );
}

function PricingCard({
  plan,
  name,
  period,
  action,
  paddleReady,
  paddleConfigured,
  expireNotice,
  onAction,
}: {
  plan: PlanCard;
  name: string;
  period: BillingPeriod;
  action: PlanAction;
  paddleReady: boolean;
  paddleConfigured: boolean;
  /** Replaces the button on the Free card when the active plan is set to expire. */
  expireNotice: string | null;
  onAction: (plan: PlanCard, action: PlanAction) => void;
}) {
  const t = useTranslations("account.upgrade");
  const format = useFormatter();
  const isCurrent = action === "current";
  const isCancel = action === "cancel";
  const isPaidChange = action === "upgrade" || action === "downgrade";

  const tier = plan.isOneTime ? WHITE_LABEL_TIERS[plan.key as WhiteLabelTier] : null;
  const prices = plan.isOneTime ? null : PLAN_PRICES[plan.key as PaidPlan];
  const price = tier ? tier.price : period === "monthly" ? prices?.monthly : prices?.annually;
  const original = prices?.original ?? null;
  const hasPromo = price != null && original != null && original > price;

  const isWhitelabelCheckout = Boolean(plan.paddlePriceId);
  const disabled = isCurrent || (isPaidChange && !paddleReady);

  const label = isCurrent
    ? t("card.current")
    : isCancel
      ? t("card.cancel")
      : isPaidChange && !paddleConfigured
        ? t("card.checkoutOff")
        : isPaidChange && !paddleReady && !isWhitelabelCheckout
          ? t("card.loading")
          : action === "downgrade"
            ? t("card.downgrade", { plan: name })
            : plan.isOneTime
              ? t("card.choose", { plan: name })
              : t("card.upgrade", { plan: name });

  const description = plan.isOneTime
    ? tier?.seats
      ? t("whiteLabelPlans.seats", { count: tier.seats })
      : t("whiteLabelPlans.unlimitedSeats")
    : t(`planCopy.${plan.key as PaidPlan}`);

  return (
    <li className="flex">
      <Card
        className={cn("relative w-full gap-5 p-6", plan.popular && "border-signal ring-1 ring-signal")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-h2 text-fg">{name}</h3>
          {plan.popular && (
            <Badge variant="signal" shape="pill">
              {t("card.popular")}
            </Badge>
          )}
          {isCurrent && !plan.isOneTime && (
            <Badge variant="success" shape="pill">
              {t("card.active")}
            </Badge>
          )}
        </div>
        <p className="-mt-3 text-small text-fg-2">{description}</p>

        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2">
            {hasPromo && (
              <span className="num mb-1 text-body-lg text-fg-3 line-through">
                {format.number(original as number, "currency")}
              </span>
            )}
            {price != null ? (
              <>
                <span className="text-metric-xl text-fg">{format.number(price, "currency")}</span>
                <span className="mb-1.5 text-small text-fg-3">{plan.isOneTime ? t("card.oneTime") : t("card.perMonth")}</span>
              </>
            ) : (
              <span className="text-h2 text-fg-2">{t("card.pricePending")}</span>
            )}
          </div>
          <p className="min-h-4 text-caption text-blue">
            {plan.isOneTime ? t("card.oneTimeLicence") : period === "annually" && price != null ? t("card.billedAnnually") : null}
          </p>
        </div>

        <ul className="flex flex-1 flex-col gap-2.5">
          {plan.features.map((item) => (
            <li
              key={item.key}
              className={cn("flex items-start gap-2 text-small", item.included ? "text-fg" : "text-fg-3")}
            >
              {item.included ? (
                <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <XIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-3" />
              )}
              <span className={cn(!item.included && "line-through")}>
                {t(`features.${item.key}`, { seats: tier?.seats ?? 0 })}
              </span>
              <span className="sr-only">{item.included ? t("card.included") : t("card.notIncluded")}</span>
            </li>
          ))}
        </ul>

        {isCancel && expireNotice ? (
          <p className="rounded-md bg-bg px-3 py-2.5 text-center text-small text-fg-2">{expireNotice}</p>
        ) : (
          <Button
            variant={isCancel ? "destructive" : isCurrent ? "secondary" : plan.variant}
            className="w-full"
            disabled={isWhitelabelCheckout ? !paddleReady : disabled}
            onClick={() => onAction(plan, action)}
          >
            {label}
          </Button>
        )}
      </Card>
    </li>
  );
}
