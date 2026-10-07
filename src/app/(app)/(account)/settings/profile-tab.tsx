"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { LOCAL_UPLOAD_MAX_BYTES } from "@/lib/plan";
import { clearProfileImage, setProfileImage, useProfileImage } from "@/lib/profile-image";
import UploadService from "@/services/upload";
import { isDemoApi } from "@/services/api/api";
import { useSessionUser } from "@/features/account/use-session-user";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordStrength, getStrength } from "@/components/account/password-strength";
import { DemoAccountCard } from "@/components/account/demo-account-card";
import { UserAvatar } from "@/components/layout/avatars";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Photo, personal details and password. The backend has no profile or
 * password endpoints for this screen yet, so Save and Update show a
 * confirmation only, and the photo is kept on this device.
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
  return <ProfileForms key={session?.id ?? "none"} fullName={session?.fullName ?? ""} email={session?.email ?? ""} />;
}

function ProfileForms({ fullName: initialName, email: initialEmail }: { fullName: string; email: string }) {
  const t = useTranslations("account.profile");
  const format = useFormatter();
  const profileImage = useProfileImage();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const strengthId = React.useId();
  const [isUploading, setIsUploading] = React.useState(false);

  const [fullName, setFullName] = React.useState(initialName);
  const [email, setEmail] = React.useState(initialEmail);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const strength = getStrength(newPassword);
  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
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
          <UserAvatar name={fullName || email} src={profileImage} size={64} className="text-h3" />
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
        <CardHeader>
          <CardTitle>{t("details.title")}</CardTitle>
        </CardHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            toast.success(t("details.saved"));
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("details.fullName")}>
              {(props) => (
                <Input
                  {...props}
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              )}
            </FormField>
            <FormField label={t("details.email")}>
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              )}
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              {t("details.save")}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("password.title")}</CardTitle>
          <CardDescription>{t("password.description")}</CardDescription>
        </CardHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (passwordMismatch || strength < 4) {
              toast.error(t("password.tooWeak"));
              return;
            }
            toast.success(t("password.updated"));
            setNewPassword("");
            setConfirmPassword("");
          }}
        >
          <FormField label={t("password.new")}>
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                aria-describedby={strengthId}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            )}
          </FormField>
          <PasswordStrength id={strengthId} value={newPassword} />
          <FormField label={t("password.confirm")} error={passwordMismatch ? t("password.mismatch") : undefined}>
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            )}
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              {t("password.submit")}
            </Button>
          </div>
        </form>
      </Card>

      {isDemoApi && <DemoAccountCard />}
    </div>
  );
}
