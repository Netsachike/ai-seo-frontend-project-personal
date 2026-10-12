"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import adminService from "@/services/admin";
import type { AddNewUserFromAdminPayload } from "@/types/types";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddonsEditor } from "./addons-editor";
import { BillingSelect, PlanSelect, RoleSelect, StatusSelect } from "./user-fields";
import {
  buildAddonsPayload,
  createDefaultAddons,
  type AddonsState,
  type AdminPlan,
  type BillingType,
} from "./user-utils";

/** Create an account with its plan, billing type and add-ons. */
export function AddUserDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = React.useState<"details" | "subscriptions">("details");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("member");
  const [isActive, setIsActive] = React.useState(true);
  const [plan, setPlan] = React.useState<AdminPlan>("free");
  const [billingType, setBillingType] = React.useState<BillingType>("lifetime");
  const [addons, setAddons] = React.useState<AddonsState>(createDefaultAddons());

  function resetForm() {
    setActiveTab("details");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setRole("member");
    setIsActive(true);
    setPlan("free");
    setBillingType("lifetime");
    setAddons(createDefaultAddons());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast.error(t("toasts.detailsRequired"));
      return;
    }

    const payload: AddNewUserFromAdminPayload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      password,
      role,
      is_active: isActive,
      plan,
      billing_type: billingType,
      addons: buildAddonsPayload(addons),
    };

    setIsSubmitting(true);
    try {
      const response = await adminService.addNewUserFromAdmin(payload);
      toast.success(response.message || t("toasts.created"));
      await onCreated();
      resetForm();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const close = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-[640px]">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("add.title")}</DialogTitle>
            <DialogDescription>{t("add.body")}</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList variant="segmented">
              <TabsTrigger value="details">{t("tabs.details")}</TabsTrigger>
              <TabsTrigger value="subscriptions">{t("tabs.subscription")}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" forceMount className="data-[state=inactive]:hidden">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("fields.firstName")}>
                  {(props) => <Input {...props} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
                </FormField>
                <FormField label={t("fields.lastName")}>
                  {(props) => <Input {...props} value={lastName} onChange={(e) => setLastName(e.target.value)} />}
                </FormField>
                <FormField label={t("fields.email")}>
                  {(props) => (
                    <Input {...props} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
                  )}
                </FormField>
                <RoleSelect value={role} onChange={setRole} />
                <StatusSelect active={isActive} onChange={setIsActive} />
                <FormField label={t("fields.password")}>
                  {(props) => (
                    <PasswordInput
                      {...props}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                </FormField>
              </div>
            </TabsContent>

            <TabsContent value="subscriptions" forceMount className="flex flex-col gap-4 data-[state=inactive]:hidden">
              <div className="grid gap-4 sm:grid-cols-2">
                <PlanSelect value={plan} onChange={setPlan} />
                <BillingSelect value={billingType} onChange={setBillingType} />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-small font-medium text-fg">{t("addons.title")}</p>
                <AddonsEditor value={addons} onChange={setAddons} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={close}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {t("add.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
