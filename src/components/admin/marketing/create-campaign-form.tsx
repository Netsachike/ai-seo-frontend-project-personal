"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon, SearchIcon, SendIcon, UploadIcon, UserIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import adminService from "@/services/admin";
import EmailMarketingService from "@/services/email-marketing";
import type { createEmailCampaignPayload, User as UserType } from "@/types/types";
import { accountKeys } from "@/features/account/query-keys";
import { ArticleEditor } from "@/components/editor/article-editor";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type CampaignType = "individual" | "bulk" | "bulk_import";

type FormState = {
  name: string;
  subject: string;
  type: CampaignType;
  recipient: string;
  file: File | null;
  content: string;
};

const initialFormState: FormState = {
  name: "",
  subject: "",
  type: "individual",
  recipient: "",
  file: null,
  content: "",
};

function userDisplayName(user: UserType) {
  const fallback = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return user.name || fallback || user.email;
}

/**
 * Compose and send an email campaign: one recipient (searchable), every user
 * (bulk), or a CSV/TXT list. The body is written in Rankoya's rich-text editor.
 */
export function CreateCampaignForm({ onSent }: { onSent?: () => void }) {
  const t = useTranslations("admin.marketing.create");
  const tType = useTranslations("admin.marketing.types");
  const format = useFormatter();
  const [form, setForm] = React.useState<FormState>(initialFormState);
  const [editorKey, setEditorKey] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showRecipientDropdown, setShowRecipientDropdown] = React.useState(false);
  const [recipientTerm, setRecipientTerm] = React.useState("");
  const [recipientPage, setRecipientPage] = React.useState(1);
  const inputContainerRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Debounced recipient search term.
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecipientTerm(form.recipient.trim());
      setRecipientPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.recipient]);

  const isRecipientSearchMode = recipientTerm.length > 0;

  const recipients = useQuery({
    queryKey: [...accountKeys.all, "admin", "recipients", recipientTerm, recipientPage],
    enabled: form.type === "individual" && showRecipientDropdown,
    retry: false,
    queryFn: async () => {
      try {
        if (recipientTerm) {
          const searched = await adminService.searchAllUsers(recipientTerm);
          const query = recipientTerm.toLowerCase();
          const users = searched.filter((user) => {
            const name = userDisplayName(user).toLowerCase();
            return (
              name.includes(query) ||
              user.email.toLowerCase().includes(query) ||
              (user.role ?? "").toLowerCase().includes(query)
            );
          });
          return { users, page: 1, lastPage: 1, total: users.length };
        }
        const paged = await adminService.getAllUsers(recipientPage);
        if (Array.isArray(paged)) return { users: paged, page: 1, lastPage: 1, total: paged.length };
        return {
          users: paged.data ?? [],
          page: paged.current_page || recipientPage,
          lastPage: paged.last_page || 1,
          total: paged.total || 0,
        };
      } catch (error) {
        toast.error(getErrorMessage(error, t("errors.usersLoad")));
        throw error;
      }
    },
  });

  // Every user, for a bulk send.
  const bulkUsers = useQuery({
    queryKey: [...accountKeys.all, "admin", "bulk-recipients"],
    enabled: form.type === "bulk",
    retry: false,
    queryFn: async () => {
      try {
        const allUsers = await adminService.getAllUsers();
        return (Array.isArray(allUsers) ? allUsers : allUsers.data) ?? [];
      } catch (error) {
        toast.error(getErrorMessage(error, t("errors.subscribersLoad")));
        throw error;
      }
    },
  });

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputContainerRef.current && !inputContainerRef.current.contains(event.target as Node)) {
        setShowRecipientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function resetForm() {
    setForm(initialFormState);
    setEditorKey((key) => key + 1);
    setShowRecipientDropdown(false);
    setRecipientPage(1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) return void toast.error(t("errors.name"));
    if (form.subject.trim().length < 5) return void toast.error(t("errors.subject"));
    if (form.content.trim().length < 20) return void toast.error(t("errors.content"));
    if (form.type === "individual" && !form.recipient.trim()) return void toast.error(t("errors.recipient"));
    if (form.type === "bulk_import" && !form.file) return void toast.error(t("errors.file"));

    setIsSubmitting(true);
    try {
      const payload: createEmailCampaignPayload = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        type: form.type,
        content: form.content,
      };

      if (form.type === "individual") {
        payload.recipient = form.recipient.trim();
        payload.bulk_recipients = form.recipient.trim() ? [form.recipient.trim()] : [];
      } else if (form.type === "bulk") {
        let emails = (bulkUsers.data ?? []).map((item) => item.email).filter(Boolean);
        if (emails.length === 0) {
          const dashboardData = await adminService.getAdminDashboardData();
          emails = (dashboardData.users?.data ?? []).map((item) => item.email).filter(Boolean);
        }
        payload.bulk_recipients = emails;
      } else if (form.type === "bulk_import" && form.file) {
        payload.file = form.file;
      }

      await EmailMarketingService.createEmailCampaign(payload);
      toast.success(t("sent"));
      resetForm();
      onSent?.();
    } catch (error) {
      toast.error(getErrorMessage(error, t("errors.send")));
    } finally {
      setIsSubmitting(false);
    }
  }

  const recipientUsers = recipients.data?.users ?? [];
  const typeIcons: Record<CampaignType, React.ComponentType<{ className?: string }>> = {
    individual: UserIcon,
    bulk: UsersIcon,
    bulk_import: UploadIcon,
  };

  return (
    <Card className="gap-6">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-h3 text-fg">{t("title")}</h2>
        <p className="text-small text-fg-2">{t("description")}</p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label={t("name")}>
            {(props) => (
              <Input
                {...props}
                value={form.name}
                placeholder={t("namePlaceholder")}
                onChange={(event) => updateForm("name", event.target.value)}
              />
            )}
          </FormField>
          <FormField label={t("subject")}>
            {(props) => (
              <Input
                {...props}
                value={form.subject}
                placeholder={t("subjectPlaceholder")}
                onChange={(event) => updateForm("subject", event.target.value)}
              />
            )}
          </FormField>
        </div>

        <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
          <legend className="px-1 text-small font-medium text-fg">{t("audience")}</legend>
          <ToggleGroup
            type="single"
            value={form.type}
            onValueChange={(value) => value && updateForm("type", value as CampaignType)}
            className="flex-wrap justify-start"
          >
            {(Object.keys(typeIcons) as CampaignType[]).map((type) => {
              const Icon = typeIcons[type];
              return (
                <ToggleGroupItem key={type} value={type}>
                  <Icon className="size-4" />
                  {tType(type)}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>

          {form.type === "individual" && (
            <FormField label={t("recipient")}>
              {(props) => (
                <div className="relative" ref={inputContainerRef}>
                  <SearchIcon
                    aria-hidden
                    className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-3"
                  />
                  <Input
                    {...props}
                    role="combobox"
                    aria-expanded={showRecipientDropdown}
                    aria-controls={listboxId}
                    autoComplete="off"
                    className="ps-9"
                    value={form.recipient}
                    placeholder={t("recipientPlaceholder")}
                    onFocus={() => setShowRecipientDropdown(true)}
                    onKeyDown={(event) => event.key === "Escape" && setShowRecipientDropdown(false)}
                    onChange={(event) => {
                      updateForm("recipient", event.target.value);
                      setShowRecipientDropdown(true);
                    }}
                  />
                  {showRecipientDropdown && (
                    <div className="absolute inset-x-0 z-50 mt-1 max-h-[280px] overflow-y-auto rounded-lg bg-surface shadow-pop">
                      <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 text-caption text-fg-3">
                        {isRecipientSearchMode ? (
                          <span>{t("results", { count: format.number(recipients.data?.total ?? 0, "integer") })}</span>
                        ) : (
                          <>
                            <span className="num">
                              {t("page", {
                                page: recipients.data?.page ?? recipientPage,
                                last: recipients.data?.lastPage ?? 1,
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={recipients.isFetching || recipientPage <= 1}
                                onClick={() => setRecipientPage((page) => page - 1)}
                              >
                                {t("prev")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={recipients.isFetching || recipientPage >= (recipients.data?.lastPage ?? 1)}
                                onClick={() => setRecipientPage((page) => page + 1)}
                              >
                                {t("next")}
                              </Button>
                            </span>
                          </>
                        )}
                      </div>
                      {recipients.isFetching ? (
                        <p className="flex items-center justify-center gap-2 p-4 text-small text-fg-2">
                          <Loader2Icon aria-hidden className="size-4 animate-spin" />
                          {t("searching")}
                        </p>
                      ) : recipientUsers.length > 0 ? (
                        <ul id={listboxId} role="listbox" className="py-1">
                          {recipientUsers.map((user) => (
                            <li key={user.id} role="option" aria-selected={form.recipient === user.email}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start hover:bg-surface-2"
                                onClick={() => {
                                  updateForm("recipient", user.email);
                                  setShowRecipientDropdown(false);
                                }}
                              >
                                <span className="truncate text-small text-fg">{userDisplayName(user)}</span>
                                <span dir="ltr" className="truncate text-caption text-fg-3">
                                  {user.email}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="p-4 text-center text-small text-fg-2">{t("noUsers")}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </FormField>
          )}

          {form.type === "bulk_import" && (
            <FormField label={t("upload")} helper={t("uploadHelper")}>
              {(props) => (
                <Input
                  {...props}
                  type="file"
                  accept=".csv,.txt"
                  className="h-auto py-2 file:me-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2.5 file:py-1 file:text-small file:font-medium file:text-fg"
                  onChange={(event) => updateForm("file", event.target.files?.[0] ?? null)}
                />
              )}
            </FormField>
          )}

          {form.type === "bulk" && (
            <p className="flex items-center gap-2 rounded-md bg-bg px-3 py-2.5 text-small text-fg-2">
              <UsersIcon aria-hidden className="size-4 shrink-0" />
              {bulkUsers.isFetching
                ? t("bulkCalculating")
                : t.rich("bulkCount", {
                    count: bulkUsers.data?.length ?? 0,
                    formatted: format.number(bulkUsers.data?.length ?? 0, "integer"),
                    strong: (chunks) => <strong className="font-semibold text-fg">{chunks}</strong>,
                  })}
            </p>
          )}
        </fieldset>

        <Tabs defaultValue="edit" className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-small font-medium text-fg">{t("content")}</p>
            <TabsList variant="segmented">
              <TabsTrigger value="edit">{t("edit")}</TabsTrigger>
              <TabsTrigger value="preview">{t("preview")}</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="edit" forceMount className="data-[state=inactive]:hidden">
            <ArticleEditor
              key={editorKey}
              content={form.content}
              lang="en"
              label={t("content")}
              onChange={(_text, html) => updateForm("content", html)}
            />
          </TabsContent>
          <TabsContent value="preview">
            {form.content.trim() ? (
              <iframe
                title={t("preview")}
                sandbox=""
                srcDoc={`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;color:#111;margin:24px;line-height:1.55">${form.content}</body>`}
                className="h-[420px] w-full rounded-lg border border-border bg-white"
              />
            ) : (
              <p className="grid h-48 place-items-center rounded-lg border border-dashed border-border-strong text-small text-fg-3">
                {t("nothingToPreview")}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={resetForm}>
            {t("discard")}
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            <SendIcon className="rtl:-scale-x-100" />
            {t("send")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
