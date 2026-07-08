import type { DailyDraftGoal } from "../lib/dailyDraftGoals";
import type { DailyDraftScoreEntry } from "../lib/dailyDraftScores";
import type { DailyDraftMode } from "../lib/dailyDraftMode";
import type { DraftSlotConstraint } from "./types";

export interface LandingDailyDraftSnapshot {
  setup: {
    dateKey: string;
    mode: DailyDraftMode;
    goal: DailyDraftGoal;
    challenge: DailyDraftGoal;
    slots: DraftSlotConstraint[];
  };
  entry?: DailyDraftScoreEntry;
  goal: DailyDraftGoal;
  percentileLabel: string | null;
  canViewLineup: boolean;
}
