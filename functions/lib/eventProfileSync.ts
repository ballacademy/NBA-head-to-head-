export {
  emptyEventProfilesPayload,
  mergeEventProfilesPayload,
  normalizeEventProfilesPayload,
  parseEventProfilesJson,
  type EventProfilesPayload,
} from "../../src/lib/eventProfileShared";

import type { EventProfilesPayload } from "../../src/lib/eventProfileShared";

export const loadEventProfilesRow = async (db: D1Database, playerId: string) =>
  db
    .prepare(
      `SELECT player_id, profiles_json, updated_at
       FROM player_event_profiles
       WHERE player_id = ?`,
    )
    .bind(playerId)
    .first<{ player_id: string; profiles_json: string; updated_at: string }>();

export const upsertEventProfilesRow = async (
  db: D1Database,
  playerId: string,
  profiles: EventProfilesPayload,
  updatedAt: string,
) => {
  await db
    .prepare(
      `INSERT INTO player_event_profiles (player_id, profiles_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         profiles_json = excluded.profiles_json,
         updated_at = excluded.updated_at`,
    )
    .bind(playerId, JSON.stringify(profiles), updatedAt)
    .run();
};
