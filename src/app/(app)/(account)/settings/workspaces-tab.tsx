"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRightIcon, BuildingIcon, PaletteIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { getErrorMessage, mentionsUpgrade } from "@/lib/errors";
import { hasWhiteLabel } from "@/lib/subscription";
import { useWorkspaceStore, type Workspace } from "@/stores/workspace-store";
import type { User } from "@/types/shared";
import { accountHref, type SettingsTab } from "@/features/account/routes";
import { useSessionUser } from "@/features/account/use-session-user";
import { getTeamMemberWorkspaceIds } from "@/features/account/use-team-members";
import { ConfirmDialog } from "@/components/account/confirm-dialog";
import { ConfigureWhiteLabelDialog, type WhiteLabelFormValues } from "@/components/account/configure-white-label-dialog";
import { WhiteLabelUpgradeDialog } from "@/components/account/white-label-upgrade-dialog";
import { WorkspaceDialog, type WorkspaceFormValues } from "@/components/account/workspace-dialog";
import { EmptyState } from "@/components/brand/empty-state";
import { EntityAvatar } from "@/components/layout/avatars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Backend workspaces: list, create (deep-linkable via ?workspaceModal=create),
 * edit and activate, delete, the details page, and White Label setup.
 */
export function WorkspacesTab({
  activeTab,
  isCreateModalOpen,
  teamMembers,
}: {
  activeTab: SettingsTab;
  isCreateModalOpen: boolean;
  teamMembers: User[];
}) {
  const t = useTranslations("account.workspaces");
  const router = useRouter();
  const session = useSessionUser();

  const {
    workspaces,
    isLoading,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    activateWorkspace,
    isCreatingWorkspace,
    isUpdatingWorkspace,
    isDeletingWorkspace,
  } = useWorkspaceStore();

  const [workspaceToEdit, setWorkspaceToEdit] = React.useState<Workspace | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = React.useState<Workspace | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = React.useState(false);
  const [workspaceToWhiteLabel, setWorkspaceToWhiteLabel] = React.useState<Workspace | null>(null);
  const [isWhiteLabelModalOpen, setIsWhiteLabelModalOpen] = React.useState(false);
  const [isWhiteLabelUpgradeOpen, setIsWhiteLabelUpgradeOpen] = React.useState(false);

  const isWorkspaceMutating = isCreatingWorkspace || isUpdatingWorkspace || isDeletingWorkspace;

  const teamMembersByWorkspace = React.useMemo(() => {
    const grouped = new Map<string, User[]>();
    teamMembers.forEach((member) => {
      getTeamMemberWorkspaceIds(member).forEach((workspaceId) => {
        const key = String(workspaceId);
        grouped.set(key, [...(grouped.get(key) ?? []), member]);
      });
    });
    return grouped;
  }, [teamMembers]);

  function openAddWorkspaceModal() {
    setWorkspaceToEdit(null);
    router.replace(accountHref.createWorkspace(), { scroll: false });
  }

  function openEditWorkspaceModal(workspace: Workspace) {
    setWorkspaceToEdit(workspace);
    setIsWorkspaceModalOpen(true);
  }

  function closeWorkspaceModal() {
    if (isCreateModalOpen) {
      router.replace(accountHref.settings(activeTab), { scroll: false });
      return;
    }
    setIsWorkspaceModalOpen(false);
    setWorkspaceToEdit(null);
  }

  // White Label is gated behind the reseller_seats add-on. Without it the
  // button opens the upgrade prompt instead.
  const canWhiteLabel = hasWhiteLabel(session?.subscriptions);

  const openWhiteLabelModal = (workspace: Workspace) => {
    if (!canWhiteLabel) {
      setIsWhiteLabelUpgradeOpen(true);
      return;
    }
    setWorkspaceToWhiteLabel(workspace);
    setIsWhiteLabelModalOpen(true);
  };

  const closeWhiteLabelModal = () => {
    setIsWhiteLabelModalOpen(false);
    setWorkspaceToWhiteLabel(null);
  };

  /**
   * The dialog owns persistence. All that's left is to hand the reseller the
   * DNS records for the domain they just saved; the workspace page opens them
   * when it sees ?dns.
   */
  const handleWhiteLabelSubmit = async (values: WhiteLabelFormValues) => {
    const workspaceId = workspaceToWhiteLabel?.id;
    if (!workspaceId) return;
    router.push(accountHref.workspace(workspaceId, values.id));
  };

  async function handleSaveWorkspace(values: WorkspaceFormValues) {
    try {
      if (workspaceToEdit) {
        await updateWorkspace({
          id: workspaceToEdit.id,
          name: values.name,
          members: workspaceToEdit.members,
          image: workspaceToEdit.image,
          active: values.isActive,
        });

        if (values.isActive && !workspaceToEdit.active) {
          await activateWorkspace(workspaceToEdit.id);
        }

        toast.success(t("toasts.updated"));
      } else {
        const createdWorkspace = await createWorkspace({
          name: values.name,
          imagePreview: null,
          logoFile: values.logoFile,
        });

        if (values.isActive && createdWorkspace?.id) {
          await activateWorkspace(createdWorkspace.id);
        }

        toast.success(t("toasts.created"));
      }

      closeWorkspaceModal();
      await fetchWorkspaces();
    } catch (error) {
      const errorMessage = getErrorMessage(error, t("toasts.saveFailed"));
      toast.error(errorMessage);
      if (mentionsUpgrade(errorMessage)) {
        router.push(accountHref.upgrade());
      }
    }
  }

  async function handleDeleteWorkspaceConfirm() {
    if (!workspaceToDelete) {
      return;
    }

    try {
      await deleteWorkspace(workspaceToDelete.id);
      toast.success(t("toasts.deleted"));
      setWorkspaceToDelete(null);
      await fetchWorkspaces();
    } catch (error) {
      const errorMessage = getErrorMessage(error, t("toasts.deleteFailed"));
      toast.error(errorMessage);
      if (mentionsUpgrade(errorMessage)) {
        router.push(accountHref.upgrade());
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <CardAction>
          <Button variant="primary" size="sm" disabled={isWorkspaceMutating} onClick={openAddWorkspaceModal}>
            <PlusIcon />
            {t("add")}
          </Button>
        </CardAction>
      </CardHeader>

      {isLoading && workspaces.length === 0 ? (
        <div className="grid gap-3 xl:grid-cols-2" aria-busy>
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : workspaces.length === 0 ? (
        <EmptyState
          compact
          icon={BuildingIcon}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Button variant="primary" size="sm" onClick={openAddWorkspaceModal}>
              <PlusIcon />
              {t("add")}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {workspaces.map((workspace) => {
            const members = teamMembersByWorkspace.get(String(workspace.id))?.length ?? workspace.members;
            return (
              <li
                key={workspace.id}
                className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <EntityAvatar name={workspace.name} size={40} />
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-body font-medium text-fg">{workspace.name}</p>
                      <p className="num text-caption font-normal text-fg-3">{t("members", { count: members })}</p>
                    </div>
                  </div>
                  {workspace.active && (
                    <Badge variant="success" shape="pill">
                      {t("active")}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm">
                      <Link href={accountHref.workspace(workspace.id)}>
                        <ArrowUpRightIcon className="rtl:-scale-x-100" />
                        {t("viewDetails")}
                      </Link>
                    </Button>
                    <Button size="sm" onClick={() => openWhiteLabelModal(workspace)}>
                      <PaletteIcon />
                      {t("configureWhiteLabel")}
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isWorkspaceMutating}
                      aria-label={t("editAria", { name: workspace.name })}
                      onClick={() => openEditWorkspaceModal(workspace)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isWorkspaceMutating}
                      aria-label={t("deleteAria", { name: workspace.name })}
                      className="text-danger hover:bg-danger-bg hover:text-danger"
                      onClick={() => setWorkspaceToDelete(workspace)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <WorkspaceDialog
        open={isWorkspaceModalOpen || isCreateModalOpen}
        workspace={workspaceToEdit}
        isSubmitting={isWorkspaceMutating}
        onOpenChange={(open) => {
          if (!open) closeWorkspaceModal();
        }}
        onSubmit={handleSaveWorkspace}
      />

      <ConfirmDialog
        open={Boolean(workspaceToDelete)}
        onOpenChange={(open) => {
          if (!open) setWorkspaceToDelete(null);
        }}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.body", { name: workspaceToDelete?.name ?? "" })}
        confirmLabel={t("deleteDialog.confirm")}
        isPending={isWorkspaceMutating}
        onConfirm={handleDeleteWorkspaceConfirm}
      />

      <WhiteLabelUpgradeDialog open={isWhiteLabelUpgradeOpen} onOpenChange={setIsWhiteLabelUpgradeOpen} />

      <ConfigureWhiteLabelDialog
        open={isWhiteLabelModalOpen}
        workspace={workspaceToWhiteLabel}
        onOpenChange={(open) => {
          if (!open) closeWhiteLabelModal();
        }}
        onSubmit={handleWhiteLabelSubmit}
      />
    </Card>
  );
}
