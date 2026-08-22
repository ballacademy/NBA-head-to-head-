import type { LiveOpponentSnapshot } from "./liveMatchmaking";
import { MATCHMAKING_POLL_INTERVAL_MS } from "./ghostMatchmaking";
import {
  fetchWithTimeout,
  PRIVATE_ROOM_ABORTED_MESSAGE,
  PRIVATE_ROOM_CANCEL_TIMEOUT_MS,
  PRIVATE_ROOM_FETCH_TIMEOUT_MS,
  type PrivateMatchMode,
} from "./privateMatchmaking";

const API_BASE = "";
const buildUrl = (path: string) => `${API_BASE}${path}`;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const isAbortError = (error: unknown) =>
  Boolean(
    error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError",
  );

const PRIVATE_REMATCH_UNAVAILABLE =
  "Private rematch is temporarily unavailable. Try again in a moment.";
const PRIVATE_REMATCH_UNREACHABLE =
  "Could not reach rematch servers. Check your connection and try again.";

export interface PrivateRematchWaiting {
  status: "waiting";
  sourceMatchId: string;
  expiresAt: string;
}

export interface PrivateRematchMatched {
  status: "matched";
  sourceMatchId: string;
  matchId: string;
  mode: PrivateMatchMode;
  opponent: LiveOpponentSnapshot;
}

const readError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const mapFailure = async (response: Response) => {
  if (response.status >= 500) {
    return PRIVATE_REMATCH_UNAVAILABLE;
  }
  return readError(response);
};

const parseMatched = (
  payload: {
    status?: string;
    sourceMatchId?: string;
    matchId?: string;
    mode?: PrivateMatchMode;
    opponent?: {
      playerId?: string;
      teamName?: string;
      elo?: number;
      username?: string | null;
    };
  },
  fallbackSourceMatchId: string,
): PrivateRematchMatched | null => {
  if (
    payload.status !== "matched" ||
    !payload.matchId ||
    !payload.mode ||
    !payload.opponent?.playerId ||
    !payload.opponent.teamName
  ) {
    return null;
  }

  return {
    status: "matched",
    sourceMatchId: payload.sourceMatchId ?? fallbackSourceMatchId,
    matchId: payload.matchId,
    mode: payload.mode,
    opponent: {
      matchId: payload.matchId,
      playerId: payload.opponent.playerId,
      teamName: payload.opponent.teamName,
      elo: Math.round(payload.opponent.elo ?? 500),
      username: payload.opponent.username?.trim() || undefined,
    },
  };
};

export const offerPrivateRematch = async (params: {
  sourceMatchId: string;
  playerId: string;
  teamName: string;
  elo: number;
  signal?: AbortSignal;
}): Promise<
  PrivateRematchWaiting | PrivateRematchMatched | { error: string }
> => {
  try {
    const response = await fetchWithTimeout(
      buildUrl("/api/private-rematch"),
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sourceMatchId: params.sourceMatchId,
          playerId: params.playerId,
          teamName: params.teamName,
          elo: Math.round(params.elo),
        }),
        signal: params.signal,
      },
      PRIVATE_ROOM_FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      return { error: await mapFailure(response) };
    }

    const payload = (await response.json()) as {
      status?: string;
      sourceMatchId?: string;
      expiresAt?: string;
      matchId?: string;
      mode?: PrivateMatchMode;
      opponent?: {
        playerId?: string;
        teamName?: string;
        elo?: number;
        username?: string | null;
      };
    };

    if (payload.status === "waiting" && payload.expiresAt) {
      return {
        status: "waiting",
        sourceMatchId: payload.sourceMatchId ?? params.sourceMatchId,
        expiresAt: payload.expiresAt,
      };
    }

    const matched = parseMatched(payload, params.sourceMatchId);
    if (matched) {
      return matched;
    }

    return { error: "Could not start rematch" };
  } catch (error) {
    if (isAbortError(error) || params.signal?.aborted) {
      return { error: PRIVATE_ROOM_ABORTED_MESSAGE };
    }
    return { error: PRIVATE_REMATCH_UNREACHABLE };
  }
};

export const pollPrivateRematch = async (params: {
  sourceMatchId: string;
  playerId: string;
  signal?: AbortSignal;
}): Promise<
  | PrivateRematchWaiting
  | PrivateRematchMatched
  | { status: "expired" | "cancelled" }
  | { error: string }
> => {
  try {
    const search = new URLSearchParams({
      matchId: params.sourceMatchId,
      playerId: params.playerId,
    });
    const response = await fetchWithTimeout(
      `${buildUrl("/api/private-rematch")}?${search.toString()}`,
      { headers: { accept: "application/json" }, signal: params.signal },
      PRIVATE_ROOM_FETCH_TIMEOUT_MS,
    );

    if (response.status === 410) {
      try {
        const payload = (await response.json()) as { status?: string };
        if (payload.status === "cancelled") {
          return { status: "cancelled" };
        }
      } catch {
        /* treat as expired */
      }
      return { status: "expired" };
    }

    if (!response.ok) {
      return { error: await mapFailure(response) };
    }

    const payload = (await response.json()) as {
      status?: string;
      sourceMatchId?: string;
      expiresAt?: string;
      matchId?: string;
      mode?: PrivateMatchMode;
      opponent?: {
        playerId?: string;
        teamName?: string;
        elo?: number;
        username?: string | null;
      };
    };

    if (payload.status === "waiting" && payload.expiresAt) {
      return {
        status: "waiting",
        sourceMatchId: payload.sourceMatchId ?? params.sourceMatchId,
        expiresAt: payload.expiresAt,
      };
    }

    const matched = parseMatched(payload, params.sourceMatchId);
    if (matched) {
      return matched;
    }

    return { error: "Unexpected rematch response" };
  } catch (error) {
    if (isAbortError(error) || params.signal?.aborted) {
      return { error: PRIVATE_ROOM_ABORTED_MESSAGE };
    }
    return { error: PRIVATE_REMATCH_UNREACHABLE };
  }
};

export const cancelPrivateRematch = async (params: {
  sourceMatchId: string;
  playerId: string;
  signal?: AbortSignal;
}): Promise<boolean> => {
  try {
    const search = new URLSearchParams({
      matchId: params.sourceMatchId,
      playerId: params.playerId,
    });
    const response = await fetchWithTimeout(
      `${buildUrl("/api/private-rematch")}?${search.toString()}`,
      {
        method: "DELETE",
        headers: { accept: "application/json" },
        signal: params.signal,
      },
      PRIVATE_ROOM_CANCEL_TIMEOUT_MS,
    );
    return response.ok;
  } catch {
    return false;
  }
};

/** Wait until the opponent also rematches (or cancel/expire). */
export const waitForPrivateRematch = async (
  params: {
    sourceMatchId: string;
    playerId: string;
  },
  options: {
    isCancelled?: () => boolean;
    signal?: AbortSignal;
    pollIntervalMs?: number;
    maxConsecutiveErrors?: number;
  } = {},
): Promise<
  | { ok: true; matched: PrivateRematchMatched }
  | { ok: false; error: "cancelled" | "expired" | "setup_failed" }
> => {
  const pollIntervalMs = options.pollIntervalMs ?? MATCHMAKING_POLL_INTERVAL_MS;
  const maxConsecutiveErrors = options.maxConsecutiveErrors ?? 5;
  let consecutiveErrors = 0;

  const cancelled = () =>
    Boolean(options.isCancelled?.() || options.signal?.aborted);

  while (!cancelled()) {
    const poll = await pollPrivateRematch({ ...params, signal: options.signal });

    if ("error" in poll) {
      if (poll.error === PRIVATE_ROOM_ABORTED_MESSAGE || cancelled()) {
        break;
      }
      consecutiveErrors += 1;
      if (consecutiveErrors >= maxConsecutiveErrors) {
        await cancelPrivateRematch(params);
        return { ok: false, error: "setup_failed" };
      }
      try {
        await sleep(pollIntervalMs, options.signal);
      } catch {
        break;
      }
      continue;
    }

    consecutiveErrors = 0;

    if (poll.status === "matched") {
      return { ok: true, matched: poll };
    }

    if (poll.status === "expired" || poll.status === "cancelled") {
      if (poll.status === "expired") {
        await cancelPrivateRematch(params);
      }
      return { ok: false, error: poll.status };
    }

    try {
      await sleep(pollIntervalMs, options.signal);
    } catch {
      break;
    }
  }

  const lastPoll = await pollPrivateRematch(params);
  if (!("error" in lastPoll) && lastPoll.status === "matched") {
    return { ok: true, matched: lastPoll };
  }

  await cancelPrivateRematch(params);
  return { ok: false, error: "cancelled" };
};
