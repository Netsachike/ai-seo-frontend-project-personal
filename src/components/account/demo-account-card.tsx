"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConicalIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { writeSessionUserCookie } from "@/lib/auth-session";
import { PLAN_NAMES } from "@/lib/plan-core";
import { toast } from "@/lib/toast";
import {
  buildDemoSessionUser,
  readDemoAccount,
  saveDemoAccount,
  type DemoAccountOptions,
} from "@/lib/demo-session";
import { accountKeys } from "@/features/account/query-keys";
import { useSessionUser } from "@/features/account/use-session-user";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const BILLING = ["monthly", "yearly", "lifetime"] as const;
const TOGGLES = ["whiteLabel", "removeBranding", "cancelled"] as const;

/**
 * Demo mode only (no API configured). Rewrites the `authUser` cookie so the
 * role and plan gates can be checked without a backend: admin console,
 * reseller console, agency resources, White Label, upgrade paths.
 */
export function DemoAccountCard() {
  const t = useTranslations("account.demo");
  const tPlan = useTranslations("account.plans");
  const tBilling = useTranslations("account.billingTypes");
  const session = useSessionUser();
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState<DemoAccountOptions>(() => readDemoAccount(session ?? null));
  const set = (patch: Partial<DemoAccountOptions>) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <Card className="border-dashed border-border-strong">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-md bg-signal text-signal-ink">
            <FlaskConicalIcon className="size-[18px]" />
          </span>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label={t("role")}>
          {(props) => (
            <Select value={draft.role} onValueChange={(role) => set({ role: role as DemoAccountOptions["role"] })}>
              <SelectTrigger {...props} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t("roles.user")}</SelectItem>
                <SelectItem value="admin">{t("roles.admin")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label={t("plan")}>
          {(props) => (
            <Select value={draft.plan} onValueChange={(plan) => set({ plan: plan as DemoAccountOptions["plan"] })}>
              <SelectTrigger {...props} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_NAMES.map((plan) => (
                  <SelectItem key={plan} value={plan}>
                    {tPlan(`${plan}.label`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label={t("billing")}>
          {(props) => (
            <Select
              value={draft.billing}
              disabled={draft.plan === "free"}
              onValueChange={(billing) => set({ billing: billing as DemoAccountOptions["billing"] })}
            >
              <SelectTrigger {...props} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING.map((billing) => (
                  <SelectItem key={billing} value={billing}>
                    {tBilling(billing)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {TOGGLES.map((key) => {
          const id = `demo-${key}`;
          const disabled = key === "cancelled" && (draft.plan === "free" || draft.billing === "lifetime");
          return (
            <li key={key} className="flex items-center justify-between gap-4 px-4 py-3">
              <label htmlFor={id} className="flex min-w-0 flex-col gap-0.5">
                <span className="text-small font-medium text-fg">{t(`toggles.${key}.label`)}</span>
                <span className="text-caption font-normal text-fg-3">{t(`toggles.${key}.helper`)}</span>
              </label>
              <Switch
                id={id}
                checked={draft[key] && !disabled}
                disabled={disabled}
                onCheckedChange={(checked) => set({ [key]: checked })}
              />
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => {
            saveDemoAccount(draft);
            writeSessionUserCookie(buildDemoSessionUser(draft));
            void queryClient.invalidateQueries({ queryKey: accountKeys.all });
            toast.success(t("applied"));
          }}
        >
          {t("apply")}
        </Button>
      </div>
    </Card>
  );
}
