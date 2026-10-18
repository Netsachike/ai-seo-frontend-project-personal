"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "./form-field";

/** Labelled select with helper text, wired to FormField for ids and descriptions. */
export function SelectField({
  label,
  helper,
  placeholder,
  error,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  helper?: string;
  placeholder?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  /** `icon` and `detail` (a muted second part, e.g. a URL) show in the list and the trigger. */
  options: { value: string; label: string; icon?: React.ReactNode; detail?: string }[];
  className?: string;
}) {
  return (
    <FormField label={label} helper={helper} error={error} className={cn(className)}>
      {(props) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger {...props} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.icon || o.detail ? (
                  <span className="flex min-w-0 items-center gap-2">
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                    {o.detail && (
                      <span dir="ltr" className="truncate font-mono text-[12px] text-fg-3">
                        {o.detail}
                      </span>
                    )}
                  </span>
                ) : (
                  o.label
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}
