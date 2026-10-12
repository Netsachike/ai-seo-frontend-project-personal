"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import teamMemberService from "@/services/team-members";
import type { User } from "@/types/types";
import type { WorkspaceOption } from "@/components/account/team-member-dialog";
import { accountKeys } from "./query-keys";

/**
 * `GET /team`: the members plus the workspaces the owner can assign. Shared by
 * the Workspaces tab (member counts) and the Team members tab.
 */
export function useTeamMembers() {
  const t = useTranslations("account.team");
  const query = useQuery({
    queryKey: accountKeys.team(),
    queryFn: async () => {
      try {
        const response = await teamMemberService.getAllTeamMembers();
        return {
          members: response.users ?? [],
          workspaces: (response.workspaces ?? []).map<WorkspaceOption>((workspace) => ({
            id: Number(workspace.id),
            name: workspace.name,
          })),
        };
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("loadFailed"));
        throw error;
      }
    },
    retry: false,
  });

  return {
    members: query.data?.members ?? [],
    workspaces: query.data?.workspaces ?? [],
    isLoading: query.isFetching,
    refresh: async () => {
      await query.refetch();
    },
  };
}

export type TeamMembersState = ReturnType<typeof useTeamMembers>;

/** Workspace ids a member belongs to: the relation rows first, else `user_workspaces`. */
export function getTeamMemberWorkspaceIds(member: User): number[] {
  const idsFromRelations =
    member.all_user_workspaces?.map((entry) => Number(entry.id)).filter((id) => !Number.isNaN(id)) ?? [];

  if (idsFromRelations.length > 0) {
    return idsFromRelations;
  }

  return member.user_workspaces?.map((id) => Number(id)).filter((id) => !Number.isNaN(id)) ?? [];
}
