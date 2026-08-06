import type { Env } from "../types";
import { getAccountByPlayerId } from "../lib/playerAccounts";
import { rejectProfaneTeamName } from "../lib/profanity";
import {
  claimPrivateRoomAndCreateMatch,
  cleanupExpiredPrivateRooms,
  getPrivateRoom,
  insertPrivateRoom,
  isValidRoomCodeFormat,
  normalizeRoomCode,
  parsePrivateRoomMode,
} from "../lib/privateRooms";
import { getUsernameByPlayerId } from "../lib/playerAccounts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const ACCOUNT_REQUIRED = "Create an account to host or join a private match.";

interface CreateBody {
  mode?: unknown;
  playerId?: unknown;
  teamName?: unknown;
  elo?: unknown;
}

const parsePlayerId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

const parseTeamName = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, 32) : "";

/** Create a private room (host). */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: CreateBody;

  try {
    body = (await context.request.json()) as CreateBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const mode = parsePrivateRoomMode(
    typeof body.mode === "string" ? body.mode : null,
  );
  const playerId = parsePlayerId(body.playerId);
  const teamName = parseTeamName(body.teamName);
  const elo = Number(body.elo ?? 500);

  if (!mode) {
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  if (!playerId || !teamName) {
    return json({ error: "playerId and teamName are required" }, 400);
  }

  const profanityError = rejectProfaneTeamName(teamName);
  if (profanityError) {
    return json({ error: profanityError }, 400);
  }

  if (!Number.isFinite(elo)) {
    return json({ error: "elo must be a number" }, 400);
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json({ error: ACCOUNT_REQUIRED }, 403);
  }

  const db = context.env.DB;
  await cleanupExpiredPrivateRooms(db);

  try {
    const room = await insertPrivateRoom(db, {
      mode,
      hostPlayerId: playerId,
      hostTeamName: teamName,
      hostElo: Math.round(elo),
    });

    return json(
      {
        status: "waiting",
        roomCode: room.code,
        mode: room.mode,
        expiresAt: room.expires_at,
      },
      201,
    );
  } catch {
    return json(
      {
        error:
          "Private match servers are temporarily unavailable. Try again in a moment.",
      },
      500,
    );
  }
};

/** Host poll for a matched guest. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = normalizeRoomCode(url.searchParams.get("code") ?? "");
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!isValidRoomCodeFormat(code) || !playerId) {
    return json({ error: "code and playerId are required" }, 400);
  }

  const db = context.env.DB;
  await cleanupExpiredPrivateRooms(db);
  const room = await getPrivateRoom(db, code);

  if (!room) {
    return json({ error: "Room not found" }, 404);
  }

  if (room.host_player_id !== playerId) {
    return json({ error: "Only the host can poll this room" }, 403);
  }

  if (room.status === "expired" || room.expires_at < new Date().toISOString()) {
    return json({ status: "expired", roomCode: room.code }, 410);
  }

  if (room.status === "cancelled") {
    return json({ status: "cancelled", roomCode: room.code });
  }

  if (room.status === "matched" && room.match_id && room.guest_player_id) {
    return json({
      status: "matched",
      roomCode: room.code,
      matchId: room.match_id,
      mode: room.mode,
      opponent: {
        playerId: room.guest_player_id,
        teamName: room.guest_team_name ?? "Opponent",
        elo: room.guest_elo ?? 500,
        username: await getUsernameByPlayerId(db, room.guest_player_id),
      },
    });
  }

  return json({
    status: "waiting",
    roomCode: room.code,
    mode: room.mode,
    expiresAt: room.expires_at,
  });
};

/** Host cancel while waiting. */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = normalizeRoomCode(url.searchParams.get("code") ?? "");
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!isValidRoomCodeFormat(code) || !playerId) {
    return json({ error: "code and playerId are required" }, 400);
  }

  const db = context.env.DB;
  const room = await getPrivateRoom(db, code);

  if (!room) {
    return json({ error: "Room not found" }, 404);
  }

  if (room.host_player_id !== playerId) {
    return json({ error: "Only the host can cancel this room" }, 403);
  }

  if (room.status !== "waiting") {
    return json({ status: room.status, roomCode: room.code });
  }

  await db
    .prepare(
      `UPDATE private_rooms SET status = 'cancelled' WHERE code = ? AND status = 'waiting'`,
    )
    .bind(code)
    .run();

  return json({ status: "cancelled", roomCode: code });
};
