"use client";

import { useTranslations } from "next-intl";

import { FormField } from "@/components/forms/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ADMIN_ROLES, BILLING_OPTIONS, PLAN_OPTIONS, type AdminPlan, type BillingType } from "./user-utils";

/** Labelled select used across the admin user dialogs. */
function OptionSelect<T extends string>({
  label,
  value,
  options,
  optionLabel,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  optionLabel: (option: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <FormField label={label}>
      {(props) => (
        <Select value={value} onValueChange={(next) => onChange(next as T)}>
          <SelectTrigger {...props} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {optionLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}

export function RoleSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations("admin.users");
  const known = (ADMIN_ROLES as readonly string[]).includes(value);
  const options = known ? ADMIN_ROLES : ([value, ...ADMIN_ROLES] as readonly string[]);
  return (
    <OptionSelect
      label={t("fields.role")}
      value={value}
      options={options}
      optionLabel={(role) =>
        (ADMIN_ROLES as readonly string[]).includes(role) ? t(`roles.${role as (typeof ADMIN_ROLES)[number]}`) : role
      }
      onChange={onChange}
    />
  );
}

export function StatusSelect({ active, onChange }: { active: boolean; onChange: (active: boolean) => void }) {
  const t = useTranslations("admin.users");
  return (
    <OptionSelect
      label={t("fields.status")}
      value={active ? "active" : "inactive"}
      options={["active", "inactive"] as const}
      optionLabel={(option) => t(`status.${option}`)}
      onChange={(next) => onChange(next === "active")}
    />
  );
}

export function PlanSelect({ value, onChange }: { value: AdminPlan; onChange: (value: AdminPlan) => void }) {
  const t = useTranslations("admin.users");
  const tPlan = useTranslations("account.plans");
  return (
    <OptionSelect
      label={t("fields.plan")}
      value={value}
      options={PLAN_OPTIONS}
      optionLabel={(plan) => tPlan(`${plan}.label`)}
      onChange={onChange}
    />
  );
}

export function BillingSelect({ value, onChange }: { value: BillingType; onChange: (value: BillingType) => void }) {
  const t = useTranslations("admin.users");
  const tBilling = useTranslations("account.billingTypes");
  return (
    <OptionSelect
      label={t("fields.billing")}
      value={value}
      options={BILLING_OPTIONS}
      optionLabel={(option) => tBilling(option)}
      onChange={onChange}
    />
  );
}
