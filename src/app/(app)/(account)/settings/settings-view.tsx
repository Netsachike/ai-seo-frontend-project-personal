"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { accountHref, normalizeSettingsTab, type SettingsTab } from "@/features/account/routes";
import { useTeamMembers } from "@/features/account/use-team-members";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "./profile-tab";
import { SubscriptionsTab } from "./subscriptions-tab";
import { TeamTab } from "./team-tab";
import { WorkspacesTab } from "./workspaces-tab";

/**
 * Reads the URL in a Suspense-isolated child, so switching tabs never causes
 * a full refresh in production builds.
 */
function SettingsParamsReader({ onChange }: { onChange: (tab: SettingsTab, workspaceModal: string | null) => void }) {
  const searchParams = useSearchParams();
  const tab = normalizeSettingsTab(searchParams.get("tab"));
  const workspaceModal = searchParams.get("workspaceModal");

  React.useEffect(() => {
    onChange(tab, workspaceModal);
  }, [tab, workspaceModal, onChange]);

  return null;
}

export function SettingsView() {
  const [urlTab, setUrlTab] = React.useState<SettingsTab>("profile");
  const [workspaceModalParam, setWorkspaceModalParam] = React.useState<string | null>(null);

  const handleParamsChange = React.useCallback((tab: SettingsTab, workspaceModal: string | null) => {
    setUrlTab(tab);
    setWorkspaceModalParam(workspaceModal);
  }, []);

  return (
    <>
      <React.Suspense fallback={null}>
        <SettingsParamsReader onChange={handleParamsChange} />
      </React.Suspense>
      <SettingsContent urlTab={urlTab} workspaceModalParam={workspaceModalParam} />
    </>
  );
}

function SettingsContent({ urlTab, workspaceModalParam }: { urlTab: SettingsTab; workspaceModalParam: string | null }) {
  const t = useTranslations("account.settings");
  const router = useRouter();
  const team = useTeamMembers();
  const hasLoaded = useWorkspaceStore((s) => s.hasLoaded);
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);

  React.useEffect(() => {
    if (!hasLoaded) void fetchWorkspaces();
  }, [fetchWorkspaces, hasLoaded]);

  // Local state drives the tab for an instant switch and follows the URL on
  // back/forward navigation.
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(urlTab);
  const [seenUrlTab, setSeenUrlTab] = React.useState(urlTab);
  if (urlTab !== seenUrlTab) {
    setSeenUrlTab(urlTab);
    setActiveTab(urlTab);
  }

  function handleTabChange(nextTab: string) {
    const normalized = normalizeSettingsTab(nextTab);
    setActiveTab(normalized); // instant UI update
    router.replace(accountHref.settings(normalized), { scroll: false }); // URL sync
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-6">
        <TabsList aria-label={t("tabsLabel")}>
          <TabsTrigger value="profile">{t("tabs.profile")}</TabsTrigger>
          <TabsTrigger value="workspaces">{t("tabs.workspaces")}</TabsTrigger>
          <TabsTrigger value="subscriptions">{t("tabs.subscriptions")}</TabsTrigger>
          <TabsTrigger value="team-members">{t("tabs.team-members")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="workspaces">
          <WorkspacesTab
            activeTab={activeTab}
            isCreateModalOpen={workspaceModalParam === "create"}
            teamMembers={team.members}
          />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="team-members">
          <TeamTab team={team} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
