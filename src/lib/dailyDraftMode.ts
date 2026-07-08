export type DailyDraftMode = "basic" | "advanced";

export const DAILY_DRAFT_MODES: DailyDraftMode[] = ["basic", "advanced"];

export const isAdvancedDailyGoalId = (goalId: string) => goalId.startsWith("adv-");

export const getDailyDraftModeForGoalId = (goalId: string): DailyDraftMode =>
  isAdvancedDailyGoalId(goalId) ? "advanced" : "basic";

export const formatDailyDraftModeLabel = (mode: DailyDraftMode) =>
  mode === "advanced" ? "Advanced" : "Basic";
