"use client";

import { useTranslations } from "next-intl";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const autopilotModes = ["ask", "content", "full"] as const;
export type AutopilotModeValue = (typeof autopilotModes)[number];

/** Three radio cards. "Ask me first" is the default everywhere. */
export function AutopilotOptions({
  value,
  onChange,
  className,
}: {
  value: AutopilotModeValue;
  onChange: (value: AutopilotModeValue) => void;
  className?: string;
}) {
  const t = useTranslations("autopilot");
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(v) => onChange(v as AutopilotModeValue)}
      aria-label={t("label")}
      className={cn("grid gap-3 md:grid-cols-3", className)}
    >
      {autopilotModes.map((mode) => (
        <RadioGroupPrimitive.Item
          key={mode}
          value={mode}
          className={cn(
            "group flex flex-col items-start gap-2 rounded-lg border border-border-strong bg-surface p-4 text-start transition-colors duration-120",
            "hover:border-fg-3 data-[state=checked]:border-ink data-[state=checked]:shadow-[inset_0_0_0_1px_var(--ink)]",
          )}
        >
          <span className="flex w-full items-center gap-2">
            <span
              aria-hidden
              className="grid size-4 shrink-0 place-items-center rounded-full border border-border-strong group-data-[state=checked]:border-ink group-data-[state=checked]:bg-ink"
            >
              <span className="size-1.5 rounded-full bg-ink-fg opacity-0 group-data-[state=checked]:opacity-100" />
            </span>
            <span className="text-h3 text-fg">{t(`${mode}.title`)}</span>
            {mode === "ask" && (
              <Badge variant="neutral" className="ms-auto">
                {t("recommended")}
              </Badge>
            )}
          </span>
          <span className="text-small text-fg-2">{t(`${mode}.description`)}</span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
