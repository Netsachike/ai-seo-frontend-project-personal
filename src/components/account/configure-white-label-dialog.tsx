"use client";

import * as React from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GlobeIcon,
  ImagesIcon,
  Loader2Icon,
  MailIcon,
  PaletteIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { Workspace } from "@/stores/workspace-store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import CustomDomainService, { type CustomDomainConfig, type LoginCarouselSlide } from "@/services/custom-domain";
import UploadService from "@/services/upload";
import {
  DEFAULT_BRAND_COLORS,
  DEFAULT_BRAND_CONFIG,
  DEFAULT_LOGIN_CAROUSEL,
  applyBrandToCopy,
  resolveSlideCopy,
} from "@/config/brand";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** "user" leaves each visitor's own theme choice alone. */
type ThemePreference = "dark" | "light" | "user";
const THEME_OPTIONS: ThemePreference[] = ["user", "light", "dark"];

export type WhiteLabelFormValues = {
  id: number | string | null;
  customDomain: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  supportEmail: string;
  replyToEmail: string;
  defaultTheme: ThemePreference;
  logoUrl?: string;
  logoIconUrl?: string;
  faviconUrl?: string;
  loginCarousel?: LoginCarouselSlide[];
};

const DEFAULTS: WhiteLabelFormValues = {
  id: 0,
  customDomain: "",
  brandName: "",
  primaryColor: DEFAULT_BRAND_COLORS.primary_color,
  secondaryColor: DEFAULT_BRAND_COLORS.secondary_color,
  backgroundColor: DEFAULT_BRAND_COLORS.background_color,
  textColor: DEFAULT_BRAND_COLORS.text_color,
  buttonColor: DEFAULT_BRAND_COLORS.button_color,
  buttonTextColor: DEFAULT_BRAND_COLORS.button_text_color,
  supportEmail: "",
  replyToEmail: "",
  defaultTheme: "user",
  logoUrl: "",
  logoIconUrl: "",
  faviconUrl: "",
  loginCarousel: DEFAULT_LOGIN_CAROUSEL,
};

const COLOR_FIELDS = [
  "primaryColor",
  "secondaryColor",
  "buttonColor",
  "buttonTextColor",
  "backgroundColor",
  "textColor",
] as const satisfies readonly (keyof WhiteLabelFormValues)[];

type CarouselCopyField = "kicker" | "title" | "description";
const CAROUSEL_COPY_FIELDS: CarouselCopyField[] = ["kicker", "title", "description"];

type ImageField = "logoUrl" | "logoIconUrl" | "faviconUrl";

/** The stock wording for a slide with `{brand}` resolved, used as the input placeholder. */
function defaultSlideCopy(index: number, brandName: string) {
  const slide = DEFAULT_LOGIN_CAROUSEL[index];
  const name = brandName.trim() || DEFAULT_BRAND_CONFIG.brand_name;
  return {
    kicker: applyBrandToCopy(slide?.kicker, name),
    title: applyBrandToCopy(slide?.title, name),
    description: applyBrandToCopy(slide?.description, name),
  };
}

function SectionHeading({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-2">
      <Icon aria-hidden className="size-4 text-blue" />
      <h3 className="text-h3 text-fg">{title}</h3>
    </div>
  );
}

/**
 * Domain and branding for a White Label workspace. A new domain is first
 * registered on the Vercel project (`POST /api/custom-domains`), then saved
 * to the backend; an existing one only has its branding updated. The caller
 * then sends the reseller to the DNS records for that domain.
 */
export function ConfigureWhiteLabelDialog({
  open,
  workspace,
  initialValues,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  workspace: Workspace | null;
  initialValues?: Partial<WhiteLabelFormValues> | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WhiteLabelFormValues) => Promise<void>;
}) {
  const t = useTranslations("account.whiteLabel.configure");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [domainError, setDomainError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState<Record<ImageField, boolean>>({
    logoUrl: false,
    logoIconUrl: false,
    faviconUrl: false,
  });
  const [carouselUploadIndex, setCarouselUploadIndex] = React.useState<number | null>(null);
  const [values, setValues] = React.useState<WhiteLabelFormValues>(DEFAULTS);

  // An existing domain is already registered on the project: the host is
  // immutable from here, so only its branding stays editable.
  const isExistingDomain = Boolean(initialValues?.id);

  // Seed the form when the dialog opens or its initial values change
  // (adjusting state during render). Callers pass memoized initial values.
  const [seededFor, setSeededFor] = React.useState<Partial<WhiteLabelFormValues> | null | undefined>(undefined);
  if (!open && seededFor !== undefined) setSeededFor(undefined);
  if (open && workspace && seededFor !== (initialValues ?? null)) {
    setSeededFor(initialValues ?? null);
    setDomainError(null);
    setValues({
      ...DEFAULTS,
      ...Object.fromEntries(
        Object.entries(initialValues ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== ""),
      ),
      brandName: initialValues?.brandName || workspace.name,
    });
  }

  const handleChange = (field: keyof WhiteLabelFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (field === "customDomain") setDomainError(null);
  };

  const handleUpload = async (file: File, field: ImageField) => {
    setUploading((prev) => ({ ...prev, [field]: true }));
    try {
      const res = await UploadService.uploadImage(file);
      if (res.url) handleChange(field, res.url);
    } catch {
      toast.error(t("uploadFailed", { field: t(`images.${field}.name`) }));
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  /** Replaces one carousel slide's image, keeping its saved position and copy. */
  const handleCarouselUpload = async (file: File, index: number) => {
    setCarouselUploadIndex(index);
    try {
      const res = await UploadService.uploadImage(file);
      if (!res.url) return;
      setValues((prev) => {
        const slides = [...(prev.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL)];
        slides[index] = { ...slides[index], url: res.url, position: index + 1 };
        return { ...prev, loginCarousel: slides };
      });
    } catch {
      toast.error(t("carouselUploadFailed"));
    } finally {
      setCarouselUploadIndex(null);
    }
  };

  /** Sets one copy field on a slide. Empty clears back to the stock wording. */
  const updateCarouselCopy = (index: number, field: CarouselCopyField, value: string) => {
    setValues((prev) => {
      const slides = [...(prev.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL)];
      slides[index] = { ...slides[index], [field]: value || null };
      return { ...prev, loginCarousel: slides };
    });
  };

  const slidePreview = (index: number) => {
    const slides = values.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL;
    return resolveSlideCopy(
      slides[index] ?? { url: "", position: index + 1 },
      index,
      values.brandName.trim() || DEFAULT_BRAND_CONFIG.brand_name,
    );
  };

  /** Moves a slide earlier or later and renumbers positions to match. */
  const moveCarouselSlide = (index: number, direction: -1 | 1) => {
    setValues((prev) => {
      const slides = [...(prev.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL)];
      const target = index + direction;
      if (target < 0 || target >= slides.length) return prev;
      [slides[index], slides[target]] = [slides[target], slides[index]];
      return { ...prev, loginCarousel: slides.map((slide, i) => ({ ...slide, position: i + 1 })) };
    });
  };

  /**
   * Registers the host on the Vercel project so its DNS and verification
   * records exist. Returns false when the caller should stop and show
   * `domainError`.
   */
  const registerDomainOnProject = async (domain: string) => {
    const res = await fetch("/api/custom-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDomainError(data?.error || t("domainAddFailed"));
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const domain = values.customDomain.trim();

    if (!domain) {
      setDomainError(t("domainRequired"));
      return;
    }

    setIsSubmitting(true);
    setDomainError(null);

    // Carries the new record's id back to the caller, which opens its DNS records.
    let savedDomain: { data?: { id?: number | string } } | undefined;

    const config: CustomDomainConfig = {
      brand_name: values.brandName.trim() || null,
      logo_url: values.logoUrl || null,
      logo_icon_url: values.logoIconUrl || null,
      favicon_url: values.faviconUrl || null,
      login_carousel: values.loginCarousel?.length ? values.loginCarousel : null,
      default_theme: values.defaultTheme,
      primary_color: values.primaryColor,
      secondary_color: values.secondaryColor,
      background_color: values.backgroundColor,
      text_color: values.textColor,
      button_color: values.buttonColor,
      button_text_color: values.buttonTextColor,
      support_email: values.supportEmail.trim() || null,
      reply_to_email: values.replyToEmail.trim() || null,
    };

    try {
      // An existing domain is already on the Vercel project: re-registering
      // would fail, and POSTing again would duplicate the record.
      if (isExistingDomain) {
        await CustomDomainService.updateConfig({ payload: { config }, id: values.id! });
      } else {
        if (!(await registerDomainOnProject(domain))) return;
        savedDomain = await CustomDomainService.saveDomain({ domain, config });
      }

      // `||` not `??`: a new domain starts at id 0, which `??` would keep.
      await onSubmit({ ...values, id: values.id || savedDomain?.data?.id || null });

      toast.success(t("saved"));
      onOpenChange(false);
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || Object.values(uploading).some(Boolean) || carouselUploadIndex !== null;
  const slides = values.loginCarousel ?? DEFAULT_LOGIN_CAROUSEL;

  const renderImageField = (field: ImageField, accept: string, previewClassName: string) => (
    <FormField label={t(`images.${field}.label`)} helper={t(`images.${field}.helper`)}>
      {(props) => (
        <div className="flex items-center gap-3">
          {values[field] ? (
            <div
              className={cn(
                "relative grid place-items-center rounded-md border border-border bg-surface-2 p-1",
                previewClassName,
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- uploads come from any origin */}
              <img src={values[field]} alt={t(`images.${field}.name`)} className="max-h-full max-w-full object-contain" />
              <button
                type="button"
                onClick={() => handleChange(field, "")}
                aria-label={t("removeImage", { field: t(`images.${field}.name`) })}
                className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full bg-danger text-ink-fg shadow-raised"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ) : (
            <Input
              {...props}
              type="file"
              accept={accept}
              disabled={uploading[field]}
              className="h-auto min-w-0 py-2 file:me-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2.5 file:py-1 file:text-small file:font-medium file:text-fg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file, field);
              }}
            />
          )}
          {uploading[field] && <Loader2Icon aria-hidden className="size-5 shrink-0 animate-spin text-blue" />}
        </div>
      )}
    </FormField>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-w-[880px] gap-0 p-0">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <DialogHeader className="border-b border-border px-6 pt-6 pb-4">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("subtitle", { workspace: workspace?.name ?? "" })}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-8 px-6 py-6">
            {/* Brand name and domain */}
            <section className="flex flex-col gap-4">
              <SectionHeading icon={GlobeIcon} title={t("sections.domain")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("brandName")}>
                  {(props) => (
                    <Input
                      {...props}
                      value={values.brandName}
                      placeholder={t("brandNamePlaceholder")}
                      onChange={(event) => handleChange("brandName", event.target.value)}
                    />
                  )}
                </FormField>
                <FormField
                  label={t("domain")}
                  error={domainError ?? undefined}
                  helper={isExistingDomain ? t("domainLocked") : t("domainHelper")}
                >
                  {(props) => (
                    <DomainInput
                      {...props}
                      value={values.customDomain}
                      placeholder={t("domainPlaceholder")}
                      disabled={isExistingDomain}
                      className={cn(isExistingDomain && "opacity-60")}
                      onChange={(value) => handleChange("customDomain", value)}
                    />
                  )}
                </FormField>
              </div>
              {!isExistingDomain && (
                <div className="flex items-start gap-2.5 rounded-md bg-warning-bg px-3.5 py-3 text-warning">
                  <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-small font-semibold">{t("cloudflareTitle")}</p>
                    <p className="text-caption font-normal text-fg-2">{t("cloudflareBody")}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Brand identity */}
            <section className="flex flex-col gap-4">
              <SectionHeading icon={PaletteIcon} title={t("sections.identity")} />
              <div className="grid gap-4 sm:grid-cols-3">
                {renderImageField("logoUrl", "image/*", "h-14 w-24")}
                {renderImageField("logoIconUrl", "image/*", "size-12")}
                {renderImageField("faviconUrl", "image/x-icon,image/png,image/jpeg,image/webp", "size-12")}
              </div>

              <FormField label={t("theme.label")} helper={t("theme.helper")} className="max-w-xs">
                {(props) => (
                  <Select
                    value={values.defaultTheme}
                    onValueChange={(value) => handleChange("defaultTheme", value as ThemePreference)}
                  >
                    <SelectTrigger {...props} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THEME_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`theme.options.${option}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {COLOR_FIELDS.map((field) => (
                    <FormField key={field} label={t(`colors.${field}.label`)} helper={t(`colors.${field}.helper`)}>
                      {(props) => (
                        <div className="flex h-10 items-center gap-2 rounded-md border border-border-strong bg-surface px-1.5">
                          <input
                            {...props}
                            type="color"
                            value={values[field]}
                            onChange={(event) => handleChange(field, event.target.value)}
                            className="size-7 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0"
                          />
                          <span dir="ltr" className="num text-small text-fg-2 uppercase">
                            {values[field]}
                          </span>
                        </div>
                      )}
                    </FormField>
                  ))}
                </div>
                <BrandPreview values={values} />
              </div>
            </section>

            {/* Sign-in carousel */}
            <section className="flex flex-col gap-4">
              <SectionHeading icon={ImagesIcon} title={t("sections.carousel")} />
              <p className="text-small text-fg-2">{t("carouselBody")}</p>
              <ol className="grid gap-3 sm:grid-cols-3">
                {slides.map((slide, index) => {
                  const preview = slidePreview(index);
                  const placeholder = defaultSlideCopy(index, values.brandName);
                  return (
                    <li
                      key={`${index}-${slide.url}`}
                      className="flex flex-col overflow-hidden rounded-md border border-border bg-surface"
                    >
                      <div className="relative aspect-video bg-nav">
                        {/* eslint-disable-next-line @next/next/no-img-element -- uploads come from any origin */}
                        <img
                          src={slide.url}
                          alt={t("slideAlt", { number: index + 1 })}
                          className="size-full object-cover"
                        />
                        {/* Live preview: the scrim and type scale the sign-in panel uses. */}
                        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-black/10" />
                        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-2.5 text-white">
                          {preview.kicker && (
                            <p className="truncate text-[9px] font-semibold tracking-[0.08em] text-white/70 uppercase">
                              {preview.kicker}
                            </p>
                          )}
                          {preview.title && (
                            <p className="line-clamp-2 text-[12px] leading-tight font-semibold">{preview.title}</p>
                          )}
                        </div>
                        <span className="num absolute start-2 top-2 rounded-full bg-black/70 px-2 text-[11px] leading-5 font-semibold text-white">
                          {index + 1}
                        </span>
                        {carouselUploadIndex === index && (
                          <div className="absolute inset-0 grid place-items-center bg-black/50">
                            <Loader2Icon aria-hidden className="size-5 animate-spin text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 border-t border-border px-1.5 py-1">
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === 0}
                            aria-label={t("moveEarlier", { number: index + 1 })}
                            onClick={() => moveCarouselSlide(index, -1)}
                          >
                            <ArrowLeftIcon className="rtl:-scale-x-100" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === slides.length - 1}
                            aria-label={t("moveLater", { number: index + 1 })}
                            onClick={() => moveCarouselSlide(index, 1)}
                          >
                            <ArrowRightIcon className="rtl:-scale-x-100" />
                          </Button>
                        </div>
                        <label className="cursor-pointer rounded-sm px-2 py-1 text-small font-medium text-blue hover:underline has-focus-visible:outline-2 has-focus-visible:outline-blue">
                          {t("replace")}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={carouselUploadIndex !== null}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void handleCarouselUpload(file, index);
                            }}
                          />
                        </label>
                      </div>

                      {/* Blank fields keep the stock wording for that position. */}
                      <div className="flex flex-col gap-1.5 border-t border-border p-2">
                        {CAROUSEL_COPY_FIELDS.map((field) => (
                          <Input
                            key={field}
                            value={slide[field] ?? ""}
                            placeholder={placeholder[field] ?? t(`slideCopy.${field}`)}
                            aria-label={t("slideCopyAria", { field: t(`slideCopy.${field}`), number: index + 1 })}
                            onChange={(event) => updateCarouselCopy(index, field, event.target.value)}
                            className="h-8 text-small"
                          />
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Custom email */}
            <section className="flex flex-col gap-4">
              <SectionHeading icon={MailIcon} title={t("sections.email")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("supportEmail")}>
                  {(props) => (
                    <Input
                      {...props}
                      type="email"
                      dir="ltr"
                      value={values.supportEmail}
                      placeholder={t("supportEmailPlaceholder")}
                      onChange={(event) => handleChange("supportEmail", event.target.value)}
                    />
                  )}
                </FormField>
                <FormField label={t("replyToEmail")}>
                  {(props) => (
                    <Input
                      {...props}
                      type="email"
                      dir="ltr"
                      value={values.replyToEmail}
                      placeholder={t("replyToEmailPlaceholder")}
                      onChange={(event) => handleChange("replyToEmail", event.target.value)}
                    />
                  )}
                </FormField>
              </div>
              <p className="text-caption font-normal text-fg-3">{t("emailBody")}</p>
            </section>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border bg-surface px-6 py-4">
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting} disabled={isBusy}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A miniature app frame painted with the picked colours, so the reseller sees the result before saving. */
function BrandPreview({ values }: { values: WhiteLabelFormValues }) {
  const t = useTranslations("account.whiteLabel.configure.preview");
  const name = values.brandName.trim() || DEFAULT_BRAND_CONFIG.brand_name;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-caption text-fg-2">{t("label")}</figcaption>
      <div aria-hidden className="flex h-[148px] overflow-hidden rounded-md border border-border bg-bg">
        <div className="flex w-20 flex-col gap-1.5 p-2" style={{ backgroundColor: values.secondaryColor }}>
          <span className="truncate text-[10px] font-semibold text-white">{name}</span>
          <span className="h-4 rounded-sm" style={{ backgroundColor: values.primaryColor }} />
          <span className="h-4 rounded-sm bg-white/10" />
          <span className="h-4 rounded-sm bg-white/10" />
        </div>
        <div className="flex flex-1 flex-col gap-2 bg-surface p-3">
          <span className="h-2 w-16 rounded-full bg-surface-2" />
          <span className="h-2 w-24 rounded-full bg-surface-2" />
          <span className="text-[10px] font-medium" style={{ color: values.primaryColor }}>
            {t("link")}
          </span>
          <span
            className="mt-auto w-fit rounded-sm px-2.5 py-1 text-[10px] font-semibold"
            style={{ backgroundColor: values.buttonColor, color: values.buttonTextColor }}
          >
            {t("button")}
          </span>
        </div>
        <div
          className="hidden w-16 flex-col justify-end p-2 sm:flex"
          style={{ backgroundColor: values.backgroundColor, color: values.textColor }}
        >
          <span className="text-[9px] leading-tight font-semibold">{t("signIn")}</span>
        </div>
      </div>
    </figure>
  );
}
