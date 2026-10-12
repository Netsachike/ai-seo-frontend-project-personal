"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SeoOpportunity, SeoOpportunityStatus } from "@/types/types";
import type { ActionArea, ActionCard, ActionColumn } from "@/lib/mocks/ui-data-work";
import { aiVisibilityKeys, opportunityKeys } from "@/lib/api/query-keys";
import { toNumber } from "@/services/api/helpers";
import aiVisibilityService from "@/services/ai-visibility";
import opportunityService from "@/services/opportunities";

/** Opportunity types Rankoya does itself (it writes and refreshes content); the rest are yours. */
const isRankoyaWork = (type: string) => /content|gap|refresh|article|cluster|internal_link/.test(type);

function areaOf(type: string): ActionArea {
  if (/schema|structured/.test(type)) return "schema";
  if (/backlink|link_building|outreach|authority/.test(type)) return "outreach";
  if (/content|gap|refresh|article|cluster/.test(type)) return "content";
  return "technical";
}

const level = (score: number, high: number, medium: number) =>
  score >= high ? "high" : score >= medium ? "medium" : "low";

function columnOf(opportunity: SeoOpportunity, owner: ActionCard["owner"]): ActionColumn | null {
  if (opportunity.status === "ignored") return null;
  if (opportunity.status === "completed") return "done";
  if (opportunity.status === "in_progress") return owner === "rankoya" ? "working" : "yours";
  return owner === "rankoya" ? "approval" : "yours";
}

export function toActionCard(opportunity: SeoOpportunity): ActionCard | null {
  const owner = isRankoyaWork(opportunity.type) ? "rankoya" : "you";
  const column = columnOf(opportunity, owner);
  if (!column) return null;
  const impact = toNumber(opportunity.impact_score) ?? 0;
  const effort = toNumber(opportunity.effort_score) ?? 0;
  return {
    id: String(opportunity.id),
    column,
    owner,
    area: areaOf(opportunity.type),
    impact: level(impact, 70, 40),
    // Effort reads the other way round: a high score is a lot of work.
    effort: effort >= 60 ? "high" : effort >= 30 ? "medium" : "low",
    title: opportunity.title,
    items: [opportunity.recommended_action ?? opportunity.description ?? opportunity.title],
    // Rankoya's estimate: a tenth of the opportunity score, in visibility points.
    points: Math.round((toNumber(opportunity.opportunity_score) ?? 0) / 10),
  };
}

/** The action plan board: open opportunities as cards, plus the current AI visibility score. */
export function useActionPlan(siteId: number | undefined) {
  const id = siteId ?? 0;
  const opportunities = useQuery({
    queryKey: opportunityKeys.list(id),
    enabled: Boolean(siteId),
    queryFn: async () => (await opportunityService.list(id)).data,
  });
  const visibility = useQuery({
    queryKey: aiVisibilityKeys.overview(id),
    enabled: Boolean(siteId),
    queryFn: async () => (await aiVisibilityService.overview(id)).data,
  });
  return {
    data:
      opportunities.data && visibility.data
        ? {
            current: Math.round(visibility.data.visibility_score),
            cards: opportunities.data.data.map(toActionCard).filter((c): c is ActionCard => c !== null),
          }
        : undefined,
    isPending: !siteId || opportunities.isPending || visibility.isPending,
    isError: opportunities.isError || visibility.isError,
    refetch: () => Promise.all([opportunities.refetch(), visibility.refetch()]),
  };
}

export function useUpdateOpportunities(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: SeoOpportunityStatus }) =>
      Promise.all(ids.map((opportunityId) => opportunityService.updateStatus(siteId, opportunityId, status))),
    onSettled: () => queryClient.invalidateQueries({ queryKey: opportunityKeys.all(siteId) }),
  });
}

/** Detects opportunities from keywords, crawl data and rankings. */
export function useAnalyzeOpportunities(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await opportunityService.analyze(siteId)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opportunityKeys.all(siteId) }),
  });
}
