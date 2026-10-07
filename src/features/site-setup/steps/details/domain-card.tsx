"use client";

import * as React from "react";
import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { DomainInput } from "@/components/forms/form-field";
import { SiteFavicon } from "@/components/layout/site-favicon";
import { Button } from "@/components/ui/button";
import { domainSchema } from "../../steps";

/**
 * The site being set up. Sits exactly where the domain field was on the
 * previous screen, so nothing jumps. The pencil only appears once analysis
 * has started; saving a new domain starts the analysis again.
 */
export function DomainCard({
  domain,
  faviconUrl,
  editable,
  onChangeDomain,
}: {
  domain: string;
  faviconUrl?: string | null;
  editable: boolean;
  /** Resolves to an error message, or null when saved. */
  onChangeDomain?: (domain: string) => Promise<string | null>;
}) {
  const t = useTranslations("siteSetup.details");
  const [draft, setDraft] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const parsed = draft === null ? null : domainSchema.safeParse(draft);

  if (draft !== null) {
    return (
      <form
        className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!parsed?.success || !onChangeDomain) return;
          if (parsed.data === domain) return setDraft(null);
          setSaving(true);
          const failure = await onChangeDomain(parsed.data);
          setSaving(false);
          if (failure) setError(failure);
          else setDraft(null);
        }}
      >
        <DomainInput
          size="lg"
          aria-label={t("domainLabel")}
          aria-invalid={error ? true : undefined}
          value={draft}
          onChange={(value) => {
            setDraft(value);
            setError(null);
          }}
          autoFocus
        />
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!parsed?.success}>
            {t("saveDomain")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-xl bg-surface-2 px-5 py-4">
      <SiteFavicon src={faviconUrl} name={domain} size={44} />
      <span dir="ltr" className="min-w-0 flex-1 truncate text-start text-h2 font-medium text-fg">
        {domain}
      </span>
      {editable && onChangeDomain && (
        <Button variant="ghost" size="icon" aria-label={t("editDomain")} onClick={() => setDraft(domain)}>
          <PencilIcon />
        </Button>
      )}
    </div>
  );
}
