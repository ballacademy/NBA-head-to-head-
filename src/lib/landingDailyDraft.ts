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

export type DailyDraftChooserTag = "completed" | "progress";

export interface DailyDraftChooserStatus {
  meta: string;
  tag: DailyDraftChooserTag | null;
  tagLabel: string | null;
}

export const formatDailyDraftChooserStatus = (params: {
  basicDone: boolean;
  advancedDone: boolean;
}): DailyDraftChooserStatus => {
  if (params.basicDone && params.advancedDone) {
    return {
      meta: "Basic & Advanced completed",
      tag: "completed",
      tagLabel: "Completed",
    };
  }
  if (params.basicDone) {
    return {
      meta: "Basic done · Advanced open",
      tag: "progress",
      tagLabel: "1/2",
    };
  }
  if (params.advancedDone) {
    return {
      meta: "Advanced done · Basic open",
      tag: "progress",
      tagLabel: "1/2",
    };
  }
  return {
    meta: "Not played today",
    tag: null,
    tagLabel: null,
  };
};
