"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { fakeRequest } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";

/** One question per line. Shared by AI visibility (questions) and Rankings (keywords). */
export function AddQuestionsDialog({
  open,
  onOpenChange,
  kind = "questions",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: "questions" | "keywords";
}) {
  const t = useTranslations(`visibility.add.${kind}`);
  const tCommon = useTranslations("common");
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) return setError(t("required"));
    setSaving(true);
    await fakeRequest();
    setSaving(false);
    setText("");
    onOpenChange(false);
    toast.success(t("added", { count: lines.length }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <FormField label={t("label")} helper={t("helper", { count: lines.length })} error={error}>
            {(props) => (
              <Textarea
                {...props}
                rows={6}
                value={text}
                placeholder={t("placeholder")}
                onChange={(e) => {
                  setText(e.target.value);
                  setError(undefined);
                }}
              />
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
