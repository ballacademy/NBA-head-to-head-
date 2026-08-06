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

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const readError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

export const createPrivateRoom = async (params: {
  mode: PrivateMatchMode;
  playerId: string;
  teamName: string;
  elo: number;
}): Promise<PrivateRoomWaiting | { error: string }> => {
  try {
    const response = await fetch(buildUrl("/api/private-room"), {
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
      return { error: await readError(response) };
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
  } catch {
    return { error: "Could not create private room" };
  }
};

export const joinPrivateRoom = async (params: {
  roomCode: string;
  playerId: string;
  teamName: string;
  elo: number;
  expectedMode: PrivateMatchMode;
}): Promise<PrivateRoomMatched | { error: string }> => {
  try {
    const response = await fetch(buildUrl("/api/private-room/join"), {
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
    });

    if (!response.ok) {
      return { error: await readError(response) };
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

    return { error: "Could not join private room" };
  } catch {
    return { error: "Could not join private room" };
  }
};

export const pollPrivateRoom = async (params: {
  roomCode: string;
  playerId: string;
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
    const response = await fetch(
      `${buildUrl("/api/private-room")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (response.status === 410) {
      return { status: "expired" };
    }

    if (!response.ok) {
      return { error: await readError(response) };
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
  } catch {
    return { error: "Could not check private room" };
  }
};

export const cancelPrivateRoom = async (params: {
  roomCode: string;
  playerId: string;
}): Promise<boolean> => {
  try {
    const search = new URLSearchParams({
      code: params.roomCode,
      playerId: params.playerId,
    });
    const response = await fetch(
      `${buildUrl("/api/private-room")}?${search.toString()}`,
      { method: "DELETE", headers: { accept: "application/json" } },
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
  options: { isCancelled?: () => boolean } = {},
): Promise<
  | { ok: true; matched: PrivateRoomMatched }
  | { ok: false; error: "cancelled" | "expired" | "setup_failed" }
> => {
  while (!options.isCancelled?.()) {
    const poll = await pollPrivateRoom(params);

    if ("error" in poll) {
      await sleep(MATCHMAKING_POLL_INTERVAL_MS);
      continue;
    }

    if (poll.status === "matched") {
      return { ok: true, matched: poll };
    }

    if (poll.status === "expired" || poll.status === "cancelled") {
      return { ok: false, error: poll.status };
    }

    await sleep(MATCHMAKING_POLL_INTERVAL_MS);
  }

  // Cancel raced a join — one last poll so we don't orphan a live match.
  const lastPoll = await pollPrivateRoom(params);
  if (!("error" in lastPoll) && lastPoll.status === "matched") {
    return { ok: true, matched: lastPoll };
  }

  await cancelPrivateRoom(params);
  return { ok: false, error: "cancelled" };
};
