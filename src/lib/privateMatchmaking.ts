import type { LiveOpponentSnapshot } from "./liveMatchmaking";
import { MATCHMAKING_POLL_INTERVAL_MS } from "./ghostMatchmaking";

export type PrivateMatchMode = "classic" | "ranked";

export interface PrivateRoomWaiting {
  status: "waiting";
  roomCode: string;
  expiresAt: string;
}

export interface PrivateRoomMatched {
  status: "matched";
  roomCode: string;
  matchId: string;
  mode: PrivateMatchMode;
  opponent: LiveOpponentSnapshot;
}

const API_BASE = "";
const buildUrl = (path: string) => `${API_BASE}${path}`;

/** Private room create/join/poll should never hang the UI indefinitely. */
export const PRIVATE_ROOM_FETCH_TIMEOUT_MS = 15_000;
export const PRIVATE_ROOM_CANCEL_TIMEOUT_MS = 3_000;

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

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = PRIVATE_ROOM_FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const external = init.signal;
  const onExternalAbort = () => controller.abort();
  external?.addEventListener("abort", onExternalAbort);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onExternalAbort);
  }
};

const PRIVATE_ROOM_UNAVAILABLE =
  "Private match servers are temporarily unavailable. Try again in a moment.";
const PRIVATE_ROOM_UNREACHABLE =
  "Could not reach private match servers. Check your connection and try again.";
export const PRIVATE_ROOM_NOT_FOUND_MESSAGE =
  "That room doesn't exist or the code is invalid.";
export const PRIVATE_ROOM_ABORTED_MESSAGE = "cancelled";

const readError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

/** Normalize API / network join failures into player-facing copy. */
export const formatPrivateJoinError = (error: string) => {
  const normalized = error.trim().toLowerCase();
  if (
    normalized === "room not found" ||
    normalized.includes("not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("invalid room")
  ) {
    return PRIVATE_ROOM_NOT_FOUND_MESSAGE;
  }
  return error;
};

const mapPrivateRoomFailure = async (response: Response) => {
  if (response.status >= 500) {
    return PRIVATE_ROOM_UNAVAILABLE;
  }

  if (response.status === 404) {
    return PRIVATE_ROOM_NOT_FOUND_MESSAGE;
  }

  return readError(response);
};

export const createPrivateRoom = async (params: {
  mode: PrivateMatchMode;
  playerId: string;
  teamName: string;
  elo: number;
  signal?: AbortSignal;
}): Promise<PrivateRoomWaiting | { error: string }> => {
  try {
    const response = await fetchWithTimeout(buildUrl("/api/private-room"), {
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
      signal: params.signal,
    });

    if (!response.ok) {
      return { error: await mapPrivateRoomFailure(response) };
    }

    const payload = (await response.json()) as {
      status?: string;
      roomCode?: string;
      expiresAt?: string;
    };

    if (
      payload.status === "waiting" &&
      typeof payload.roomCode === "string" &&
      typeof payload.expiresAt === "string"
    ) {
      return {
        status: "waiting",
        roomCode: payload.roomCode,
        expiresAt: payload.expiresAt,
      };
    }

    return { error: "Could not create private room" };
  } catch (error) {
    if (isAbortError(error) || params.signal?.aborted) {
      return { error: PRIVATE_ROOM_ABORTED_MESSAGE };
    }
    return { error: PRIVATE_ROOM_UNREACHABLE };
  }
};

export const joinPrivateRoom = async (params: {
  roomCode: string;
  playerId: string;
  teamName: string;
  elo: number;
  expectedMode: PrivateMatchMode;
  signal?: AbortSignal;
}): Promise<PrivateRoomMatched | { error: string }> => {
  try {
    const response = await fetchWithTimeout(buildUrl("/api/private-room/join"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        roomCode: params.roomCode,
        playerId: params.playerId,
        teamName: params.teamName,
        elo: Math.round(params.elo),
        expectedMode: params.expectedMode,
      }),
      signal: params.signal,
    });

    if (!response.ok) {
      return { error: formatPrivateJoinError(await mapPrivateRoomFailure(response)) };
    }

    const payload = (await response.json()) as {
      status?: string;
      roomCode?: string;
      matchId?: string;
      mode?: PrivateMatchMode;
      opponent?: {
        playerId?: string;
        teamName?: string;
        elo?: number;
        username?: string | null;
      };
    };

    if (
      payload.status === "matched" &&
      payload.matchId &&
      payload.opponent?.playerId &&
      payload.opponent.teamName &&
      payload.mode
    ) {
      return {
        status: "matched",
        roomCode: payload.roomCode ?? params.roomCode,
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
    }

    return { error: PRIVATE_ROOM_NOT_FOUND_MESSAGE };
  } catch (error) {
    if (isAbortError(error) || params.signal?.aborted) {
      return { error: PRIVATE_ROOM_ABORTED_MESSAGE };
    }
    return { error: PRIVATE_ROOM_UNREACHABLE };
  }
};

export const pollPrivateRoom = async (params: {
  roomCode: string;
  playerId: string;
  signal?: AbortSignal;
}): Promise<
  | PrivateRoomWaiting
  | PrivateRoomMatched
  | { status: "expired" | "cancelled" }
  | { error: string }
> => {
  try {
    const search = new URLSearchParams({
      code: params.roomCode,
      playerId: params.playerId,
    });
    const response = await fetchWithTimeout(
      `${buildUrl("/api/private-room")}?${search.toString()}`,
      { headers: { accept: "application/json" }, signal: params.signal },
    );

    if (response.status === 410) {
      return { status: "expired" };
    }

    if (!response.ok) {
      return { error: await mapPrivateRoomFailure(response) };
    }

    const payload = (await response.json()) as {
      status?: string;
      roomCode?: string;
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

    if (payload.status === "cancelled" || payload.status === "expired") {
      return { status: payload.status };
    }

    if (
      payload.status === "matched" &&
      payload.matchId &&
      payload.opponent?.playerId &&
      payload.opponent.teamName &&
      payload.mode
    ) {
      return {
        status: "matched",
        roomCode: payload.roomCode ?? params.roomCode,
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
    }

    if (payload.status === "waiting" && payload.expiresAt) {
      return {
        status: "waiting",
        roomCode: payload.roomCode ?? params.roomCode,
        expiresAt: payload.expiresAt,
      };
    }

    return { error: "Unexpected private room response" };
  } catch (error) {
    if (isAbortError(error) || params.signal?.aborted) {
      return { error: PRIVATE_ROOM_ABORTED_MESSAGE };
    }
    return { error: PRIVATE_ROOM_UNREACHABLE };
  }
};

export const cancelPrivateRoom = async (params: {
  roomCode: string;
  playerId: string;
  signal?: AbortSignal;
}): Promise<boolean> => {
  try {
    const search = new URLSearchParams({
      code: params.roomCode,
      playerId: params.playerId,
    });
    const response = await fetchWithTimeout(
      `${buildUrl("/api/private-room")}?${search.toString()}`,
      { method: "DELETE", headers: { accept: "application/json" }, signal: params.signal },
      PRIVATE_ROOM_CANCEL_TIMEOUT_MS,
    );
    return response.ok;
  } catch {
    return false;
  }
};

/** Host: create room and poll until a friend joins (or cancel/expire). */
export const waitForPrivateRoomGuest = async (
  params: {
    roomCode: string;
    playerId: string;
  },
  options: {
    isCancelled?: () => boolean;
    signal?: AbortSignal;
    pollIntervalMs?: number;
    maxConsecutiveErrors?: number;
  } = {},
): Promise<
  | { ok: true; matched: PrivateRoomMatched }
  | { ok: false; error: "cancelled" | "expired" | "setup_failed" }
> => {
  const pollIntervalMs = options.pollIntervalMs ?? MATCHMAKING_POLL_INTERVAL_MS;
  const maxConsecutiveErrors = options.maxConsecutiveErrors ?? 5;
  let consecutiveErrors = 0;

  const cancelled = () =>
    Boolean(options.isCancelled?.() || options.signal?.aborted);

  while (!cancelled()) {
    const poll = await pollPrivateRoom({ ...params, signal: options.signal });

    if ("error" in poll) {
      if (poll.error === PRIVATE_ROOM_ABORTED_MESSAGE || cancelled()) {
        break;
      }
      consecutiveErrors += 1;
      if (consecutiveErrors >= maxConsecutiveErrors) {
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
      return { ok: false, error: poll.status };
    }

    try {
      await sleep(pollIntervalMs, options.signal);
    } catch {
      break;
    }
  }

  // Cancel raced a join — one last poll so we don't orphan a live match.
  const lastPoll = await pollPrivateRoom(params);
  if (!("error" in lastPoll) && lastPoll.status === "matched") {
    return { ok: true, matched: lastPoll };
  }

  await cancelPrivateRoom(params);
  return { ok: false, error: "cancelled" };
};
