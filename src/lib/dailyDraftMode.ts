export type DailyDraftMode = "basic" | "advanced";

export const DAILY_DRAFT_MODES: DailyDraftMode[] = ["basic", "advanced"];

export const isAdvancedDailyGoalId = (goalId: string) => goalId.startsWith("adv-");

export const getDailyDraftModeForGoalId = (goalId: string): DailyDraftMode =>
  isAdvancedDailyGoalId(goalId) ? "advanced" : "basic";

export const formatDailyDraftModeLabel = (mode: DailyDraftMode) =>
  mode === "advanced" ? "Advanced" : "Basic";

/** Full product name used in UI chrome (landing, draft, results, share). */
export const formatDailyDraftProductName = (mode: DailyDraftMode) =>
  `${formatDailyDraftModeLabel(mode)} Daily Draft`;

/** Mode-level scoring explanation for Daily cards (P2 clarity). */
export const getDailyDraftScoringTwistCopy = (mode: DailyDraftMode) =>
  mode === "advanced"
    ? "Score your five with per-minute and rate stats — today's puzzle uses advanced rates and ratios."
    : "Score your five with season per-game stats — today's puzzle chases a single stat total.";
