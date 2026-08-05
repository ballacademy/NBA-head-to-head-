import type { Env } from "../../types";
import { getAccountByPlayerId } from "../../lib/playerAccounts";
import { rejectProfaneTeamName } from "../../lib/profanity";
import {
  claimPrivateRoomAndCreateMatch,
  cleanupExpiredPrivateRooms,
  getPrivateRoom,
  isValidRoomCodeFormat,
  normalizeRoomCode,
  parsePrivateRoomMode,
} from "../../lib/privateRooms";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const ACCOUNT_REQUIRED = "Create an account to host or join a private match.";

interface JoinBody {
  roomCode?: unknown;
  playerId?: unknown;
  teamName?: unknown;
  elo?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: JoinBody;

  try {
    body = (await context.request.json()) as JoinBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const roomCode = normalizeRoomCode(
    typeof body.roomCode === "string" ? body.roomCode : "",
  );
  const playerId =
    typeof body.playerId === "string" ? body.playerId.trim().slice(0, 128) : "";
  const teamName =
    typeof body.teamName === "string" ? body.teamName.trim().slice(0, 32) : "";
  const elo = Number(body.elo ?? 500);

  if (!isValidRoomCodeFormat(roomCode)) {
    return json({ error: "Enter a valid 6-character room code" }, 400);
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

  const existing = await getPrivateRoom(db, roomCode);
  if (!existing) {
    return json({ error: "Room not found" }, 404);
  }

  if (existing.host_player_id === playerId) {
    return json({ error: "You cannot join your own private room" }, 400);
  }

  if (existing.status === "expired" || existing.expires_at < new Date().toISOString()) {
    return json({ error: "This room has expired" }, 410);
  }

  if (existing.status === "cancelled") {
    return json({ error: "This room was cancelled" }, 410);
  }

  if (existing.status === "matched") {
    return json({ error: "This room is already full" }, 409);
  }

  const mode = parsePrivateRoomMode(existing.mode);
  if (!mode) {
    return json({ error: "Room mode is invalid" }, 400);
  }

  const claimed = await claimPrivateRoomAndCreateMatch(db, {
    code: roomCode,
    guestPlayerId: playerId,
    guestTeamName: teamName,
    guestElo: Math.round(elo),
  });

  if (!claimed) {
    return json({ error: "Could not join room — it may have just filled up" }, 409);
  }

  return json({
    status: "matched",
    roomCode,
    matchId: claimed.matchId,
    mode: claimed.mode,
    opponent: {
      playerId: claimed.host.playerId,
      teamName: claimed.host.teamName,
      elo: claimed.host.elo,
    },
  });
};
