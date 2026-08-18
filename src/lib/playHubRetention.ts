import {
  formatDailyDraftPlayStreak,
  type DailyDraftPlayStreak,
} from "./dailyDraftPlayStreak";
import type { LandingPlaySection } from "./landingHub";

export type PlayHubChipId = "inbox" | "recap" | "badge" | "streak";

export type PlayHubChipAction =
  | { type: "inbox" }
  | { type: "h2h" }
  | { type: "roster" }
  | { type: "play"; playSection: LandingPlaySection; h2hMode?: "classic" | "ranked" };

export type PlayHubChip = {
  id: PlayHubChipId;
  label: string;
  detail?: string;
  ctaLabel: string;
  action: PlayHubChipAction;
};

export const getPlayNavBadgeCount = (params: {
  pendingResultCount: number;
  queuedClassic: boolean;
  queuedRanked: boolean;
}) =>
  Math.max(0, params.pendingResultCount) +
  (params.queuedClassic ? 1 : 0) +
  (params.queuedRanked ? 1 : 0);

export const formatPlayHubDailyStreakLabel = (
  basic: DailyDraftPlayStreak,
  advanced: DailyDraftPlayStreak,
): string | null => {
  const best = basic.current >= advanced.current ? basic : advanced;
  if (best.current <= 0) {
    return null;
  }

  const mode = best.mode === "advanced" ? "Adv" : "Basic";
  return `${mode} ${formatDailyDraftPlayStreak(best)}`;
};

export const buildPlayHubChips = (params: {
  pendingResultCount: number;
  queuedClassic: boolean;
  queuedRanked: boolean;
  recapReady: boolean;
  recapDaysLabel?: string | null;
  nextBadgeTitle?: string | null;
  nextBadgeIsDaily?: boolean;
  nextBadgePlaySection?: LandingPlaySection;
  nextBadgeH2hMode?: "classic" | "ranked";
  dailyStreakLabel?: string | null;
}): PlayHubChip[] => {
  const chips: PlayHubChip[] = [];

  if (params.pendingResultCount > 0) {
    chips.push({
      id: "inbox",
      label:
        params.pendingResultCount === 1
          ? "1 result ready"
          : `${params.pendingResultCount} results ready`,
      ctaLabel: "View",
      action: { type: "inbox" },
    });
  } else if (params.queuedClassic || params.queuedRanked) {
    chips.push({
      id: "inbox",
      label:
        params.queuedClassic && params.queuedRanked
          ? "Lineups queued"
          : "Lineup queued",
      detail: "Waiting for another GM",
      ctaLabel: "H2H",
      action: { type: "h2h" },
    });
  }

  if (params.recapReady) {
    chips.push({
      id: "recap",
      label: "Weekly recap ready",
      detail: params.recapDaysLabel ?? undefined,
      ctaLabel: "Franchise",
      action: { type: "roster" },
    });
  }

  if (params.nextBadgeTitle) {
    chips.push({
      id: "badge",
      label: params.nextBadgeTitle,
      detail: "Next badge",
      ctaLabel: "Go",
      action: {
        type: "play",
        playSection: params.nextBadgePlaySection ?? "headToHead",
        h2hMode: params.nextBadgeH2hMode,
      },
    });
  }

  if (params.dailyStreakLabel && !params.nextBadgeIsDaily) {
    chips.push({
      id: "streak",
      label: params.dailyStreakLabel,
      detail: "Daily",
      ctaLabel: "Play",
      action: { type: "play", playSection: "daily" },
    });
  }

  return chips.slice(0, 3);
};
