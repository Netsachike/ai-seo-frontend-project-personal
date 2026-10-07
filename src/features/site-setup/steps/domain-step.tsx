"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { workspaceKeys } from "@/lib/api/query-keys";
import { createSite, MockError } from "@/lib/mocks/store";
import { useUiStore } from "@/lib/store/ui";
import { useWorkspaces } from "@/features/workspace/hooks";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { domainSchema, setupPath } from "../steps";
import { StepHeading } from "./step-heading";

const schema = z.object({ domain: domainSchema });

/**
 * Step 2a. One input turns into a site. Continue stays disabled until the
 * domain is valid; a pasted URL is accepted and trimmed to its host. Errors
 * show under the field, never as a toast.
 */
export function DomainStep() {
  const t = useTranslations("siteSetup.domain");
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const workspaces = useWorkspaces();
  const activeWorkspace = useUiStore((s) => s.workspaceId);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(params.get("workspace"));
  const list = workspaces.data ?? [];
  const target = list.find((w) => w.id === workspaceId) ?? list.find((w) => w.id === activeWorkspace) ?? list[0];

  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { domain: params.get("domain") ?? "" },
  });
  const { isValid, isSubmitting, errors } = form.formState;
  const domain = useWatch({ control: form.control, name: "domain" });

  const submit = form.handleSubmit(async (values) => {
    if (!target) return;
    try {
      const site = await createSite(target.id, values.domain);
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.brands(target.id) });
      useUiStore.getState().setWorkspace(target.id);
      // The only real navigation in setup; the shell stays mounted through it.
      router.replace(setupPath(site.id, "details"));
    } catch (error) {
      form.setError("domain", {
        message: error instanceof MockError && error.code === "site_exists" ? t("exists") : t("failed"),
      });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <StepHeading title={t("title")} description={t("description")} />

      {list.length > 1 && target && (
        <FormField label={t("workspace")}>
          {(props) => (
            <Select value={target.id} onValueChange={setWorkspaceId}>
              <SelectTrigger {...props} className="h-12 w-full text-body-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {list.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
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

      <Button type="submit" variant="primary" size="lg" disabled={!isValid || !target} loading={isSubmitting}>
        {t("continue")}
      </Button>
    </form>
  );
}
