"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { CampaignTable } from "@/components/admin/marketing/campaign-table";
import { CreateCampaignForm } from "@/components/admin/marketing/create-campaign-form";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MarketingPage() {
  const t = useTranslations("admin.marketing");
  const [activeTab, setActiveTab] = React.useState<"all-campaigns" | "create-campaign">("all-campaigns");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="gap-6">
        <TabsList>
          <TabsTrigger value="all-campaigns">{t("tabs.all")}</TabsTrigger>
          <TabsTrigger value="create-campaign">{t("tabs.create")}</TabsTrigger>
        </TabsList>
        <TabsContent value="all-campaigns">
          <CampaignTable />
        </TabsContent>
        <TabsContent value="create-campaign">
          <CreateCampaignForm onSent={() => setActiveTab("all-campaigns")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
