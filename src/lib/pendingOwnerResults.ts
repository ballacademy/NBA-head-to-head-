import {
  acknowledgePendingOwnerResults,
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

const isValidOwnerResult = (
  pending: PendingOwnerResult,
): pending is PendingOwnerResult & {
  ownerResult: "win" | "loss" | "tie";
} =>
  pending.ownerResult === "win" ||
  pending.ownerResult === "loss" ||
  pending.ownerResult === "tie";

const deliverPendingResult = (
  mode: Extract<GhostMatchmakingMode, "classic" | "ranked">,
  pending: PendingOwnerResult,
): DeliveredOwnerResult | null => {
  if (!isValidOwnerResult(pending)) {
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

export const fetchDeliverableOwnerResults = async (
  mode: Extract<GhostMatchmakingMode, "classic" | "ranked">,
  playerId: string,
): Promise<DeliveredOwnerResult[]> => {
  const status = await fetchPendingMatchmakingStatus({ mode, playerId });
  const pendingList =
    status?.pendingResults?.length
      ? status.pendingResults
      : status?.pendingResult
        ? [status.pendingResult]
        : [];

  const deliveries: DeliveredOwnerResult[] = [];

  for (const pending of pendingList) {
    const delivery = deliverPendingResult(mode, pending);
    if (delivery) {
      deliveries.push(delivery);
    }
  }

  return deliveries;
};

/** @deprecated Prefer fetchDeliverableOwnerResults for batch inbox delivery. */
export const fetchDeliverableOwnerResult = async (
  mode: Extract<GhostMatchmakingMode, "classic" | "ranked">,
  playerId: string,
): Promise<DeliveredOwnerResult | null> => {
  const deliveries = await fetchDeliverableOwnerResults(mode, playerId);
  return deliveries[0] ?? null;
};

export const finalizeDeliveredOwnerResults = async (
  deliveries: DeliveredOwnerResult[],
  playerId: string,
) => {
  if (deliveries.length === 0) {
    return;
  }

  const modes = new Set(deliveries.map((delivery) => delivery.mode));
  for (const mode of modes) {
    clearPendingLineupState(mode, playerId);
  }

  await acknowledgePendingOwnerResults({
    resultIds: deliveries.map((delivery) => delivery.result.id),
    playerId,
  });
};

export const finalizeDeliveredOwnerResult = async (
  delivery: DeliveredOwnerResult,
  playerId: string,
) => {
  await finalizeDeliveredOwnerResults([delivery], playerId);
};
