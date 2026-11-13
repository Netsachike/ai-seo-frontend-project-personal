"use client";

import * as React from "react";
import { InfoIcon, RefreshCwIcon, RssIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { RssFeedSettings } from "@/types/types";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { useRssFeed, useRssFeedActions } from "@/features/publishing/rss";
import { CopyButton } from "@/components/brand/copy-button";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

/**
 * The site's private RSS feed, kept by the backend: create it, copy its link,
 * switch it on or off, change what it holds, or replace the link. The feed
 * lists articles published through a connected platform.
 */
export function FeedLinks({ siteId, canEdit = true }: { siteId: number; canEdit?: boolean }) {
  const t = useTranslations("integrations.feed");
  const feed = useRssFeed(siteId);
  const actions = useRssFeedActions(siteId);
  const fail = (error: unknown) => toast.error(getErrorMessage(error, t("actionFailed")));

  if (feed.isPending) return <Skeleton className="h-40 w-full rounded-md" />;
  if (feed.isError || !feed.data) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-danger-bg px-3 py-2.5"
      >
        <p className="text-small text-danger">{t("failed")}</p>
        <Button size="sm" variant="secondary" onClick={() => void feed.refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!feed.data.exists || !feed.data.feed_url) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-border p-4">
        <div className="flex items-center gap-2">
          <RssIcon aria-hidden className="size-4 text-fg-3" />
          <p className="text-small font-semibold text-fg">{t("createTitle")}</p>
        </div>
        <p className="text-small text-fg-2">{t("createBody")}</p>
        <Button
          variant="primary"
          disabled={!canEdit}
          loading={actions.create.isPending}
          onClick={() =>
            actions.create.mutate(undefined, { onSuccess: () => toast.success(t("created")), onError: fail })
          }
        >
          {t("create")}
        </Button>
        <FeedNotes />
      </div>
    );
  }

  const data = feed.data;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-small font-semibold text-fg">{t("linkTitle")}</p>
          <CopyButton value={data.feed_url ?? ""} />
        </div>
        <code dir="ltr" className="truncate rounded bg-surface-2 px-2 py-1.5 font-mono text-[12px] text-fg">
          {data.feed_url}
        </code>
        <p className="text-caption font-normal text-fg-3">{t("linkBody")}</p>
      </div>

      <label className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-small font-semibold text-fg">{data.is_active ? t("on") : t("off")}</span>
          <span className="text-caption font-normal text-fg-3">{data.is_active ? t("onBody") : t("offBody")}</span>
        </span>
        <Switch
          checked={data.is_active}
          disabled={!canEdit || actions.toggle.isPending}
          onCheckedChange={() =>
            actions.toggle.mutate(undefined, {
              onSuccess: (result) => toast.success(result.is_active ? t("turnedOn") : t("turnedOff")),
              onError: fail,
            })
          }
        />
      </label>

      <FeedSettingsForm key={data.updated_at} feed={data} canEdit={canEdit} actions={actions} onError={fail} />

      <RegenerateLink canEdit={canEdit} actions={actions} onError={fail} />

      <FeedNotes />
    </div>
  );
}

/** What ends up in the feed, and who can read it. */
function FeedNotes() {
  const t = useTranslations("integrations.feed");
  return (
    <>
      <p className="flex items-start gap-2 rounded-md bg-bg p-3 text-small text-fg-2">
        <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-3" />
        {t("whatsIncluded")}
      </p>
      <p className="text-caption font-normal text-fg-3">{t("private")}</p>
    </>
  );
}

type Actions = ReturnType<typeof useRssFeedActions>;

function FeedSettingsForm({
  feed,
  canEdit,
  actions,
  onError,
}: {
  feed: RssFeedSettings;
  canEdit: boolean;
  actions: Actions;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations("integrations.feed");
  const [name, setName] = React.useState(feed.name ?? "");
  const [limit, setLimit] = React.useState(String(feed.items_limit ?? 50));
  const [fullContent, setFullContent] = React.useState(feed.include_full_content ?? true);
  const limitNumber = Number(limit);
  const limitOk = Number.isInteger(limitNumber) && limitNumber >= 1 && limitNumber <= 100;
  const changed =
    name.trim() !== (feed.name ?? "") ||
    limitNumber !== (feed.items_limit ?? 50) ||
    fullContent !== (feed.include_full_content ?? true);

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !limitOk) return;
        actions.update.mutate(
          { name: name.trim(), items_limit: limitNumber, include_full_content: fullContent },
          { onSuccess: () => toast.success(t("saved")), onError },
        );
      }}
    >
      <p className="text-small font-semibold text-fg">{t("settingsTitle")}</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
        <FormField label={t("name")} helper={t("nameHelper")}>
          {(props) => (
            <Input
              {...props}
              dir="auto"
              maxLength={255}
              disabled={!canEdit}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </FormField>
        <FormField label={t("limit")} error={limitOk ? undefined : t("limitError")} helper={t("limitHelper")}>
          {(props) => (
            <Input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              disabled={!canEdit}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          )}
        </FormField>
      </div>
      <label className="flex items-start justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-small font-medium text-fg">{t("fullContent")}</span>
          <span className="text-caption font-normal text-fg-3">
            {fullContent ? t("fullContentOn") : t("fullContentOff")}
          </span>
        </span>
        <Switch checked={fullContent} disabled={!canEdit} onCheckedChange={setFullContent} />
      </label>
      <Button
        type="submit"
        size="sm"
        variant="primary"
        className="self-end"
        disabled={!canEdit || !changed || !name.trim() || !limitOk}
        loading={actions.update.isPending}
      >
        {t("save")}
      </Button>
    </form>
  );
}

/** Replacing the link cuts off every reader using the old one, so it asks first. */
function RegenerateLink({
  canEdit,
  actions,
  onError,
}: {
  canEdit: boolean;
  actions: Actions;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations("integrations.feed");
  const [confirming, setConfirming] = React.useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-small font-semibold text-fg">{t("regenerateTitle")}</p>
      <p className="text-caption font-normal text-fg-3">{t("regenerateBody")}</p>
      {confirming ? (
        <div role="alert" className="flex flex-col gap-2 rounded-md bg-warning-bg p-3">
          <p className="text-small text-fg">{t("regenerateWarning")}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={actions.regenerate.isPending}
              onClick={() => setConfirming(false)}
            >
              {t("keep")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              loading={actions.regenerate.isPending}
              onClick={() =>
                actions.regenerate.mutate(undefined, {
                  onSuccess: () => {
                    toast.success(t("regenerated"));
                    setConfirming(false);
                  },
                  onError,
                })
              }
            >
              {t("regenerateConfirm")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          disabled={!canEdit}
          onClick={() => setConfirming(true)}
        >
          <RefreshCwIcon />
          {t("regenerate")}
        </Button>
      )}
    </div>
  );
}
