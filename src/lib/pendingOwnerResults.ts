import { applyClassicMatchResult } from "./classicProfile";
import {
  acknowledgePendingOwnerResult,
  fetchPendingMatchmakingStatus,
  type GhostMatchmakingMode,
  type PendingOwnerResult,
} from "./ghostMatchmaking";
import type { ClassicMatchOutcome, RankedMatchOutcome } from "./matchOutcome";
import { clearPendingLineupState } from "./pendingLineup";
import {
  buildLeaderboardIdentity,
  recordMatchResult,
  type MatchRecordMode,
} from "./playerRecord";
import { applyRankedMatchResult } from "./rankedProfile";
import { upsertLeaderboardEntry } from "./leaderboard";
import { upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { loadTeamProfile } from "./teamProfile";

export interface DeliveredOwnerResult {
  mode: GhostMatchmakingMode;
  result: PendingOwnerResult;
  classic?: ClassicMatchOutcome;
  ranked?: RankedMatchOutcome;
}

const toMatchRecordMode = (mode: GhostMatchmakingMode): MatchRecordMode =>
  mode === "ranked" ? "ranked" : "headToHead";

export const fetchDeliverableOwnerResult = async (
  mode: GhostMatchmakingMode,
  playerId: string,
): Promise<DeliveredOwnerResult | null> => {
  const status = await fetchPendingMatchmakingStatus({ mode, playerId });

  if (!status?.pendingResult) {
    return null;
  }

  const pending = status.pendingResult;
  const recordMode = toMatchRecordMode(mode);
  const record = recordMatchResult(pending.ownerResult, recordMode);
  const team = loadTeamProfile() ?? { name: "Front Office" };

  if (mode === "ranked") {
    const ranked = applyRankedMatchResult({
      result: pending.ownerResult,
      opponentElo: pending.opponentElo,
      winStreak: record.winStreak,
      lossStreak: record.lossStreak,
    });

    upsertRankedLeaderboardEntry({
      playerId: record.playerId,
      name: team.name,
      publicTag: getOrCreatePlayerIdentity().publicTag,
      elo: ranked.profile.elo,
      wins: record.wins,
      losses: record.losses,
      winStreak: record.winStreak,
      lossStreak: record.lossStreak,
      isNpc: false,
    });

    return {
      mode,
      result: pending,
      ranked: {
        delta: ranked.delta,
        elo: ranked.profile.elo,
        tierLabel: ranked.profile.tier.label,
        opponentElo: ranked.opponentElo,
      },
    };
  }

  const classic = applyClassicMatchResult({
    result: pending.ownerResult,
    opponentElo: pending.opponentElo,
    winStreak: record.winStreak,
    lossStreak: record.lossStreak,
  });

  upsertLeaderboardEntry({
    ...buildLeaderboardIdentity(team, record),
    elo: classic.profile.elo,
  });

  return {
    mode,
    result: pending,
    classic: {
      delta: classic.delta,
      elo: classic.profile.elo,
      tierLabel: classic.profile.tier.label,
      opponentElo: classic.opponentElo,
    },
  };
};

export const finalizeDeliveredOwnerResult = async (
  delivery: DeliveredOwnerResult,
  playerId: string,
) => {
  clearPendingLineupState(delivery.mode, playerId);
  await acknowledgePendingOwnerResult(delivery.result.id);
};
