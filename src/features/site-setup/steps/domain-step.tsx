"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { siteKeys, workspaceKeys } from "@/lib/api/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { useUiStore } from "@/lib/store/ui";
import crawlerService from "@/services/crawler";
import siteService from "@/services/sites";
import workspaceService from "@/services/workspaces";
import { useWorkspaces } from "@/features/workspace/hooks";
import { countryName, nameFromDomain } from "@/features/sites/site-utils";
import { localeFromDomain } from "../detect-locale";
import { setSetupStep } from "../progress";
import { patchDraft } from "../store";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { domainSchema, setupPath } from "../steps";
import { LocaleSelects } from "./details/language-fields";
import { StepHeading } from "./step-heading";

const schema = z.object({ domain: domainSchema });

/**
 * Step 2a. The domain, country and language become a site (`POST /sites`), which starts its first
 * crawl. Continue stays disabled until the domain is valid; a pasted URL is
 * accepted and trimmed to its host. Errors show under the field, never as a
 * toast. Sites are created in the backend's active workspace, so picking
 * another workspace activates it first.
 */
export function DomainStep() {
  const t = useTranslations("siteSetup.domain");
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const workspaces = useWorkspaces();
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(params.get("workspace"));
  const list = workspaces.data?.list ?? [];
  const active = workspaces.data?.active;
  const target = list.find((w) => String(w.work_space_id) === workspaceId) ?? active;

  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { domain: params.get("domain") ?? "" },
  });
  const { isValid, isSubmitting, errors } = form.formState;
  const domain = useWatch({ control: form.control, name: "domain" });
  // Follows the domain's TLD until the user picks one themselves.
  const [picked, setPicked] = React.useState<{ country?: string; language?: string }>({});
  const guess = localeFromDomain(domain);
  const country = picked.country ?? guess.country;
  const language = picked.language ?? guess.language;

  const submit = form.handleSubmit(async (values) => {
    if (!target) return;
    try {
      if (target.work_space_id !== active?.work_space_id) {
        await workspaceService.activateWorkspace({ id: target.work_space_id });
        await queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      }
      const { data: site } = await siteService.create({
        name: nameFromDomain(values.domain),
        url: `https://${values.domain}`,
        // Only creation takes these; there's no endpoint to change them later.
        // The backend wants the country's name ("United States"), not its code.
        country: countryName(country),
        language,
      });
      patchDraft(site.id, { country, language });
      // The crawl feeds keywords, topics and the site audit; it runs while setup continues.
      void crawlerService
        .start(site.id)
        .then(({ data: run }) => patchDraft(site.id, { crawlRunId: run.id }))
        .catch(() => undefined);
      setSetupStep(site.id, "details");
      await queryClient.invalidateQueries({ queryKey: siteKeys.all });
      useUiStore.getState().setWorkspace(String(target.work_space_id));
      // The only real navigation in setup; the shell stays mounted through it.
      router.replace(setupPath(site.id, "details"));
    } catch (error) {
      form.setError("domain", { message: getErrorMessage(error, t("failed")) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <StepHeading title={t("title")} description={t("description")} />

      {list.length > 1 && target && (
        <FormField label={t("workspace")}>
          {(props) => (
            <Select value={String(target.work_space_id)} onValueChange={setWorkspaceId}>
              <SelectTrigger {...props} className="h-12 w-full text-body-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {list.map((w) => (
                  <SelectItem key={w.work_space_id} value={String(w.work_space_id)}>
                    {w.workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      )}

      <FormField
        label={t("label")}
        // A half-typed domain just keeps Continue disabled; only server answers show here.
        error={errors.domain?.type === "manual" ? errors.domain.message : undefined}
      >
        {(props) => (
          <DomainInput
            {...props}
            size="lg"
            autoFocus
            placeholder={t("placeholder")}
            value={domain}
            onChange={(value) => form.setValue("domain", value, { shouldValidate: true, shouldDirty: true })}
          />
        )}
      </FormField>

      <LocaleSelects
        country={country}
        language={language}
        onCountryChange={(code) => setPicked((p) => ({ ...p, country: code }))}
        onLanguageChange={(code) => setPicked((p) => ({ ...p, language: code }))}
        hint={t("localeHint")}
      />

      <Button type="submit" variant="primary" size="lg" disabled={!isValid || !target} loading={isSubmitting}>
        {t("continue")}
      </Button>
    </form>
  );
}
