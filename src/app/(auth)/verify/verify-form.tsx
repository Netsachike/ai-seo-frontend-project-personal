"use client";

import * as React from "react";
import Link from "next/link";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ONBOARDING_START, fakeRequest, startSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/forms/form-field";
import { PasswordHints, PasswordInput, passwordIsValid } from "@/components/forms/password-input";
import { AuthHeading, FormAlert } from "../auth-ui";

/** UI stage: this code is accepted; anything else shows the error state. */
const DEMO_CODE = "123456";
const RESEND_SECONDS = 30;

export function VerifyForm({ email, purpose }: { email: string; purpose: "signup" | "reset" }) {
  const t = useTranslations("auth.verify");
  const tErr = useTranslations("auth.errors");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [codeError, setCodeError] = React.useState<string>();
  const [passwordError, setPasswordError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(RESEND_SECONDS);
  const codeId = React.useId();
  const hintsId = React.useId();
  const reset = purpose === "reset";

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (value = code) => {
    setCodeError(undefined);
    setPasswordError(undefined);
    if (value.length < 6) return setCodeError(tErr("codeIncomplete"));
    if (reset && !passwordIsValid(password)) return setPasswordError(tErr("passwordWeak"));
    setPending(true);
    await fakeRequest();
    setPending(false);
    if (value !== DEMO_CODE) {
      setCode("");
      return setCodeError(tErr("codeInvalid"));
    }
    startSession();
    window.location.assign(ONBOARDING_START);
  };

  const resend = async () => {
    setCooldown(RESEND_SECONDS);
    await fakeRequest(400);
    toast(t("resent", { email }));
  };

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={reset ? t("titleReset") : t("title")}
        description={t.rich("description", {
          email,
          strong: (chunks) => (
            <strong dir="ltr" className="font-medium break-words text-fg">
              {chunks}
            </strong>
          ),
        })}
      />
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={codeId}>{t("code")}</Label>
          <div dir="ltr">
            <InputOTP
              id={codeId}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              disabled={pending}
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? `${codeId}-error` : undefined}
              onChange={(value) => {
                setCode(value);
                setCodeError(undefined);
              }}
              onComplete={(value: string) => {
                if (!reset) void submit(value);
              }}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot key={i} index={i} aria-invalid={codeError ? true : undefined} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          {codeError && (
            <p id={`${codeId}-error`} role="alert" className="text-[12px] leading-4 text-danger">
              {codeError}
            </p>
          )}
        </div>

        {reset && (
          <FormField label={t("newPassword")} error={passwordError}>
            {(props) => (
              <div className="flex flex-col gap-2.5">
                <PasswordInput
                  {...props}
                  size="lg"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={[props["aria-describedby"], hintsId].filter(Boolean).join(" ")}
                />
                <PasswordHints id={hintsId} value={password} />
              </div>
            )}
          </FormField>
        )}

        {codeError === tErr("codeInvalid") && <FormAlert>{t("demoHint")}</FormAlert>}

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
          {reset ? t("submitReset") : t("submit")}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3">
        <p className="text-body text-fg-2" aria-live="polite">
          {cooldown > 0 ? (
            t("resendIn", { seconds: cooldown })
          ) : (
            <Button variant="link" onClick={resend}>
              {t("resend")}
            </Button>
          )}
        </p>
        <Link
          href={reset ? "/forgot-password" : "/sign-up"}
          className="inline-flex items-center gap-1.5 text-body font-medium text-blue hover:underline"
        >
          <ArrowLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
          {t("wrongEmail")}
        </Link>
      </div>
    </div>
  );
}
