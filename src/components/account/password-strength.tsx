"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * The shared Netsach password rule: at least 8 characters, an uppercase
 * letter, a number and a symbol. "Strong" means all four.
 */
export const strengthChecks = {
  length: (v: string) => v.length >= 8,
  uppercase: (v: string) => /[A-Z]/.test(v),
  number: (v: string) => /\d/.test(v),
  symbol: (v: string) => /[^A-Za-z0-9]/.test(v),
} as const;

export function getStrength(password: string) {
  return Object.values(strengthChecks).filter((check) => check(password)).length;
}

const barTone = (strength: number) =>
  strength <= 1 ? "bg-danger" : strength === 2 ? "bg-warning" : strength === 3 ? "bg-blue" : "bg-success";

/** Four bars plus the rule list, so the meter never relies on colour alone. */
export function PasswordStrength({ value, id, className }: { value: string; id?: string; className?: string }) {
  const t = useTranslations("account.password");
  const strength = getStrength(value);
  return (
    <div id={id} className={cn("flex flex-col gap-2", className)}>
      <div aria-hidden className="grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-full transition-colors duration-200",
              value && i < strength ? barTone(strength) : "bg-surface-2",
            )}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {(Object.keys(strengthChecks) as (keyof typeof strengthChecks)[]).map((key) => {
          const ok = strengthChecks[key](value);
          return (
            <li
              key={key}
              className={cn("flex items-center gap-1.5 text-caption font-normal", ok ? "text-success" : "text-fg-3")}
            >
              {ok ? (
                <CheckIcon aria-hidden className="size-3.5" />
              ) : (
                <span aria-hidden className="mx-[5px] size-1 rounded-full bg-current" />
              )}
              {t(`rules.${key}`)}
              <span className="sr-only">{ok ? t("met") : t("notMet")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
