import { resolveMatchmakingSearchMs } from "./matchmakingTiming";
import { parseGhostOpponentSnapshot } from "./storedLineups";

export type GhostMatchmakingMode = "classic" | "ranked";

export interface GhostOpponentSnapshot {
  id: string;
  teamName: string;
  lineup: string[];
  elo: number;
  createdAt: string;
}

export interface StoredLineupSubmission {
  mode: GhostMatchmakingMode;
  playerId: string;
  teamName: string;
  lineup: string[];
  elo: number;
}

export interface PendingMatchmakingStatus {
  queuedLineup: { id: string; createdAt: string } | null;
}

export interface GhostMatchOutcomeSubmission {
  storedLineupId: string;
  mode: GhostMatchmakingMode;
  challengerPlayerId: string;
  challengerTeamName: string;
  challengerWon: boolean;
  challengerElo: number;
  userScore: number;
  opponentScore: number;
}

export const MATCHMAKING_POLL_INTERVAL_MS = 2_000;

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

const buildOpponentPath = (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
  elo: number;
}) => {
  const search = new URLSearchParams({
    mode: params.mode,
    playerId: params.playerId,
    elo: String(Math.round(params.elo)),
  });

  return `${buildUrl("/api/opponent")}?${search.toString()}`;
};

const buildPendingPath = (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
}) => {
  const search = new URLSearchParams({
    mode: params.mode,
    playerId: params.playerId,
  });

  return `${buildUrl("/api/pending")}?${search.toString()}`;
};

export const extractGhostStoredLineupId = (opponentId: string) =>
  opponentId.startsWith("ghost-") ? opponentId.slice("ghost-".length) : null;

export const fetchGhostOpponent = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
  elo: number;
}): Promise<GhostOpponentSnapshot | null> => {
  try {
    const response = await fetch(buildOpponentPath(params), {
      headers: { accept: "application/json" },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return parseGhostOpponentSnapshot(await response.json());
  } catch {
    return null;
  }
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const searchGhostOpponent = async (
  params: {
    mode: GhostMatchmakingMode;
    playerId: string;
    elo: number;
  },
  options: {
    searchMs?: number;
    pollIntervalMs?: number;
  } = {},
): Promise<GhostOpponentSnapshot | null> => {
  const searchMs = options.searchMs ?? resolveMatchmakingSearchMs();
  const pollIntervalMs = options.pollIntervalMs ?? MATCHMAKING_POLL_INTERVAL_MS;
  const deadline = Date.now() + searchMs;

  while (Date.now() < deadline) {
    const opponent = await fetchGhostOpponent(params);

    if (opponent) {
      return opponent;
    }

    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      break;
    }

    await sleep(Math.min(pollIntervalMs, remaining));
  }

  return null;
};

export const fetchPendingMatchmakingStatus = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
}): Promise<PendingMatchmakingStatus | null> => {
  try {
    const response = await fetch(buildPendingPath(params), {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PendingMatchmakingStatus;
  } catch {
    return null;
  }
};

export const submitStoredLineup = async (
  submission: StoredLineupSubmission,
): Promise<{ id: string; createdAt: string } | null> => {
  try {
    const response = await fetch(buildUrl("/api/lineups"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as { id: string; createdAt: string };
  } catch {
    return null;
  }
};

export const submitGhostMatchOutcome = async (
  submission: GhostMatchOutcomeSubmission,
): Promise<boolean> => {
  try {
    const response = await fetch(buildUrl("/api/match-results"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        storedLineupId: submission.storedLineupId,
        mode: submission.mode,
        challengerPlayerId: submission.challengerPlayerId,
        challengerTeamName: submission.challengerTeamName,
        challengerWon: submission.challengerWon,
        challengerElo: submission.challengerElo,
        userScore: submission.userScore,
        opponentScore: submission.opponentScore,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
};
