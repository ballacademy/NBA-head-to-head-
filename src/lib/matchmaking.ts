import {
  fetchGhostOpponent,
  fetchPendingMatchmakingStatus,
  type GhostMatchmakingMode,
  type GhostOpponentSnapshot,
} from "./ghostMatchmaking";
import {
  searchLiveOpponent,
  type LiveOpponentSnapshot,
} from "./liveMatchmaking";
import { resolveMatchmakingSearchMs } from "./matchmakingTiming";
import {
  clearPendingLineupState,
  loadPendingLineupState,
  savePendingLineupState,
} from "./pendingLineup";
import {
  LIVE_OPPONENT_ONLY_MIN_ELO,
  RATING_LABEL,
  requiresLiveOpponentOnly,
} from "./rankedElo";

export type StartMatchError =
  | "pending_unlock"
  | "daily_completed"
  | "pending_lineup_locked"
  | "setup_failed";

export type HeadToHeadMatchmakingPlan =
  | {
      kind: "live";
      live: LiveOpponentSnapshot;
    }
  | {
      kind: "ghost";
      ghost: GhostOpponentSnapshot;
    }
  | {
      kind: "npc";
    }
  | {
      kind: "queue_for_live";
    };

export const syncPendingLineupLock = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
}) => {
  const remote = await fetchPendingMatchmakingStatus(params);
  const local = loadPendingLineupState(params.mode, params.playerId);

  if (remote?.queuedLineup) {
    savePendingLineupState(
      {
        storedLineupId: remote.queuedLineup.id,
        mode: params.mode,
        submittedAt: remote.queuedLineup.createdAt,
      },
      params.playerId,
    );
    return remote;
  }

  if (local && !remote?.pendingResult) {
    clearPendingLineupState(params.mode, params.playerId);
  }

  return remote;
};

export const isHeadToHeadLineupLocked = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
  playerElo: number;
}) => {
  if (!requiresLiveOpponentOnly(params.playerElo)) {
    return false;
  }

  const status = await syncPendingLineupLock(params);
  return Boolean(status?.queuedLineup || loadPendingLineupState(params.mode, params.playerId));
};

export const planHeadToHeadMatchmaking = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
  playerElo: number;
  teamName: string;
}): Promise<
  | { ok: true; plan: HeadToHeadMatchmakingPlan }
  | { ok: false; error: StartMatchError }
> => {
  if (await isHeadToHeadLineupLocked(params)) {
    return { ok: false, error: "pending_lineup_locked" };
  }

  const searchMs = resolveMatchmakingSearchMs();

  const live = await searchLiveOpponent(
    {
      mode: params.mode,
      playerId: params.playerId,
      teamName: params.teamName,
      elo: params.playerElo,
    },
    { searchMs },
  );

  if (live) {
    return { ok: true, plan: { kind: "live", live } };
  }

  const ghost = await fetchGhostOpponent({
    mode: params.mode,
    playerId: params.playerId,
    elo: params.playerElo,
  });

  if (ghost) {
    return { ok: true, plan: { kind: "ghost", ghost } };
  }

  if (requiresLiveOpponentOnly(params.playerElo)) {
    return { ok: true, plan: { kind: "queue_for_live" } };
  }

  return { ok: true, plan: { kind: "npc" } };
};

export const getStartMatchErrorMessage = (error: StartMatchError) => {
  switch (error) {
    case "pending_unlock":
      return "Choose your unlock before drafting again.";
    case "daily_completed":
      return "You've already completed today's Daily Draft. Come back tomorrow.";
    case "pending_lineup_locked":
      return `Your queued lineup is still waiting for a live opponent at ${LIVE_OPPONENT_ONLY_MIN_ELO}+ ${RATING_LABEL}. You can play again once that lineup receives a score.`;
    case "setup_failed":
    default:
      return "Couldn't start this draft. Refresh the page and try again.";
  }
};
