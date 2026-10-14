"use client";

import * as React from "react";
import { BookOpenIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PRODUCT } from "@/config/product";
import { useBrandConfig } from "@/components/providers/brand-provider";

/**
 * No ticket endpoint yet: both forms open the user's email app with the
 * message filled in, addressed to the tenant's support mailbox (or Rankoya's).
 */
function useSupportMail() {
  const { brandConfig } = useBrandConfig();
  const to = brandConfig.support_email ?? PRODUCT.supportEmail;
  return (subject: string, body: string) => {
    window.location.assign(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };
}
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";

const SUPPORT_WIDGET = process.env.NEXT_PUBLIC_SUPPORT_WIDGET === "enabled";
const DOCS = ["gettingStarted", "visibility", "approvals", "telegram"] as const;

/** Docs links and a ticket form. A third-party widget can replace the form behind a flag later. */
export function HelpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("shell.help");
  const mail = useSupportMail();
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [errors, setErrors] = React.useState<{ subject?: string; message?: string }>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = {
      subject: subject.trim() ? undefined : t("subjectRequired"),
      message: message.trim() ? undefined : t("messageRequired"),
    };
    setErrors(next);
    if (next.subject || next.message) return;
    mail(subject.trim(), message.trim());
    setSubject("");
    setMessage("");
    onOpenChange(false);
    toast.success(t("sent"));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="max-w-[440px]!">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-5">
          <section className="flex flex-col gap-2">
            <h3 className="text-overline text-fg-3">{t("docsTitle")}</h3>
            <ul className="flex flex-col">
              {DOCS.map((key) => (
                <li key={key}>
                  <a
                    href="#"
                    className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-body text-fg hover:bg-surface-2"
                  >
                    <BookOpenIcon aria-hidden className="size-4 text-fg-3" />
                    <span className="flex-1">{t(`docs.${key}`)}</span>
                    <SquareArrowOutUpRightIcon aria-hidden className="size-3.5 text-fg-3 rtl:-scale-x-100" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
          {SUPPORT_WIDGET ? null : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-h3">{t("ticketTitle")}</h3>
                <p className="text-small text-fg-2">{t("ticketDescription")}</p>
              </div>
              <FormField label={t("subject")} error={errors.subject}>
                {(props) => (
                  <Input {...props} value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} />
                )}
              </FormField>
              <FormField label={t("message")} error={errors.message} helper={t("messageHelper")}>
                {(props) => (
                  <Textarea
                    {...props}
                    rows={5}
                    value={message}
                    maxLength={4000}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                )}
              </FormField>
              <Button type="submit" variant="primary" className="self-start">
                {t("submit")}
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const FEEDBACK_TYPES = ["idea", "bug", "other"] as const;

export function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("shell.feedback");
  const tCommon = useTranslations("common");
  const mail = useSupportMail();
  const [type, setType] = React.useState<(typeof FEEDBACK_TYPES)[number]>("idea");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return setError(t("required"));
    mail(t("mailSubject", { type: t(`types.${type}`) }), message.trim());
    setMessage("");
    onOpenChange(false);
    toast.success(t("sent"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-small font-medium">{t("type")}</legend>
            <RadioGroup value={type} onValueChange={(v) => setType(v as typeof type)} className="flex flex-wrap gap-2">
              {FEEDBACK_TYPES.map((value) => (
                <label
                  key={value}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border-strong px-3 text-small has-data-[state=checked]:border-ink"
                >
                  <RadioGroupItem value={value} />
                  {t(`types.${value}`)}
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <FormField label={t("message")} error={error}>
            {(props) => (
              <Textarea
                {...props}
                rows={4}
                value={message}
                maxLength={2000}
                placeholder={t(`placeholders.${type}`)}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (error) setError(undefined);
                }}
              />
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary">
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
