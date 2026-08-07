import {
  acknowledgePendingOwnerResult,
  fetchPendingMatchmakingStatus,
  type GhostMatchmakingMode,
  type PendingOwnerResult,
} from "./ghostMatchmaking";
import { confirmRemoteLeaderboardRank } from "./leaderboardRemote";
import {
  persistMatchOutcome,
  type ClassicMatchOutcome,
  type RankedMatchOutcome,
} from "./matchOutcome";
import { clearPendingLineupState } from "./pendingLineup";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import type { MatchRecordMode } from "./playerRecord";
import { loadTeamProfile } from "./teamProfile";

export interface DeliveredOwnerResult {
  mode: Extract<GhostMatchmakingMode, "classic" | "ranked">;
  result: PendingOwnerResult;
  classic?: ClassicMatchOutcome;
  ranked?: RankedMatchOutcome;
}

const toMatchRecordMode = (
  mode: Extract<GhostMatchmakingMode, "classic" | "ranked">,
): MatchRecordMode => (mode === "ranked" ? "ranked" : "headToHead");

export const fetchDeliverableOwnerResult = async (
  mode: Extract<GhostMatchmakingMode, "classic" | "ranked">,
  playerId: string,
): Promise<DeliveredOwnerResult | null> => {
  const status = await fetchPendingMatchmakingStatus({ mode, playerId });

  if (!status?.pendingResult) {
    return null;
  }

  const pending = status.pendingResult;
  if (
    pending.ownerResult !== "win" &&
    pending.ownerResult !== "loss" &&
    pending.ownerResult !== "tie"
  ) {
    return null;
  }

  const team = loadTeamProfile() ?? { name: "Front Office" };
  const recordMode = toMatchRecordMode(mode);
  const outcome = persistMatchOutcome(
    pending.ownerResult,
    team,
    pending.id,
    recordMode,
    { opponentElo: pending.opponentElo },
  );

  const banners = outcome.ranked ?? outcome.classic;
  if (banners) {
    const identity = getOrCreatePlayerIdentity();
    void confirmRemoteLeaderboardRank({
      mode: mode === "ranked" ? "ranked" : "classic",
      playerId: identity.playerId,
      teamName: team.name,
      publicTag: identity.publicTag,
      elo: banners.elo,
      wins: banners.wins,
      losses: banners.losses,
      winStreak: banners.winStreak,
      lossStreak: banners.lossStreak,
    });
  }

  return {
    mode,
    result: pending,
    classic: outcome.classic,
    ranked: outcome.ranked,
  };
};

export const finalizeDeliveredOwnerResult = async (
  delivery: DeliveredOwnerResult,
  playerId: string,
) => {
  clearPendingLineupState(delivery.mode, playerId);
  await acknowledgePendingOwnerResult(delivery.result.id);
};
