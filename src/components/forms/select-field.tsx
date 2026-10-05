"use client";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "./form-field";

/** Labelled select with helper text, wired to FormField for ids and descriptions. */
export function SelectField({
  label,
  helper,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <FormField label={label} helper={helper} className={cn(className)}>
      {(props) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger {...props} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}
