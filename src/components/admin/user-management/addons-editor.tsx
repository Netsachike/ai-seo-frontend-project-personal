"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BILLING_OPTIONS, type AddonsState, type BillingType } from "./user-utils";

/** Remove branding (with billing type) and reseller seats (with a seat limit). */
export function AddonsEditor({ value, onChange }: { value: AddonsState; onChange: (next: AddonsState) => void }) {
  const t = useTranslations("admin.users.addons");
  const tBilling = useTranslations("account.billingTypes");
  const brandingId = React.useId();
  const seatsId = React.useId();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={brandingId} className="flex flex-col gap-0.5">
            <span className="text-small font-medium text-fg">{t("removeBranding")}</span>
            <span className="text-caption font-normal text-fg-3">{t("removeBrandingHelper")}</span>
          </label>
          <Switch
            id={brandingId}
            checked={value.remove_branding.enabled}
            onCheckedChange={(enabled) => onChange({ ...value, remove_branding: { ...value.remove_branding, enabled } })}
          />
        </div>
        {value.remove_branding.enabled && (
          <FormField label={t("type")}>
            {(props) => (
              <Select
                value={value.remove_branding.type}
                onValueChange={(type) =>
                  onChange({ ...value, remove_branding: { ...value.remove_branding, type: type as BillingType } })
                }
              >
                <SelectTrigger {...props} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {tBilling(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={seatsId} className="flex flex-col gap-0.5">
            <span className="text-small font-medium text-fg">{t("resellerSeats")}</span>
            <span className="text-caption font-normal text-fg-3">{t("resellerSeatsHelper")}</span>
          </label>
          <Switch
            id={seatsId}
            checked={value.reseller_seats.enabled}
            onCheckedChange={(enabled) => onChange({ ...value, reseller_seats: { ...value.reseller_seats, enabled } })}
          />
        </div>
        {value.reseller_seats.enabled && (
          <FormField label={t("seatLimit")}>
            {(props) => (
              <Input
                {...props}
                type="number"
                min={1}
                inputMode="numeric"
                className="num"
                value={value.reseller_seats.limit}
                onChange={(event) =>
                  onChange({
                    ...value,
                    reseller_seats: { ...value.reseller_seats, limit: Math.max(Number(event.target.value) || 0, 0) },
                  })
                }
              />
            )}
          </FormField>
        )}
      </div>
    </div>
  );
}
