"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { getErrorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/forms/select-field";
import { useSelectShopifyBlog, useShopifyBlogs } from "./hooks";

/**
 * Picks the blog in a Shopify store that articles go to, and saves it on the
 * connection (\`PATCH …/shopify-blog\`), so every publish uses it by default.
 */
export function ShopifyBlogPicker({
  siteId,
  connectionId,
  currentBlogId,
  onSaved,
  compact = false,
}: {
  siteId: number;
  connectionId: number;
  currentBlogId?: string | null;
  onSaved?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("integrations.shopifyBlogs");
  const blogs = useShopifyBlogs(siteId, connectionId);
  const save = useSelectShopifyBlog(siteId, connectionId);
  const [choice, setChoice] = React.useState("");
  const value = choice || currentBlogId || blogs.data?.[0]?.id || "";
  const unchanged = Boolean(currentBlogId) && value === currentBlogId;

  if (blogs.isPending) return <span className="text-caption font-normal text-fg-3">{t("loading")}</span>;
  if (blogs.isError)
    return <p className="text-caption font-normal text-danger">{getErrorMessage(blogs.error, t("failed"))}</p>;
  if (blogs.data.length === 0) return <p className="text-caption font-normal text-warning">{t("none")}</p>;

  const submit = () => {
    const blog = blogs.data.find((b) => b.id === value);
    if (!blog) return;
    save.mutate(
      { blog_id: blog.id, blog_name: blog.title },
      {
        onSuccess: () => {
          toast.success(t("saved", { name: blog.title }));
          onSaved?.();
        },
        onError: (error) => toast.error(getErrorMessage(error, t("saveFailed"))),
      },
    );
  };

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3"}>
      <SelectField
        label={t("pick")}
        helper={t("help")}
        value={value}
        onChange={setChoice}
        options={blogs.data.map((b) => ({ value: b.id, label: b.title, detail: t("path", { handle: b.handle }) }))}
      />
      <Button
        size="sm"
        variant={unchanged ? "secondary" : "primary"}
        className="self-start"
        loading={save.isPending}
        disabled={unchanged || !value}
        onClick={submit}
      >
        {unchanged && <CheckIcon />}
        {unchanged ? t("current") : t("save")}
      </Button>
    </div>
  );
}
