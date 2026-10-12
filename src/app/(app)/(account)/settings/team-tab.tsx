"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { getErrorMessage, mentionsUpgrade } from "@/lib/errors";
import teamMemberService from "@/services/team-members";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { User } from "@/types/types";
import { accountHref } from "@/features/account/routes";
import { getTeamMemberWorkspaceIds, type TeamMembersState } from "@/features/account/use-team-members";
import { ConfirmDialog } from "@/components/account/confirm-dialog";
import {
  TEAM_ROLES,
  TeamMemberDialog,
  createEmptyTeamMemberForm,
  type TeamMemberFormState,
} from "@/components/account/team-member-dialog";
import { EmptyState } from "@/components/brand/empty-state";
import { UserAvatar } from "@/components/layout/avatars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Normalises a backend role ("Team Member", "team_member") to a role key. */
const roleKey = (member: User) =>
  (member.role || member.parsed_role || "team_member").replace(/\s+/g, "_").toLowerCase();

/**
 * Team members across the owner's workspaces. Add and edit share one dialog;
 * the payload sends `user_access` for every assignable workspace, and a new
 * password on edit goes through its own endpoint.
 */
export function TeamTab({ team }: { team: TeamMembersState }) {
  const t = useTranslations("account.team");
  const tRoles = useTranslations("account.team.roles");
  const router = useRouter();
  const { workspaces } = useWorkspaceStore();
  const { members: teamMembers, workspaces: teamMemberWorkspaces, isLoading, refresh: fetchTeamMembers } = team;

  const [isMutating, setIsMutating] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [teamMemberToEdit, setTeamMemberToEdit] = React.useState<User | null>(null);
  const [teamMemberToDelete, setTeamMemberToDelete] = React.useState<User | null>(null);
  const [form, setForm] = React.useState<TeamMemberFormState>(createEmptyTeamMemberForm());

  const availableTeamWorkspaces = React.useMemo(() => {
    if (teamMemberWorkspaces.length > 0) {
      return teamMemberWorkspaces.map((workspace) => ({ id: workspace.id, name: workspace.name }));
    }
    return workspaces
      .map((workspace) => ({ id: Number(workspace.id), name: workspace.name }))
      .filter((workspace) => !Number.isNaN(workspace.id));
  }, [teamMemberWorkspaces, workspaces]);

  function openAddTeamMemberModal() {
    const activeWorkspaceId = Number(workspaces.find((workspace) => workspace.active)?.id);
    setTeamMemberToEdit(null);
    setForm({
      ...createEmptyTeamMemberForm(),
      workspaceIds: Number.isNaN(activeWorkspaceId) ? [] : [activeWorkspaceId],
    });
    setIsModalOpen(true);
  }

  function openEditTeamMemberModal(member: User) {
    setTeamMemberToEdit(member);
    setForm({
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      role: roleKey(member),
      password: "",
      confirmPassword: "",
      workspaceIds: getTeamMemberWorkspaceIds(member),
    });
    setIsModalOpen(true);
  }

  function closeTeamMemberModal() {
    setIsModalOpen(false);
    setTeamMemberToEdit(null);
    setForm(createEmptyTeamMemberForm());
  }

  function toggleTeamMemberWorkspace(workspaceId: number) {
    setForm((current) => {
      const exists = current.workspaceIds.includes(workspaceId);
      return {
        ...current,
        workspaceIds: exists
          ? current.workspaceIds.filter((id) => id !== workspaceId)
          : [...current.workspaceIds, workspaceId],
      };
    });
  }

  async function handleSaveTeamMember() {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const emailValue = form.email.trim();
    const password = form.password.trim();
    const confirmPasswordValue = form.confirmPassword.trim();
    const role = form.role.trim() || "team_member";

    if (!firstName || !lastName || !emailValue) {
      toast.error(t("validation.required"));
      return;
    }

    if (!teamMemberToEdit && (!password || !confirmPasswordValue)) {
      toast.error(t("validation.passwordRequired"));
      return;
    }

    if ((password || confirmPasswordValue) && password !== confirmPasswordValue) {
      toast.error(t("validation.mismatch"));
      return;
    }

    if (form.workspaceIds.length === 0) {
      toast.error(t("validation.workspace"));
      return;
    }

    const userAccess = availableTeamWorkspaces.map((workspace) => ({
      id: workspace.id,
      has_access: form.workspaceIds.includes(workspace.id),
    }));

    setIsMutating(true);

    try {
      if (teamMemberToEdit) {
        await teamMemberService.updateTeamMember({
          id: teamMemberToEdit.id,
          first_name: firstName,
          last_name: lastName,
          email: emailValue,
          role,
          user_access: userAccess,
        });

        if (password) {
          await teamMemberService.updateTeamMemberPassword({
            id: teamMemberToEdit.id,
            password,
            password_confirmation: confirmPasswordValue,
          });
        }

        toast.success(t("toasts.updated"));
      } else {
        await teamMemberService.addTeamMember({
          first_name: firstName,
          last_name: lastName,
          email: emailValue,
          password,
          role,
          user_access: userAccess,
        });
        toast.success(t("toasts.added"));
      }

      closeTeamMemberModal();
      await fetchTeamMembers();
    } catch (error) {
      const errorMessage = getErrorMessage(error, t("toasts.saveFailed"));
      toast.error(errorMessage);
      if (mentionsUpgrade(errorMessage)) {
        router.push(accountHref.upgrade());
      }
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteTeamMemberConfirm() {
    if (!teamMemberToDelete) return;

    setIsMutating(true);
    try {
      await teamMemberService.deleteTeamMember({ id: teamMemberToDelete.id });
      toast.success(t("toasts.deleted"));
      setTeamMemberToDelete(null);
      await fetchTeamMembers();
    } catch (error) {
      const errorMessage = getErrorMessage(error, t("toasts.deleteFailed"));
      toast.error(errorMessage);
      if (mentionsUpgrade(errorMessage)) {
        router.push(accountHref.upgrade());
      }
    } finally {
      setIsMutating(false);
    }
  }

  const roleLabel = (member: User) => {
    const key = roleKey(member);
    return (TEAM_ROLES as readonly string[]).includes(key)
      ? tRoles(key as (typeof TEAM_ROLES)[number])
      : key.replace(/_/g, " ");
  };

  return (
    <Card className="p-0">
      <CardHeader className="px-5 pt-5">
        <div className="flex flex-col gap-0.5">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <CardAction>
          <Button
            variant="primary"
            size="sm"
            disabled={isMutating || availableTeamWorkspaces.length === 0}
            onClick={openAddTeamMemberModal}
          >
            <PlusIcon />
            {t("add")}
          </Button>
        </CardAction>
      </CardHeader>

      {isLoading && teamMembers.length === 0 ? (
        <div className="flex flex-col gap-2 px-5 pb-5" aria-busy>
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState compact icon={UsersIcon} title={t("emptyTitle")} description={t("emptyBody")} />
        </div>
      ) : (
        <Table containerClassName="border-t border-border">
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.email")}</TableHead>
              <TableHead>{t("columns.role")}</TableHead>
              <TableHead>{t("columns.workspaces")}</TableHead>
              <TableHead className="text-end">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => {
              const workspaceNames = getTeamMemberWorkspaceIds(member).reduce<string[]>((names, workspaceId) => {
                const name = availableTeamWorkspaces.find((workspace) => workspace.id === workspaceId)?.name;
                if (name) names.push(name);
                return names;
              }, []);

              return (
                <TableRow key={member.id} className="h-14">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={member.name} size={32} />
                      <span className="font-medium text-fg">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-start text-fg-2">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{roleLabel(member)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-fg-2">
                    {workspaceNames.length > 0 ? workspaceNames.join(", ") : t("noWorkspace")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("editAria", { name: member.name })}
                        onClick={() => openEditTeamMemberModal(member)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("deleteAria", { name: member.name })}
                        className="text-danger hover:bg-danger-bg hover:text-danger"
                        onClick={() => setTeamMemberToDelete(member)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <TeamMemberDialog
        open={isModalOpen}
        isEditing={Boolean(teamMemberToEdit)}
        isSubmitting={isMutating}
        form={form}
        workspaces={availableTeamWorkspaces}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onToggleWorkspace={toggleTeamMemberWorkspace}
        onClose={closeTeamMemberModal}
        onSubmit={() => void handleSaveTeamMember()}
      />

      <ConfirmDialog
        open={Boolean(teamMemberToDelete)}
        onOpenChange={(open) => {
          if (!open) setTeamMemberToDelete(null);
        }}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.body", { name: teamMemberToDelete?.name ?? "" })}
        confirmLabel={t("deleteDialog.confirm")}
        isPending={isMutating}
        onConfirm={handleDeleteTeamMemberConfirm}
      />
    </Card>
  );
}
