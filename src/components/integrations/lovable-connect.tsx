"use client";

import * as React from "react";
import { CheckCircle2Icon, EyeIcon, EyeOffIcon, Loader2Icon, PlugZapIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { connectionPayload } from "@/features/publishing/forms";
import { ConnectionTestError, useCreateConnection } from "@/features/publishing/hooks";
import {
  LOVABLE_SETUP_PROMPT,
  lovableHealthUrl,
  lovableOrigin,
  lovableRoutingPrompt,
} from "@/features/publishing/lovable";
import { checkLovableHealth, type LovableError } from "@/features/publishing/lovable-health";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LovablePromptCard } from "./lovable-prompt";

/**
 * Attributes that keep browser and password-manager autofill out of these
 * fields: Chrome offered saved emails and passwords here, which reads as
 * "sign in" rather than "paste your site and key".
 */
const NO_AUTOFILL = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
  "data-form-type": "other",
} as const;

/**
 * The API key field. A plain text input masked with CSS rather than
 * type="password", so the browser never treats the form as a login and never
 * offers (or offers to save) a password.
 */
function ApiKeyInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  const t = useTranslations("integrations.lovable");
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        {...NO_AUTOFILL}
        type="text"
        style={visible ? undefined : ({ WebkitTextSecurity: "disc" } as React.CSSProperties)}
        className={cn("pe-12", className)}
      />
      <button
        type="button"
        aria-label={visible ? t("hideKey") : t("showKey")}
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

/** How often the health endpoint is re-checked while the user works in Lovable. */
const HEALTH_INTERVAL_MS = 1500;

type HealthResult = { for: string; ok: true } | { for: string; ok: false; error: LovableError };

/**
 * Checks GET {origin}/api/public/rankoya/health with the key every 1.5 s while
 * both are filled in, until it answers healthy. Pauses while the tab is hidden.
 * The result belongs to the URL and key it was checked with, so editing either
 * one shows "checking" again instead of a stale answer.
 */
function useLovableHealth(origin: string | null, apiKey: string) {
  const key = apiKey.trim();
  const subject = origin && key ? `${origin}\n${key}` : null;
  const [result, setResult] = React.useState<HealthResult | null>(null);

  React.useEffect(() => {
    if (!origin || !key) return;
    const target = `${origin}\n${key}`;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      if (document.hidden) {
        timer = setTimeout(run, HEALTH_INTERVAL_MS);
        return;
      }
      const health = await checkLovableHealth({ baseUrl: origin, apiKey: key });
      if (cancelled) return;
      if (health.ok) {
        setResult({ for: target, ok: true });
        return;
      }
      setResult({ for: target, ok: false, error: health.error });
      timer = setTimeout(run, HEALTH_INTERVAL_MS);
    };
    // A short wait first, so typing doesn't fire a check per keystroke.
    timer = setTimeout(run, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [origin, key]);

  if (!subject) return { state: "idle" } as const;
  if (!result || result.for !== subject) return { state: "checking" } as const;
  return result.ok ? ({ state: "live" } as const) : ({ state: "failed", error: result.error } as const);
}

/**
 * Lovable, in two prompts:
 * 1. the setup prompt (blog, routes, a Generate and Copy form for RANKOYA_API_KEY);
 * 2. the routing prompt, built from the site URL, so it's locked until the URL
 *    is in. Hovering the locked card or the Connect button highlights the URL
 *    field and says why.
 * Then the key: the health endpoint is checked automatically, and Connect
 * saves the connection (the backend tests it again to activate it).
 */
export function LovableConnect({
  site,
  name,
  onConnected,
  actionsClassName,
}: {
  site: Site;
  name: string;
  onConnected: () => void;
  actionsClassName?: string;
}) {
  const t = useTranslations("integrations");
  const create = useCreateConnection(site.id);
  const [url, setUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);
  // The locked step 2 card or Connect button is hovered: point at the URL field.
  const [nudge, setNudge] = React.useState(false);
  const urlInput = React.useRef<HTMLInputElement>(null);

  const origin = lovableOrigin(url);
  const health = useLovableHealth(origin, apiKey);
  const locked = !origin;
  const showNudge = nudge && locked;

  const nudgeProps = locked
    ? {
        onPointerEnter: () => setNudge(true),
        onPointerLeave: () => setNudge(false),
        onClick: () => urlInput.current?.focus(),
      }
    : {};

  const connect = async () => {
    if (!origin) {
      urlInput.current?.focus();
      return;
    }
    if (!apiKey.trim()) {
      setError(t("lovable.keyRequired"));
      return;
    }
    setError(null);
    // The automatic check may not have answered yet; never save a key that hasn't passed.
    if (health.state !== "live") {
      setChecking(true);
      const result = await checkLovableHealth({ baseUrl: origin, apiKey: apiKey.trim() });
      setChecking(false);
      if (!result.ok) {
        setError(t(`lovable.errors.${result.error}`));
        return;
      }
    }
    create.mutate(connectionPayload("lovable", `${name} · ${site.domain}`, { base_url: origin, api_key: apiKey }), {
      onSuccess: onConnected,
      onError: (err) =>
        setError(
          err instanceof ConnectionTestError
            ? t("errors.testFailed", { message: err.message })
            : getErrorMessage(err, t("errors.connectFailed")),
        ),
    });
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void connect();
      }}
    >
      <LovablePromptCard
        step={1}
        title={t("lovable.step1Title")}
        body={t("lovable.step1Body")}
        prompt={LOVABLE_SETUP_PROMPT}
      />

      <Tooltip open={showNudge}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "rounded-md transition-shadow duration-200",
              showNudge && "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--blue)]",
            )}
          >
            <FormField label={t("fields.lovableUrl")} helper={t("lovable.urlHelper")}>
              {(props) => (
                <Input
                  {...props}
                  ref={urlInput}
                  dir="ltr"
                  {...NO_AUTOFILL}
                  type="text"
                  inputMode="url"
                  name="lovable-site-address"
                  placeholder={t("placeholders.lovableUrl")}
                  value={url}
                  onChange={(event) => {
                    // A site address never has an @: typing or pasting an email can't get in.
                    setUrl(event.target.value.replace(/@/g, ""));
                    setError(null);
                  }}
                />
              )}
            </FormField>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{t("lovable.urlFirst")}</TooltipContent>
      </Tooltip>

      <FormField label={t("fields.lovableApiKey")}>
        {(props) => (
          <ApiKeyInput
            {...props}
            dir="ltr"
            name="lovable-rankoya-key"
            placeholder={t("placeholders.lovableApiKey")}
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              setError(null);
            }}
          />
        )}
      </FormField>

      <LovablePromptCard
        step={2}
        title={t("lovable.step2Title")}
        body={t("lovable.step2Body")}
        lockedBody={t("lovable.step2Locked")}
        prompt={origin ? lovableRoutingPrompt(origin) : null}
        locked={locked}
        {...nudgeProps}
      >
        {origin && (
          <code dir="ltr" className="truncate rounded bg-surface-2 px-2 py-1.5 font-mono text-[12px] text-fg">
            {lovableHealthUrl(origin)}
          </code>
        )}
      </LovablePromptCard>

      {health.state !== "idle" && (
        <p
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-md px-3 py-2.5 text-small",
            health.state === "live" ? "bg-success-bg/40 text-fg" : "bg-bg text-fg-2",
          )}
        >
          {health.state === "live" ? (
            <CheckCircle2Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <Loader2Icon aria-hidden className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          )}
          <span>
            {health.state === "live"
              ? t("lovable.live")
              : health.state === "checking"
                ? t("lovable.checking")
                : `${t(`lovable.errors.${health.error}`)} ${t("lovable.rechecking")}`}
          </span>
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2.5 text-small text-danger">
          {error}
        </p>
      )}

      <div className={cn("flex", actionsClassName)}>
        {/* A disabled button gets no pointer events, so the wrapper carries the hover hint. */}
        <span className={cn("inline-flex", locked && "cursor-not-allowed")} {...nudgeProps}>
          <Button
            type="submit"
            variant="primary"
            disabled={locked || !apiKey.trim()}
            loading={checking || create.isPending}
            className={cn(locked && "pointer-events-none")}
          >
            <PlugZapIcon />
            {t("lovable.testAndConnect")}
          </Button>
        </span>
      </div>
    </form>
  );
}
