import {
  buildLiveAutofillLineup,
  LIVE_MATCH_LINEUP_WAIT_MS,
} from "./liveAutofillLineup";
import {
  MATCHMAKING_POLL_INTERVAL_MS,
  releaseGhostOpponentClaim,
} from "./ghostMatchmaking";
import { resolveMatchmakingSearchMs } from "./matchmakingTiming";
import type { GhostMatchmakingMode } from "./ghostMatchmaking";
import type { Player } from "./types";

export { LIVE_MATCH_LINEUP_WAIT_MS } from "./liveAutofillLineup";

export interface LiveOpponentSnapshot {
  matchId: string;
  teamName: string;
  elo: number;
  playerId: string;
  username?: string;
}

export interface LiveMatchState {
  matchId: string;
  opponentTeamName: string;
  opponentElo: number;
  opponentPlayerId: string;
  opponentUsername?: string;
  selfReady: boolean;
  opponentReady: boolean;
  selfLineup: string[] | null;
  opponentLineup: string[] | null;
}

export type FetchLiveMatchResult =
  | { ok: true; state: LiveMatchState }
  | { ok: false; error: "not_found" | "forbidden" | "unavailable" };

export type JoinMatchmakingResult =
  | { status: "matched"; opponent: LiveOpponentSnapshot }
  | { status: "waiting"; joinedAt: string }
  | { status: "unavailable" };

export type LiveSearchOutcome =
  | { status: "matched"; opponent: LiveOpponentSnapshot }
  | { status: "timeout" }
  | { status: "cancelled" }
  | { status: "unavailable" };

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const joinMatchmakingQueue = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
  teamName: string;
  elo: number;
}): Promise<JoinMatchmakingResult> => {
  try {
    const response = await fetch(buildUrl("/api/queue"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        mode: params.mode,
        playerId: params.playerId,
        teamName: params.teamName,
        elo: Math.round(params.elo),
      }),
    });

    if (!response.ok) {
      return { status: "unavailable" };
    }

    const payload = (await response.json()) as {
      status: "matched" | "waiting";
      matchId?: string;
      joinedAt?: string;
      opponent?: {
        teamName: string;
        elo: number;
        playerId: string;
        username?: string | null;
      };
    };

    if (payload.status === "matched" && payload.matchId && payload.opponent) {
      return {
        status: "matched",
        opponent: {
          matchId: payload.matchId,
          teamName: payload.opponent.teamName,
          elo: payload.opponent.elo,
          playerId: payload.opponent.playerId,
          username: payload.opponent.username?.trim() || undefined,
        },
      };
    }

    if (payload.status === "waiting" && payload.joinedAt) {
      return { status: "waiting", joinedAt: payload.joinedAt };
    }

    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
};

export const pollMatchmakingQueue = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
}): Promise<LiveOpponentSnapshot | null> => {
  try {
    const search = new URLSearchParams({
      mode: params.mode,
      playerId: params.playerId,
    });
    const response = await fetch(`${buildUrl("/api/queue")}?${search.toString()}`, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      status: string;
      matchId?: string;
      teamName?: string;
      elo?: number;
      playerId?: string;
      username?: string | null;
    };

    if (
      payload.status === "matched" &&
      payload.matchId &&
      payload.teamName &&
      typeof payload.elo === "number" &&
      payload.playerId
    ) {
      return {
        matchId: payload.matchId,
        teamName: payload.teamName,
        elo: payload.elo,
        playerId: payload.playerId,
        username: payload.username?.trim() || undefined,
      };
    }

    return null;
  } catch {
    return null;
  }
};

export const leaveMatchmakingQueue = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
}) => {
  try {
    const search = new URLSearchParams({
      mode: params.mode,
      playerId: params.playerId,
    });
    await fetch(`${buildUrl("/api/queue")}?${search.toString()}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
    });
  } catch {
    // Ignore cleanup failures; queue entries expire automatically.
  }

  await releaseGhostOpponentClaim(params);
};

export const searchLiveOpponentDetailed = async (
  params: {
    mode: GhostMatchmakingMode;
    playerId: string;
    teamName: string;
    elo: number;
  },
  options: {
    searchMs?: number;
    pollIntervalMs?: number;
    isCancelled?: () => boolean;
  } = {},
): Promise<LiveSearchOutcome> => {
  const searchMs = options.searchMs ?? resolveMatchmakingSearchMs();
  const pollIntervalMs = options.pollIntervalMs ?? MATCHMAKING_POLL_INTERVAL_MS;
  const isCancelled = options.isCancelled ?? (() => false);

  if (isCancelled()) {
    return { status: "cancelled" };
  }

  const joined = await joinMatchmakingQueue(params);

  if (joined.status === "unavailable") {
    return { status: "unavailable" };
  }

  if (joined.status === "matched") {
    return { status: "matched", opponent: joined.opponent };
  }

  const deadline = Date.now() + searchMs;

  while (Date.now() < deadline) {
    if (isCancelled()) {
      await leaveMatchmakingQueue({
        mode: params.mode,
        playerId: params.playerId,
      });
      return { status: "cancelled" };
    }

    const opponent = await pollMatchmakingQueue({
      mode: params.mode,
      playerId: params.playerId,
    });

    if (opponent) {
      return { status: "matched", opponent };
    }

    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      break;
    }

    await sleep(Math.min(pollIntervalMs, remaining));
  }

  // Final poll before leaving — a concurrent claim may have matched us.
  const lateMatch = await pollMatchmakingQueue({
    mode: params.mode,
    playerId: params.playerId,
  });

  if (lateMatch) {
    return { status: "matched", opponent: lateMatch };
  }

  if (isCancelled()) {
    const cancelledMatch = await pollMatchmakingQueue({
      mode: params.mode,
      playerId: params.playerId,
    });
    if (cancelledMatch) {
      return { status: "matched", opponent: cancelledMatch };
    }

    await leaveMatchmakingQueue({
      mode: params.mode,
      playerId: params.playerId,
    });
    return { status: "cancelled" };
  }

  await leaveMatchmakingQueue({
    mode: params.mode,
    playerId: params.playerId,
  });

  // One more check after leave in case DELETE raced with a claim that already
  // created a live match row (GET still finds matches by player id).
  const afterLeave = await pollMatchmakingQueue({
    mode: params.mode,
    playerId: params.playerId,
  });

  if (afterLeave) {
    return { status: "matched", opponent: afterLeave };
  }

  return { status: "timeout" };
};

export const searchLiveOpponent = async (
  params: {
    mode: GhostMatchmakingMode;
    playerId: string;
    teamName: string;
    elo: number;
  },
  options: {
    searchMs?: number;
    pollIntervalMs?: number;
    isCancelled?: () => boolean;
  } = {},
): Promise<LiveOpponentSnapshot | null> => {
  const outcome = await searchLiveOpponentDetailed(params, options);
  return outcome.status === "matched" ? outcome.opponent : null;
};

export const fetchLiveMatchStateDetailed = async (params: {
  matchId: string;
  playerId: string;
}): Promise<FetchLiveMatchResult> => {
  try {
    const search = new URLSearchParams({
      matchId: params.matchId,
      playerId: params.playerId,
    });
    const response = await fetch(
      `${buildUrl("/api/live-match")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (response.status === 404) {
      return { ok: false, error: "not_found" };
    }

    if (response.status === 403) {
      return { ok: false, error: "forbidden" };
    }

    if (!response.ok) {
      return { ok: false, error: "unavailable" };
    }

    return {
      ok: true,
      state: (await response.json()) as LiveMatchState,
    };
  } catch {
    return { ok: false, error: "unavailable" };
  }
};

export const fetchLiveMatchState = async (params: {
  matchId: string;
  playerId: string;
}): Promise<LiveMatchState | null> => {
  const result = await fetchLiveMatchStateDetailed(params);
  return result.ok ? result.state : null;
};

export const submitLiveMatchLineup = async (params: {
  matchId: string;
  playerId: string;
  lineup: string[];
}): Promise<LiveMatchState | null> => {
  try {
    const response = await fetch(buildUrl("/api/live-match"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      return (await response.json()) as LiveMatchState;
    }

    // Already locked (including server autofill of this side) — read shared state.
    if (response.status === 409) {
      return fetchLiveMatchState(params);
    }

    return null;
  } catch {
    return null;
  }
};

export const waitForLiveOpponentLineup = async (
  params: {
    matchId: string;
    playerId: string;
  },
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {},
): Promise<string[] | null> => {
  const timeoutMs = options.timeoutMs ?? LIVE_MATCH_LINEUP_WAIT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const state = await fetchLiveMatchState(params);

    if (state?.opponentReady && state.opponentLineup?.length === 5) {
      return state.opponentLineup;
    }

    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      break;
    }

    await sleep(Math.min(pollIntervalMs, remaining));
  }

  return null;
};

export const autofillLiveMatchOpponentLineup = async (params: {
  matchId: string;
  playerId: string;
  lineup: string[];
}): Promise<LiveMatchState | null> => {
  try {
    const response = await fetch(buildUrl("/api/live-match"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        matchId: params.matchId,
        playerId: params.playerId,
        lineup: params.lineup,
        autofillOpponentLineup: true,
      }),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as LiveMatchState;
  } catch {
    return null;
  }
};

export interface ResolvedLiveOpponentLineup {
  lineup: string[];
  autoDrafted: boolean;
}

/**
 * Wait for the opponent's locked lineup. If they time out, propose a seeded
 * autofill and lock it on the server so every client sees the same five.
 */
export const resolveLiveOpponentLineup = async (
  params: {
    matchId: string;
    playerId: string;
    opponentPlayerId: string;
    players: Player[];
    salaryCapLimit?: number;
  },
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {},
): Promise<ResolvedLiveOpponentLineup | null> => {
  const polled = await waitForLiveOpponentLineup(
    {
      matchId: params.matchId,
      playerId: params.playerId,
    },
    options,
  );

  if (polled) {
    return { lineup: polled, autoDrafted: false };
  }

  const proposed = buildLiveAutofillLineup({
    matchId: params.matchId,
    opponentPlayerId: params.opponentPlayerId,
    players: params.players,
    salaryCapLimit: params.salaryCapLimit,
  });

  if (proposed.length !== 5) {
    return null;
  }

  const locked = await autofillLiveMatchOpponentLineup({
    matchId: params.matchId,
    playerId: params.playerId,
    lineup: proposed,
  });

  if (locked?.opponentReady && locked.opponentLineup?.length === 5) {
    return {
      lineup: locked.opponentLineup,
      autoDrafted: true,
    };
  }

  // Opponent may have submitted in the race window — read once more.
  const fallback = await fetchLiveMatchState({
    matchId: params.matchId,
    playerId: params.playerId,
  });

  if (fallback?.opponentReady && fallback.opponentLineup?.length === 5) {
    return {
      lineup: fallback.opponentLineup,
      autoDrafted: false,
    };
  }

  return null;
};
