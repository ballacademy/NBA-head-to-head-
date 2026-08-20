import {
  formatDailyDraftPlayStreak,
  type DailyDraftPlayStreak,
} from "./dailyDraftPlayStreak";
import type { LandingPlaySection } from "./landingHub";

export type PlayHubChipId =
  | "inbox"
  | "daily"
  | "recap"
  | "badge"
  | "streak"
  | "gameLog";

export type PlayHubChipAction =
  | { type: "h2h" }
  | { type: "gameLog" }
  | { type: "roster" }
  | { type: "recap" }
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
  queuedClassic: boolean;
  queuedRanked: boolean;
  recapReady: boolean;
  recapDetail?: string;
  nextBadgeTitle?: string | null;
  nextBadgeIsDaily?: boolean;
  nextBadgePlaySection?: LandingPlaySection;
  nextBadgeH2hMode?: "classic" | "ranked";
  dailyStreakLabel?: string | null;
  dailyOpen?: boolean;
  dailyOpenDetail?: string | null;
  gameLogCount?: number;
}): PlayHubChip[] => {
  const chips: PlayHubChip[] = [];

  if (params.queuedClassic || params.queuedRanked) {
    chips.push({
      id: "inbox",
      label:
        params.queuedClassic && params.queuedRanked
          ? "Lineups queued"
          : "Lineup queued",
      detail: "Waiting for another GM",
      ctaLabel: "Status",
      action: { type: "h2h" },
    });
  }

  if (params.dailyOpen && !params.nextBadgeIsDaily) {
    chips.push({
      id: "daily",
      label: "Daily ready",
      detail: params.dailyOpenDetail ?? "One try per mode",
      ctaLabel: "Play",
      action: { type: "play", playSection: "daily" },
    });
  }

  if (params.recapReady) {
    chips.push({
      id: "recap",
      label: "Weekly recap",
      detail: params.recapDetail ?? "Daily Draft",
      ctaLabel: "Go",
      action: { type: "recap" },
    });
  }

  if (params.gameLogCount && params.gameLogCount > 0) {
    chips.push({
      id: "gameLog",
      label:
        params.gameLogCount === 1
          ? "1 recent match"
          : `${params.gameLogCount} recent matches`,
      detail: "Game log",
      ctaLabel: "View",
      action: { type: "gameLog" },
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

  if (
    params.dailyStreakLabel &&
    !params.nextBadgeIsDaily &&
    !params.dailyOpen
  ) {
    chips.push({
      id: "streak",
      label: params.dailyStreakLabel,
      detail: "Daily Draft streak",
      ctaLabel: "Play",
      action: { type: "play", playSection: "daily" },
    });
  }

  return chips.slice(0, 3);
};
