"use client";

import * as React from "react";
import { CheckIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** Password field with a show/hide toggle that keeps focus in the input. */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  const t = useTranslations("forms");
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pe-12", className)} />
      <button
        type="button"
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisible((v) => !v)}
        className="absolute end-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-fg"
      >
        {visible ? <EyeOffIcon aria-hidden className="size-4" /> : <EyeIcon aria-hidden className="size-4" />}
      </button>
    </div>
  );
}

export const passwordRules = {
  length: (v: string) => v.length >= 8,
  number: (v: string) => /\d/.test(v),
  mixedCase: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v),
} as const;

export const passwordIsValid = (value: string) => passwordRules.length(value) && passwordRules.number(value);

/** Live hints under a new-password field. Length and a number are required; mixed case is a bonus. */
export function PasswordHints({ value, id }: { value: string; id?: string }) {
  const t = useTranslations("forms.passwordHints");
  const passed = Object.values(passwordRules).filter((rule) => rule(value)).length;
  const tone = passed <= 1 ? "bg-danger" : passed === 2 ? "bg-warning" : "bg-success";
  return (
    <div id={id} className="flex flex-col gap-2">
      <div aria-hidden className="grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-full transition-colors duration-200",
              value && i < passed ? tone : "bg-surface-2",
            )}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-1">
        {(Object.keys(passwordRules) as (keyof typeof passwordRules)[]).map((key) => {
          const ok = passwordRules[key](value);
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
              {t(key)}
              <span className="sr-only">{ok ? t("met") : t("notMet")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
