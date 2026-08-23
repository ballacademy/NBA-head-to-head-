import { apiFetch } from "./apiFetch";
import type { HeadToHeadResult } from "./playerRecord";
import { resolveMatchmakingSearchMs } from "./matchmakingTiming";
import { parseGhostOpponentSnapshot } from "./storedLineups";

export type GhostMatchmakingMode = "classic" | "ranked" | "event";

export interface GhostOpponentSnapshot {
  id: string;
  teamName: string;
  lineup: string[];
  elo: number;
  createdAt: string;
  publicPlayerId?: string;
  username?: string;
}

export interface StoredLineupSubmission {
  mode: GhostMatchmakingMode;
  playerId: string;
  teamName: string;
  lineup: string[];
  elo: number;
  practiceMode?: boolean;
  /** True when this lineup is waiting for a live claim (queue_for_live / 1500+). */
  awaitingLive?: boolean;
  salaryTotal: number;
  starCount: number;
}

export interface PendingOwnerResult {
  id: string;
  lineupId: string;
  mode: GhostMatchmakingMode;
  ownerResult: HeadToHeadResult;
  opponentTeamName: string;
  opponentElo: number;
  ownerLineup: string[];
  ownerScore: number;
  opponentScore: number;
  createdAt: string;
}

export interface PendingMatchmakingStatus {
  queuedLineup: { id: string; createdAt: string } | null;
  /** All unacked owner results for this mode (oldest first). */
  pendingResults: PendingOwnerResult[];
  /** First pending result — kept for older clients. */
  pendingResult: PendingOwnerResult | null;
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
  challengerLineup: string[];
}

export const MATCHMAKING_POLL_INTERVAL_MS = 2_000;

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

const buildOpponentPath = (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
  elo: number;
  starCount: number;
}) => {
  const search = new URLSearchParams({
    mode: params.mode,
    playerId: params.playerId,
    elo: String(Math.round(params.elo)),
    starCount: String(Math.round(params.starCount)),
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
  starCount: number;
}): Promise<GhostOpponentSnapshot | null> => {
  try {
    const response = await apiFetch(buildOpponentPath(params), {
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
    starCount: number;
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
    const response = await apiFetch(buildPendingPath(params), {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<PendingMatchmakingStatus>;
    const pendingResults = Array.isArray(payload.pendingResults)
      ? payload.pendingResults
      : payload.pendingResult
        ? [payload.pendingResult]
        : [];
    return {
      queuedLineup: payload.queuedLineup ?? null,
      pendingResults,
      pendingResult: pendingResults[0] ?? payload.pendingResult ?? null,
    };
  } catch {
    return null;
  }
};

export const acknowledgePendingOwnerResult = async (params: {
  resultId: string;
  playerId: string;
}): Promise<boolean> =>
  acknowledgePendingOwnerResults({
    resultIds: [params.resultId],
    playerId: params.playerId,
  });

export const acknowledgePendingOwnerResults = async (params: {
  resultIds: string[];
  playerId: string;
}): Promise<boolean> => {
  const resultIds = params.resultIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (resultIds.length === 0) {
    return true;
  }

  try {
    const response = await apiFetch(buildUrl("/api/pending"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        resultIds,
        playerId: params.playerId,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
};

export const releaseGhostOpponentClaim = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
}): Promise<boolean> => {
  try {
    const search = new URLSearchParams({
      mode: params.mode,
      playerId: params.playerId,
    });
    const response = await apiFetch(
      `${buildUrl("/api/opponent")}?${search.toString()}`,
      {
        method: "DELETE",
        headers: { accept: "application/json" },
      },
    );

    return response.ok;
  } catch {
    return false;
  }
};

export const submitStoredLineup = async (
  submission: StoredLineupSubmission,
): Promise<{ id: string; createdAt: string } | null> => {
  if (submission.practiceMode) {
    return null;
  }

  try {
    const response = await apiFetch(buildUrl("/api/lineups"), {
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
    const response = await apiFetch(buildUrl("/api/match-results"), {
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
        challengerLineup: submission.challengerLineup,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
};
