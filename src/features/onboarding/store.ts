import { create } from "zustand";

import {
  competitorSuggestions,
  keywordSuggestions,
  questionSuggestions,
  type CompetitorSuggestion,
  type Industry,
  type OnboardingStep,
} from "./data";

export type AutopilotMode = "ask" | "content" | "full";
export type ConnectionState = "idle" | "connecting" | "connected";

type Profile = { name: string; industry: Industry; market: string; contentLanguage: string; description: string };

type OnboardingState = {
  domain: string;
  crawl: "idle" | "reading" | "done";
  pages: number;
  profile: Profile;
  competitors: CompetitorSuggestion[];
  selectedCompetitors: string[];
  customKeywords: { id: string; text: string }[];
  customQuestions: { id: string; text: string }[];
  selectedKeywords: string[];
  selectedQuestions: string[];
  telegram: ConnectionState;
  wordpress: ConnectionState;
  searchConsole: ConnectionState;
  autopilot: AutopilotMode;
  completed: OnboardingStep[];
  /** Job polled on the scan step; a fresh id per run so progress starts at zero. */
  scanJobId: string;
  set: (patch: Partial<Omit<OnboardingState, "set" | "complete">>) => void;
  complete: (step: OnboardingStep) => void;
};

/**
 * UI-stage onboarding draft. Lives in memory across steps; the backend will
 * own it later (POST /brands and friends).
 */
export const useOnboarding = create<OnboardingState>()((set) => ({
  domain: "",
  crawl: "idle",
  pages: 0,
  profile: { name: "", industry: "other", market: "US", contentLanguage: "en", description: "" },
  competitors: competitorSuggestions,
  selectedCompetitors: competitorSuggestions.slice(0, 3).map((c) => c.id),
  customKeywords: [],
  customQuestions: [],
  selectedKeywords: keywordSuggestions.map((k) => k.id),
  selectedQuestions: questionSuggestions.map((q) => q.id),
  telegram: "idle",
  wordpress: "idle",
  searchConsole: "idle",
  autopilot: "ask",
  completed: [],
  scanJobId: "job_first_scan",
  set: (patch) => set(patch),
  complete: (step) => set((s) => ({ completed: s.completed.includes(step) ? s.completed : [...s.completed, step] })),
}));
