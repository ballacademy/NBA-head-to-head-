/** Private friend-match room helpers (Casual / Pro rules, unranked outcomes). */

export const PRIVATE_ROOM_CODE_LENGTH = 6;
export const PRIVATE_ROOM_TTL_MS = 10 * 60 * 1000;

/** Ambiguous-char-safe alphabet (no 0/O/1/I). */
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type PrivateRoomMode = "classic" | "ranked";
export type PrivateRoomStatus = "waiting" | "matched" | "cancelled" | "expired";

export interface PrivateRoomRow {
  code: string;
  mode: string;
  host_player_id: string;
  host_team_name: string;
  host_elo: number;
  guest_player_id: string | null;
  guest_team_name: string | null;
  guest_elo: number | null;
  match_id: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  invited_player_id: string | null;
}

export const parsePrivateRoomMode = (
  value: string | null | undefined,
): PrivateRoomMode | null =>
  value === "classic" || value === "ranked" ? value : null;

export const normalizeRoomCode = (value: string) =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, PRIVATE_ROOM_CODE_LENGTH);

export const isValidRoomCodeFormat = (code: string) =>
  new RegExp(`^[${ROOM_CODE_ALPHABET}]{${PRIVATE_ROOM_CODE_LENGTH}}$`).test(code);

export const generatePrivateRoomCode = () => {
  const bytes = new Uint8Array(PRIVATE_ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]!;
  }
  return code;
};

export const privateRoomExpiresAt = (fromMs = Date.now()) =>
  new Date(fromMs + PRIVATE_ROOM_TTL_MS).toISOString();

export const cleanupExpiredPrivateRooms = async (db: D1Database) => {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE private_rooms
       SET status = 'expired'
       WHERE status = 'waiting' AND expires_at < ?`,
    )
    .bind(now)
    .run();
};

export const insertPrivateRoom = async (
  db: D1Database,
  params: {
    mode: PrivateRoomMode;
    hostPlayerId: string;
    hostTeamName: string;
    hostElo: number;
    invitedPlayerId?: string | null;
  },
): Promise<PrivateRoomRow> => {
  const createdAt = new Date().toISOString();
  const expiresAt = privateRoomExpiresAt();
  const invitedPlayerId =
    typeof params.invitedPlayerId === "string" &&
    params.invitedPlayerId.trim().length > 0 &&
    params.invitedPlayerId.trim() !== params.hostPlayerId
      ? params.invitedPlayerId.trim().slice(0, 128)
      : null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generatePrivateRoomCode();
    try {
      await db
        .prepare(
          `INSERT INTO private_rooms (
            code, mode, host_player_id, host_team_name, host_elo,
            invited_player_id, status, created_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?, ?)`,
        )
        .bind(
          code,
          params.mode,
          params.hostPlayerId,
          params.hostTeamName,
          Math.round(params.hostElo),
          invitedPlayerId,
          createdAt,
          expiresAt,
        )
        .run();

      return {
        code,
        mode: params.mode,
        host_player_id: params.hostPlayerId,
        host_team_name: params.hostTeamName,
        host_elo: Math.round(params.hostElo),
        guest_player_id: null,
        guest_team_name: null,
        guest_elo: null,
        match_id: null,
        status: "waiting",
        created_at: createdAt,
        expires_at: expiresAt,
        invited_player_id: invitedPlayerId,
      };
    } catch {
      // Code collision — retry with a new code.
    }
  }

  throw new Error("Could not allocate private room code");
};

export const getPrivateRoom = async (db: D1Database, code: string) =>
  db
    .prepare(
      `SELECT code, mode, host_player_id, host_team_name, host_elo,
              guest_player_id, guest_team_name, guest_elo, match_id,
              status, created_at, expires_at, invited_player_id
       FROM private_rooms
       WHERE code = ?`,
    )
    .bind(code)
    .first<PrivateRoomRow>();

/**
 * Atomically claim a waiting room for the guest and create a live_matches row.
 * Returns null if the room was already taken / expired / invalid.
 */
export const claimPrivateRoomAndCreateMatch = async (
  db: D1Database,
  params: {
    code: string;
    guestPlayerId: string;
    guestTeamName: string;
    guestElo: number;
  },
): Promise<{
  matchId: string;
  mode: PrivateRoomMode;
  host: { playerId: string; teamName: string; elo: number };
  guest: { playerId: string; teamName: string; elo: number };
} | null> => {
  const room = await getPrivateRoom(db, params.code);
  if (!room || room.status !== "waiting") {
    return null;
  }

  if (room.expires_at < new Date().toISOString()) {
    await db
      .prepare(`UPDATE private_rooms SET status = 'expired' WHERE code = ? AND status = 'waiting'`)
      .bind(params.code)
      .run();
    return null;
  }

  if (room.host_player_id === params.guestPlayerId) {
    return null;
  }

  if (
    room.invited_player_id &&
    room.invited_player_id !== params.guestPlayerId
  ) {
    return null;
  }

  const mode = parsePrivateRoomMode(room.mode);
  if (!mode) {
    return null;
  }

  const matchId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const guestElo = Math.round(params.guestElo);

  const claim = await db
    .prepare(
      `UPDATE private_rooms
       SET guest_player_id = ?,
           guest_team_name = ?,
           guest_elo = ?,
           match_id = ?,
           status = 'matched'
       WHERE code = ?
         AND status = 'waiting'
         AND guest_player_id IS NULL
         AND expires_at >= ?`,
    )
    .bind(
      params.guestPlayerId,
      params.guestTeamName,
      guestElo,
      matchId,
      params.code,
      createdAt,
    )
    .run();

  if ((claim.meta?.changes ?? 0) < 1) {
    return null;
  }

  await db
    .prepare(
      `INSERT INTO live_matches (
        id, mode,
        player_a_id, player_a_team, player_a_elo,
        player_b_id, player_b_team, player_b_elo,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      matchId,
      mode,
      room.host_player_id,
      room.host_team_name,
      Math.round(room.host_elo),
      params.guestPlayerId,
      params.guestTeamName,
      guestElo,
      createdAt,
    )
    .run();

  return {
    matchId,
    mode,
    host: {
      playerId: room.host_player_id,
      teamName: room.host_team_name,
      elo: Math.round(room.host_elo),
    },
    guest: {
      playerId: params.guestPlayerId,
      teamName: params.guestTeamName,
      elo: guestElo,
    },
  };
};
