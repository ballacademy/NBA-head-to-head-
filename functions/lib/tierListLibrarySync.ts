export {
  emptyTierListAccountPayload,
  mergeTierListAccountPayload,
  normalizeTierListAccountPayload,
  parseTierListAccountJson,
  type TierListAccountPayload,
} from "../../src/lib/tierListLibraryShared";

import type { TierListAccountPayload } from "../../src/lib/tierListLibraryShared";

export const loadTierListLibraryRow = async (db: D1Database, playerId: string) =>
  db
    .prepare(
      `SELECT player_id, library_json, updated_at
       FROM player_tier_list_library
       WHERE player_id = ?`,
    )
    .bind(playerId)
    .first<{ player_id: string; library_json: string; updated_at: string }>();

export const upsertTierListLibraryRow = async (
  db: D1Database,
  playerId: string,
  library: TierListAccountPayload,
  updatedAt: string,
) => {
  await db
    .prepare(
      `INSERT INTO player_tier_list_library (player_id, library_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         library_json = excluded.library_json,
         updated_at = excluded.updated_at`,
    )
    .bind(playerId, JSON.stringify(library), updatedAt)
    .run();
};
