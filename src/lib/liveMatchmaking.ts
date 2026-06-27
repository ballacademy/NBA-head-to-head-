import { MATCHMAKING_POLL_INTERVAL_MS } from "./ghostMatchmaking";
import { resolveMatchmakingSearchMs } from "./matchmakingTiming";
import type { GhostMatchmakingMode } from "./ghostMatchmaking";

export interface LiveOpponentSnapshot {
  matchId: string;
  teamName: string;
  elo: number;
  playerId: string;
}

export interface LiveMatchState {
  matchId: string;
  opponentTeamName: string;
  opponentElo: number;
  opponentPlayerId: string;
  selfReady: boolean;
  opponentReady: boolean;
  opponentLineup: string[] | null;
}

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
}): Promise<
  | { status: "matched"; opponent: LiveOpponentSnapshot }
  | { status: "waiting"; joinedAt: string }
  | null
> => {
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
      return null;
    }

    const payload = (await response.json()) as {
      status: "matched" | "waiting";
      matchId?: string;
      joinedAt?: string;
      opponent?: {
        teamName: string;
        elo: number;
        playerId: string;
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
        },
      };
    }

    if (payload.status === "waiting" && payload.joinedAt) {
      return { status: "waiting", joinedAt: payload.joinedAt };
    }

    return null;
  } catch {
    return null;
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
  } = {},
): Promise<LiveOpponentSnapshot | null> => {
  const searchMs = options.searchMs ?? resolveMatchmakingSearchMs();
  const pollIntervalMs = options.pollIntervalMs ?? MATCHMAKING_POLL_INTERVAL_MS;
  const joined = await joinMatchmakingQueue(params);

  if (!joined) {
    return null;
  }

  if (joined.status === "matched") {
    return joined.opponent;
  }

  const deadline = Date.now() + searchMs;

  while (Date.now() < deadline) {
    const opponent = await pollMatchmakingQueue({
      mode: params.mode,
      playerId: params.playerId,
    });

    if (opponent) {
      return opponent;
    }

    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      break;
    }

    await sleep(Math.min(pollIntervalMs, remaining));
  }

  await leaveMatchmakingQueue({
    mode: params.mode,
    playerId: params.playerId,
  });

  return null;
};

export const fetchLiveMatchState = async (params: {
  matchId: string;
  playerId: string;
}): Promise<LiveMatchState | null> => {
  try {
    const search = new URLSearchParams({
      matchId: params.matchId,
      playerId: params.playerId,
    });
    const response = await fetch(
      `${buildUrl("/api/live-match")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as LiveMatchState;
  } catch {
    return null;
  }
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

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as LiveMatchState;
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
  const timeoutMs = options.timeoutMs ?? 120_000;
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
