"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import adminService from "@/services/admin";
import type { UpdateAddonsPayload, UpdateNewUserFromAdminPayload, User } from "@/types/shared";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddonsEditor } from "./addons-editor";
import { BillingSelect, PlanSelect, RoleSelect, StatusSelect } from "./user-fields";
import {
  createDefaultAddons,
  getUserDisplayName,
  readAddons,
  readSubscription,
  type AddonsState,
  type AdminPlan,
  type BillingType,
} from "./user-utils";

type EditTab = "details" | "subscriptions" | "addons" | "password";

/**
 * Edit an account in four parts, each saved on its own: details and plan go
 * through `updateNewUserFromAdmin` (add-ons excluded), add-ons through
 * `updateAddons`, and the password through its own endpoint.
 */
export function EditUserDialog({
  isOpen,
  user,
  onClose,
  onUpdated,
}: {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const t = useTranslations("admin.users");
  const [activeTab, setActiveTab] = React.useState<EditTab>("details");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("member");
  const [isActive, setIsActive] = React.useState(true);
  const [plan, setPlan] = React.useState<AdminPlan>("free");
  const [billingType, setBillingType] = React.useState<BillingType>("lifetime");
  const [addons, setAddons] = React.useState<AddonsState>(createDefaultAddons());
  const [password, setPassword] = React.useState("");
  const [passwordConfirmation, setPasswordConfirmation] = React.useState("");

  // Load the user into the form each time the dialog opens for them.
  const [loadedFor, setLoadedFor] = React.useState<User | null>(null);
  if (isOpen && user && loadedFor !== user) {
    setLoadedFor(user);
    setActiveTab("details");
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setEmail(user.email ?? "");
    setRole(user.role ?? "member");
    setIsActive(Number(user.is_active) === 1);
    setPassword("");
    setPasswordConfirmation("");
    const subscription = readSubscription(user);
    setPlan(subscription.plan);
    setBillingType(subscription.billingType);
    setAddons(readAddons(user));
  }
  if (!isOpen && loadedFor) setLoadedFor(null);

  if (!user) return null;

  async function submitUserDetails(successMessage: string) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const payload: UpdateNewUserFromAdminPayload = {
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        role,
        is_active: isActive,
        plan,
        billing_type: billingType,
        // Add-ons are saved in their own tab through updateAddons.
        addons: null,
      };
      const response = await adminService.updateNewUserFromAdmin(payload);
      toast.success(response.message || successMessage);
      await onUpdated();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.updateFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddonsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const payload: UpdateAddonsPayload = {
        user_id: user.id,
        addons: {
          remove_branding: { status: addons.remove_branding.enabled, type: addons.remove_branding.type },
          reseller_seats: { status: addons.reseller_seats.enabled, limit: addons.reseller_seats.limit },
        },
      };
      const response = await adminService.updateAddons(payload);
      toast.success(response.message || t("toasts.addonsUpdated"));
      await onUpdated();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.addonsFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!password || !passwordConfirmation) {
      toast.error(t("toasts.passwordRequired"));
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error(t("toasts.passwordMismatch"));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await adminService.updateUserPassword({
        user_id: user.id,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success(response.message || t("toasts.passwordUpdated"));
      setPassword("");
      setPasswordConfirmation("");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.passwordFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitRow = (label: string) => (
    <div className="flex justify-end">
      <Button type="submit" variant="primary" loading={isSubmitting}>
        {label}
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{getUserDisplayName(user)}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EditTab)}>
          <TabsList variant="segmented" className="w-full [&>*]:flex-1">
            <TabsTrigger value="details">{t("tabs.details")}</TabsTrigger>
            <TabsTrigger value="subscriptions">{t("tabs.subscription")}</TabsTrigger>
            <TabsTrigger value="addons">{t("tabs.addons")}</TabsTrigger>
            <TabsTrigger value="password">{t("tabs.password")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitUserDetails(t("toasts.detailsUpdated"));
              }}
            >
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
              </div>
              {submitRow(t("edit.saveDetails"))}
            </form>
          </TabsContent>

          <TabsContent value="subscriptions">
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitUserDetails(t("toasts.subscriptionUpdated"));
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <PlanSelect value={plan} onChange={setPlan} />
                <BillingSelect value={billingType} onChange={setBillingType} />
              </div>
              {submitRow(t("edit.saveSubscription"))}
            </form>
          </TabsContent>

          <TabsContent value="addons">
            <form className="flex flex-col gap-4" onSubmit={handleAddonsSubmit}>
              <AddonsEditor value={addons} onChange={setAddons} />
              {submitRow(t("edit.saveAddons"))}
            </form>
          </TabsContent>

          <TabsContent value="password">
            <form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
              <FormField label={t("fields.newPassword")}>
                {(props) => (
                  <PasswordInput
                    {...props}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </FormField>
              <FormField label={t("fields.confirmPassword")}>
                {(props) => (
                  <PasswordInput
                    {...props}
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                  />
                )}
              </FormField>
              {submitRow(t("edit.savePassword"))}
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
