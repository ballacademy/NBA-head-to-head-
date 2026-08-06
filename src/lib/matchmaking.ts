import {
  fetchGhostOpponent,
  fetchPendingMatchmakingStatus,
  type GhostMatchmakingMode,
  type GhostOpponentSnapshot,
} from "./ghostMatchmaking";
import {
  searchLiveOpponentDetailed,
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

const EVENT_LIVE_SEARCH_MS = 45_000;
const EVENT_REJOIN_PAUSE_MS = 400;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export type StartMatchError =
  | "pending_unlock"
  | "daily_completed"
  | "pending_lineup_locked"
  | "event_limit_reached"
  | "matchmaking_unavailable"
  | "setup_failed"
  | "cancelled";

export type HeadToHeadMatchmakingPlan =
  | {
      kind: "live";
      live: LiveOpponentSnapshot;
    }
  | {
      kind: "ghost";
      ghost: GhostOpponentSnapshot;
      liveUnavailable?: boolean;
    }
  | {
      kind: "npc";
      liveUnavailable?: boolean;
    }
  | {
      kind: "queue_for_live";
      liveUnavailable?: boolean;
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

  if (remote === null) {
    return null;
  }

  if (local && !remote.queuedLineup) {
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

export const planHeadToHeadMatchmaking = async (
  params: {
    mode: GhostMatchmakingMode;
    playerId: string;
    playerElo: number;
    teamName: string;
    starCount: number;
  },
  options: {
    isCancelled?: () => boolean;
  } = {},
): Promise<
  | { ok: true; plan: HeadToHeadMatchmakingPlan }
  | { ok: false; error: StartMatchError }
> => {
  if (await isHeadToHeadLineupLocked(params)) {
    return { ok: false, error: "pending_lineup_locked" };
  }

  const searchMs = resolveMatchmakingSearchMs();

  const outcome = await searchLiveOpponentDetailed(
    {
      mode: params.mode,
      playerId: params.playerId,
      teamName: params.teamName,
      elo: params.playerElo,
    },
    { searchMs, isCancelled: options.isCancelled },
  );

  if (outcome.status === "matched") {
    return { ok: true, plan: { kind: "live", live: outcome.opponent } };
  }

  if (outcome.status === "cancelled" || options.isCancelled?.()) {
    return { ok: false, error: "cancelled" };
  }

  const liveUnavailable = outcome.status === "unavailable";

  const ghost = await fetchGhostOpponent({
    mode: params.mode,
    playerId: params.playerId,
    elo: params.playerElo,
    starCount: params.starCount,
  });

  if (ghost) {
    return {
      ok: true,
      plan: { kind: "ghost", ghost, liveUnavailable },
    };
  }

  if (requiresLiveOpponentOnly(params.playerElo)) {
    return {
      ok: true,
      plan: { kind: "queue_for_live", liveUnavailable },
    };
  }

  return { ok: true, plan: { kind: "npc", liveUnavailable } };
};

/** Weekly Events only match live opponents; keep searching until found or cancelled. */
export const planEventLiveMatchmaking = async (
  params: {
    playerId: string;
    playerElo: number;
    teamName: string;
  },
  options: {
    isCancelled?: () => boolean;
  } = {},
): Promise<
  | { ok: true; plan: Extract<HeadToHeadMatchmakingPlan, { kind: "live" }> }
  | { ok: false; error: StartMatchError }
> => {
  let consecutiveUnavailable = 0;

  while (!options.isCancelled?.()) {
    const outcome = await searchLiveOpponentDetailed(
      {
        mode: "event",
        playerId: params.playerId,
        teamName: params.teamName,
        elo: params.playerElo,
      },
      {
        searchMs: EVENT_LIVE_SEARCH_MS,
        isCancelled: options.isCancelled,
      },
    );

    if (outcome.status === "matched") {
      return { ok: true, plan: { kind: "live", live: outcome.opponent } };
    }

    if (outcome.status === "cancelled") {
      break;
    }

    if (outcome.status === "unavailable") {
      consecutiveUnavailable += 1;
      if (consecutiveUnavailable >= 3) {
        return { ok: false, error: "matchmaking_unavailable" };
      }
    } else {
      consecutiveUnavailable = 0;
    }

    if (options.isCancelled?.()) {
      break;
    }

    await sleep(EVENT_REJOIN_PAUSE_MS);
  }

  return { ok: false, error: "cancelled" };
};

export const getStartMatchErrorMessage = (error: StartMatchError) => {
  switch (error) {
    case "pending_unlock":
      return "Choose your unlock before drafting again.";
    case "daily_completed":
      return "You've already completed today's Daily Draft. Come back tomorrow.";
    case "pending_lineup_locked":
      return `Your queued lineup is still waiting for a live opponent at ${LIVE_OPPONENT_ONLY_MIN_ELO}+ ${RATING_LABEL}. You can play again once that lineup is matched.`;
    case "event_limit_reached":
      return "You've used all 30 entries for this week's event. Check back next week.";
    case "matchmaking_unavailable":
      return "Live matchmaking is temporarily unavailable. Try again in a moment.";
    case "setup_failed":
    default:
      return "Couldn't start this draft. Refresh the page and try again.";
  }
};
