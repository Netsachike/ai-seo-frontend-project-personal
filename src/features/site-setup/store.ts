"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TopicSuggestion = {
  id: string;
  label: string;
  recommended: boolean;
  /** Monthly searches across the topic's keywords */
  volume: number;
};

export type PublishMode = "review" | "auto";
export type BrandVoice = "friendly" | "professional" | "expert" | "playful";

/**
 * Everything site setup collects, per site. The backend has no endpoint to
 * update a site's details after it is created, so this is kept in
 * localStorage, and a refresh resumes with confirmed sections still ticked.
 */
export type SetupDraft = {
  /** The crawl started when the site was created; topic discovery waits for it. */
  crawlRunId: number | null;
  description: string | null;
  descriptionConfirmed: boolean;
  audience: string | null;
  audienceConfirmed: boolean;
  /** ISO 3166-1 alpha-2 */
  country: string | null;
  /** BCP-47 */
  language: string | null;
  gsc: { siteUrl: string; connectedAt: string } | null;
  gscSkipped: boolean;
  topicSuggestions: TopicSuggestion[] | null;
  coreTopics: string[];
  integration: { provider: string; connectedAt: string } | null;
  preferences: {
    publishMode: PublishMode;
    articlesPerWeek: number;
    voice: BrandVoice;
    voiceNotes: string;
  } | null;
};

export const emptyDraft: SetupDraft = {
  crawlRunId: null,
  description: null,
  descriptionConfirmed: false,
  audience: null,
  audienceConfirmed: false,
  country: null,
  language: null,
  gsc: null,
  gscSkipped: false,
  topicSuggestions: null,
  coreTopics: [],
  integration: null,
  preferences: null,
};

type SetupState = {
  drafts: Record<string, SetupDraft>;
  patch: (siteId: number | string, patch: Partial<SetupDraft>) => void;
};

export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      drafts: {},
      patch: (siteId, patch) =>
        set((state) => ({
          drafts: { ...state.drafts, [siteId]: { ...emptyDraft, ...state.drafts[siteId], ...patch } },
        })),
    }),
    { name: "rankoya:site-setup", storage: createJSONStorage(() => localStorage) },
  ),
);

/** The site's draft, with defaults for anything not collected yet. */
export function useDraft(siteId: number | string): SetupDraft {
  const draft = useSetupStore((s) => s.drafts[siteId]);
  return draft ?? emptyDraft;
}

export const patchDraft = (siteId: number | string, patch: Partial<SetupDraft>) =>
  useSetupStore.getState().patch(siteId, patch);
