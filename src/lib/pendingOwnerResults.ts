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
import { recordNbaPlayerMatchUsage } from "./nbaPlayerUsage";
import { clearPendingLineupState } from "./pendingLineup";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import type { MatchRecordMode } from "./playerRecord";
import { loadTeamProfile } from "./teamProfile";
import { logQueuedMatchGameEntry } from "./matchGameLog";
import { runTruthyWithRetry } from "./cloudPullRetry";

export interface DeliveredOwnerResult {
  mode: Extract<GhostMatchmakingMode, "classic" | "ranked">;
  result: PendingOwnerResult;
  classic?: ClassicMatchOutcome;
  ranked?: RankedMatchOutcome;
}

export const QUEUED_OWNER_INBOX_COPY =
  "These matches already updated Banners and this month's W–L. Win/loss streaks only change when you play live.";

export const QUEUED_OWNER_DETAIL_COPY =
  "Banners and this month's W–L already updated. Your win/loss streak did not.";

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
    {
      opponentElo: pending.opponentElo,
      // Live matches only — queued lineup results still move Banners / W–L.
      countTowardStreak: false,
    },
  );

  recordNbaPlayerMatchUsage({
    recordKey: pending.id,
    playerIds: pending.ownerLineup,
    mode: recordMode === "ranked" ? "ranked" : "headToHead",
    result: pending.ownerResult,
  });

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

  logQueuedMatchGameEntry({
    matchId: pending.id,
    mode: mode === "ranked" ? "ranked" : "classic",
    result: pending.ownerResult,
    opponentName: pending.opponentTeamName,
    ownerScore: pending.ownerScore,
    opponentScore: pending.opponentScore,
    bannerDelta: banners?.delta,
    // Stamp the match time from the server, not inbox-open / delivery time.
    recordedAt: pending.createdAt,
  });

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
): Promise<{
  ok: boolean;
  deliveries: DeliveredOwnerResult[];
}> => {
  const status = await fetchPendingMatchmakingStatus({ mode, playerId });
  if (!status) {
    return { ok: false, deliveries: [] };
  }

  const pendingList =
    status.pendingResults?.length
      ? status.pendingResults
      : status.pendingResult
        ? [status.pendingResult]
        : [];

  const deliveries: DeliveredOwnerResult[] = [];

  for (const pending of pendingList) {
    const delivery = deliverPendingResult(mode, pending);
    if (delivery) {
      deliveries.push(delivery);
    }
  }

  return { ok: true, deliveries };
};

/** @deprecated Prefer fetchDeliverableOwnerResults for batch inbox delivery. */
export const fetchDeliverableOwnerResult = async (
  mode: Extract<GhostMatchmakingMode, "classic" | "ranked">,
  playerId: string,
): Promise<DeliveredOwnerResult | null> => {
  const result = await fetchDeliverableOwnerResults(mode, playerId);
  return result.deliveries[0] ?? null;
};

export const finalizeDeliveredOwnerResults = async (
  deliveries: DeliveredOwnerResult[],
  playerId: string,
): Promise<boolean> => {
  if (deliveries.length === 0) {
    return true;
  }

  const acked = await runTruthyWithRetry({
    run: async () =>
      (await acknowledgePendingOwnerResults({
        resultIds: deliveries.map((delivery) => delivery.result.id),
        playerId,
      }))
        ? true
        : null,
  });

  if (!acked) {
    return false;
  }

  const modes = new Set(deliveries.map((delivery) => delivery.mode));
  for (const mode of modes) {
    clearPendingLineupState(mode, playerId);
  }

  return true;
};

export const finalizeDeliveredOwnerResult = async (
  delivery: DeliveredOwnerResult,
  playerId: string,
): Promise<boolean> => finalizeDeliveredOwnerResults([delivery], playerId);
