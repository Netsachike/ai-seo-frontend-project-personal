"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CopyIcon, SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { fakeRequest } from "@/lib/auth/session";
import { useOnboarding, type ConnectionState } from "@/features/onboarding/store";
import { useMe } from "@/features/workspace/hooks";
import { Button } from "@/components/ui/button";
import { AutopilotOptions } from "@/components/agent/autopilot-options";
import { IntegrationRow, type IntegrationStatus } from "@/components/brand/integration-row";
import { QrTile } from "@/components/brand/qr-tile";
import { StepFrame } from "@/components/layout/onboarding-shell";

/** UI-stage link token; the backend will issue one per user. */
const LINK_CODE = "ORB-7K2Q-NW";
const DEEP_LINK = `https://t.me/OrbitAgentBot?start=${LINK_CODE.replaceAll("-", "")}`;

const statusOf = (s: ConnectionState): IntegrationStatus =>
  s === "connected" ? "connected" : s === "connecting" ? "connecting" : "notConnected";

export function ConnectStep() {
  const t = useTranslations("onboarding.connect");
  const router = useRouter();
  const me = useMe();
  const s = useOnboarding();
  const handle = me.data?.telegram?.handle ?? "you";

  const connect = async (key: "telegram" | "wordpress" | "searchConsole", ms = 1500) => {
    s.set({ [key]: "connecting" });
    await fakeRequest(ms);
    useOnboarding.getState().set({ [key]: "connected" });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(LINK_CODE);
      toast(t("telegram.copied"));
    } catch {
      toast.error(t("telegram.copyFailed"));
    }
  };

  const telegramDone = s.telegram === "connected";

  return (
    <StepFrame
      step="connect"
      back="keywords"
      wide
      title={t("title")}
      description={t("description")}
      continueLabel={t("startScan")}
      continueVariant={telegramDone ? "primary" : "secondary"}
      onContinue={() => {
        s.complete("connect");
        s.set({ scanJobId: `job_scan_${Date.now()}` });
        router.push("/onboarding/scan");
      }}
      hint={telegramDone ? undefined : t("skipHint")}
    >
      <section className="flex flex-col gap-3">
        <h2 className="text-overline text-fg-3">{t("talkTitle")}</h2>
        <IntegrationRow
          monogram="TG"
          name={t("telegram.name")}
          description={t("telegram.description")}
          status={statusOf(s.telegram)}
          detail={telegramDone ? t("telegram.connectedAs", { handle }) : undefined}
        >
          {!telegramDone && (
            <div className="flex flex-col gap-5 rounded-md bg-bg p-4 sm:flex-row sm:items-center">
              <QrTile value={DEEP_LINK} label={t("telegram.qrLabel")} size={132} />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <ol className="flex list-decimal flex-col gap-1 ps-5 text-small text-fg-2">
                  <li>{t("telegram.step1")}</li>
                  <li>{t("telegram.step2")}</li>
                  <li>{t("telegram.step3")}</li>
                </ol>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    loading={s.telegram === "connecting"}
                    onClick={() => {
                      window.open(DEEP_LINK, "_blank", "noopener,noreferrer");
                      void connect("telegram", 3500);
                    }}
                  >
                    <SendIcon className="rtl:-scale-x-100" />
                    {t("telegram.connect")}
                  </Button>
                  <span className="text-caption font-normal text-fg-3">{t("telegram.orCode")}</span>
                  <button
                    type="button"
                    onClick={copyCode}
                    aria-label={t("telegram.copyAria", { code: LINK_CODE })}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2 font-mono text-[13px] text-fg hover:bg-surface-2"
                  >
                    <span dir="ltr">{LINK_CODE}</span>
                    <CopyIcon aria-hidden className="size-3.5 text-fg-3" />
                  </button>
                </div>
                {s.telegram === "connecting" && (
                  <p aria-live="polite" className="text-caption font-normal text-fg-2">
                    {t("telegram.waiting")}
                  </p>
                )}
              </div>
            </div>
          )}
        </IntegrationRow>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-overline text-fg-3">{t("publishTitle")}</h2>
        <IntegrationRow
          monogram="WP"
          name={t("wordpress.name")}
          description={t("wordpress.description")}
          status={statusOf(s.wordpress)}
          detail={
            s.wordpress === "connected" && s.domain ? (
              <span dir="ltr" className="font-mono">
                {s.domain}
              </span>
            ) : undefined
          }
          action={
            s.wordpress !== "connected" && (
              <Button
                variant="secondary"
                loading={s.wordpress === "connecting"}
                onClick={() => void connect("wordpress")}
              >
                {t("connect")}
              </Button>
            )
          }
        />
        <IntegrationRow
          monogram="GSC"
          name={t("searchConsole.name")}
          description={t("searchConsole.description")}
          status={statusOf(s.searchConsole)}
          action={
            s.searchConsole !== "connected" && (
              <Button
                variant="secondary"
                loading={s.searchConsole === "connecting"}
                onClick={() => void connect("searchConsole")}
              >
                {t("connect")}
              </Button>
            )
          }
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-h3">{t("autopilotTitle")}</h2>
          <p className="text-small text-fg-2">{t("autopilotDescription")}</p>
        </div>
        <AutopilotOptions value={s.autopilot} onChange={(autopilot) => s.set({ autopilot })} />
      </section>
    </StepFrame>
  );
}
