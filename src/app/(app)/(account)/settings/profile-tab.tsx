"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { getSessionUserFromCookie, writeSessionUserCookie } from "@/lib/auth-session";
import accountService from "@/services/account";
import { LOCAL_UPLOAD_MAX_BYTES } from "@/lib/plan";
import { clearProfileImage, setProfileImage, useProfileImage } from "@/lib/profile-image";
import UploadService from "@/services/upload";
import { useSessionUser } from "@/features/account/use-session-user";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { UserAvatar } from "@/components/layout/avatars";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Photo, name and password. The photo uploads to the backend (its URL is
 * kept on this device). Name and password save through `/user/update-name`
 * and `/user/update-password`; the email can't be changed here.
 */
export function ProfileTab() {
  const session = useSessionUser();
  if (session === undefined) {
    return (
      <div className="flex max-w-2xl flex-col gap-5">
        <Skeleton className="h-28" />
        <Skeleton className="h-56" />
      </div>
    );
  }
  return (
    <ProfileForms
      key={session?.id ?? "none"}
      fullName={session?.fullName ?? ""}
      firstName={session?.firstName ?? ""}
      lastName={session?.lastName ?? ""}
      email={session?.email ?? ""}
    />
  );
}

function ProfileForms({
  fullName: initialName,
  firstName: initialFirst,
  lastName: initialLast,
  email: initialEmail,
}: {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
}) {
  const t = useTranslations("account.profile");
  const [first, setFirst] = React.useState(initialFirst);
  const [last, setLast] = React.useState(initialLast);
  const [savingName, setSavingName] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const nameChanged = first.trim() !== initialFirst || last.trim() !== initialLast;

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (!first.trim() || !last.trim() || savingName) return;
    setSavingName(true);
    try {
      await accountService.updateName({ first_name: first.trim(), last_name: last.trim() });
      const session = getSessionUserFromCookie();
      if (session)
        writeSessionUserCookie({
          ...session,
          firstName: first.trim(),
          lastName: last.trim(),
          fullName: `${first.trim()} ${last.trim()}`,
        });
      toast.success(t("details.saved"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("details.failed")));
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (savingPassword) return;
    setPasswordError(null);
    if (password.length < 8) return setPasswordError(t("password.tooShort"));
    if (password !== confirm) return setPasswordError(t("password.mismatch"));
    setSavingPassword(true);
    try {
      await accountService.updatePassword({ password, password_confirmation: confirm });
      setPassword("");
      setConfirm("");
      toast.success(t("password.updated"));
    } catch (error) {
      setPasswordError(getErrorMessage(error, t("password.tooWeak")));
    } finally {
      setSavingPassword(false);
    }
  }
  const format = useFormatter();
  const profileImage = useProfileImage();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const maxSize = format.number(LOCAL_UPLOAD_MAX_BYTES / (1024 * 1024), "integer");

  // Gifs go through the gif endpoint, everything else through the image one.
  async function handleProfileImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so re-picking the same file still fires a change event.
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
      const { url } = isGif ? await UploadService.uploadGif(file) : await UploadService.uploadImage(file);
      if (!url) throw new Error(t("photo.noUrl"));
      setProfileImage(url);
      toast.success(t("photo.updated"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("photo.failed")));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar name={initialName || initialEmail} src={profileImage} size={64} className="text-h3" />
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" loading={isUploading} onClick={() => fileInputRef.current?.click()}>
                {t("photo.change")}
              </Button>
              {profileImage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    clearProfileImage();
                    toast.success(t("photo.removed"));
                  }}
                >
                  {t("photo.remove")}
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              tabIndex={-1}
              aria-label={t("photo.change")}
              onChange={handleProfileImageChange}
            />
            <p className="text-caption font-normal text-fg-3">{t("photo.helper", { size: maxSize })}</p>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={saveName} noValidate className="flex flex-col gap-4">
          <CardHeader>
            <CardTitle>{t("details.title")}</CardTitle>
            <CardDescription>{t("details.description")}</CardDescription>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("details.firstName")}>
              {(props) => (
                <Input {...props} value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
              )}
            </FormField>
            <FormField label={t("details.lastName")}>
              {(props) => (
                <Input {...props} value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
              )}
            </FormField>
            <FormField label={t("details.email")} helper={t("details.emailHelp")} className="sm:col-span-2">
              {(props) => <Input {...props} type="email" dir="ltr" readOnly value={initialEmail} />}
            </FormField>
          </div>
          <Button
            type="submit"
            variant="primary"
            className="self-start"
            loading={savingName}
            disabled={!nameChanged || !first.trim() || !last.trim()}
          >
            {t("details.save")}
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={savePassword} noValidate className="flex flex-col gap-4">
          <CardHeader>
            <CardTitle>{t("password.title")}</CardTitle>
            <CardDescription>{t("password.description")}</CardDescription>
          </CardHeader>
          {passwordError && (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-small text-danger">
              {passwordError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("password.new")}>
              {(props) => (
                <PasswordInput
                  {...props}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              )}
            </FormField>
            <FormField label={t("password.confirm")}>
              {(props) => (
                <PasswordInput
                  {...props}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              )}
            </FormField>
          </div>
          <Button
            type="submit"
            variant="primary"
            className="self-start"
            loading={savingPassword}
            disabled={!password || !confirm}
          >
            {t("password.submit")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
