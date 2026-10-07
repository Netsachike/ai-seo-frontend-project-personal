"use client";

import * as React from "react";
import { InfoIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Markets Orbit can research. ISO 3166-1 alpha-2. */
const COUNTRIES = [
  "US", "GB", "CA", "AU", "NZ", "IE", "DE", "AT", "CH", "FR", "BE", "NL", "ES", "PT", "IT", "SE", "NO", "DK",
  "FI", "PL", "CZ", "RO", "GR", "TR", "AE", "SA", "QA", "EG", "IL", "IN", "PK", "SG", "MY", "ID", "PH", "JP",
  "KR", "CN", "HK", "TW", "BR", "MX", "AR", "CO", "CL", "ZA", "NG", "KE", "GH",
] as const;
/** Writing languages. BCP-47. */
const LANGUAGES = [
  "en", "es", "fr", "de", "pt", "it", "nl", "sv", "no", "da", "fi", "pl", "cs", "ro", "el", "tr", "ar", "he",
  "hi", "ur", "id", "ms", "tl", "ja", "ko", "zh", "sw",
] as const;

/** Section 3: where the audience is and what language Orbit writes in. Prefilled from the crawl. */
export function LanguageFields({
  defaults,
  saving,
  onContinue,
}: {
  defaults: { country: string; language: string };
  saving?: boolean;
  onContinue: (value: { country: string; language: string }) => void;
}) {
  const t = useTranslations("siteSetup.details");
  const locale = useLocale();
  const [country, setCountry] = React.useState(defaults.country);
  const [language, setLanguage] = React.useState(defaults.language);
  const hintId = React.useId();

  const sorted = React.useCallback(
    (codes: readonly string[], type: "region" | "language") => {
      const names = new Intl.DisplayNames([locale], { type });
      // Keep a prefilled code that isn't in the list, so the select never shows blank.
      const all = codes.includes(type === "region" ? defaults.country : defaults.language)
        ? codes
        : [...codes, type === "region" ? defaults.country : defaults.language];
      return all
        .map((code) => ({ code, name: names.of(code) ?? code }))
        .sort((a, b) => a.name.localeCompare(b.name, locale));
    },
    [locale, defaults.country, defaults.language],
  );
  const countries = React.useMemo(() => sorted(COUNTRIES, "region"), [sorted]);
  const languages = React.useMemo(() => sorted(LANGUAGES, "language"), [sorted]);

  return (
    <div className="flex flex-col gap-5 px-6 pb-6">
      <div className="flex flex-col gap-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("country")}>
            {(props) => (
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger {...props} aria-describedby={hintId} className="h-12 w-full text-body-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label={t("language")}>
            {(props) => (
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger {...props} aria-describedby={hintId} className="h-12 w-full text-body-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>
        <p id={hintId} className="flex items-start gap-1.5 text-small text-warning">
          <InfoIcon aria-hidden className="mt-px size-4 shrink-0" />
          {t("localeHint")}
        </p>
      </div>
      <Button variant="primary" size="lg" loading={saving} onClick={() => onContinue({ country, language })}>
        {t("continue")}
      </Button>
    </div>
  );
}
