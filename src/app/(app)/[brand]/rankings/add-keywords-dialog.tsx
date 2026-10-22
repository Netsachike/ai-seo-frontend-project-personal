"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { siteKeys } from "@/lib/api/query-keys";
import keywordService from "@/services/keywords";
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
import { useBusyOverlay } from "@/components/brand/busy-overlay";

/** The backend accepts up to 100 seeds of 2–200 characters. */
const MAX_SEEDS = 100;

/**
 * One keyword per line. They are sent as seeds to keyword discovery, which
 * also expands them from the site's latest crawl, then scored and clustered.
 */
export function AddKeywordsDialog({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("visibility.add.keywords");
  const tCommon = useTranslations("common");
  const tBusy = useTranslations("busy");
  const queryClient = useQueryClient();
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string>();
  const seeds = [
    ...new Set(
      text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length >= 2 && l.length <= 200),
    ),
  ].slice(0, MAX_SEEDS);

  const discover = useMutation({
    mutationFn: async (seedKeywords: string[]) => {
      const { data } = await keywordService.discover(siteId, { seed_keywords: seedKeywords });
      await keywordService.analyze(siteId);
      return data;
    },
    onSuccess: (result) => {
      setText("");
      onOpenChange(false);
      toast.success(t("added", { count: result.keywords_discovered }));
      return queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
    },
    onError: (err) => setError(getErrorMessage(err, t("failed"))),
  });
  useBusyOverlay(discover.isPending, tBusy("findingKeywords"));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (seeds.length === 0) return setError(t("required"));
    discover.mutate(seeds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <FormField label={t("label")} helper={t("helper", { count: seeds.length })} error={error}>
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
            <Button type="submit" variant="primary" loading={discover.isPending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
