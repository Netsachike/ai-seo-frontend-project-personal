import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { isNavKey } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/brand/empty-state";

/**
 * Temporary stand-in for screens built in later phases. Real routes take
 * precedence over this catch-all as they land.
 */
export default async function SectionPlaceholder({ params }: PageProps<"/[brand]/[...section]">) {
  const { section } = await params;
  const key = section[0];
  if (!key || !isNavKey(key)) notFound();
  const t = await getTranslations("shell");
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t(`nav.items.${key}`)} />
      <EmptyState title={t("placeholder.title")} description={t("placeholder.description")} />
    </div>
  );
}
