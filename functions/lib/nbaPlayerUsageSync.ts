export {
  emptyNbaPlayerUsageStore,
  mergeNbaPlayerUsageStore,
  normalizeNbaPlayerUsageStore,
  parseNbaPlayerUsageJson,
  type NbaPlayerModeUsage,
  type NbaPlayerUsageMode,
  type NbaPlayerUsageStore,
} from "../../src/lib/nbaPlayerUsageShared";

import type { NbaPlayerUsageStore } from "../../src/lib/nbaPlayerUsageShared";

export const loadNbaPlayerUsageRow = async (db: D1Database, playerId: string) =>
  db
    .prepare(
      `SELECT player_id, usage_json, updated_at
       FROM player_nba_usage
       WHERE player_id = ?`,
    )
    .bind(playerId)
    .first<{ player_id: string; usage_json: string; updated_at: string }>();

export const upsertNbaPlayerUsageRow = async (
  db: D1Database,
  playerId: string,
  usage: NbaPlayerUsageStore,
  updatedAt: string,
) => {
  await db
    .prepare(
      `INSERT INTO player_nba_usage (player_id, usage_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         usage_json = excluded.usage_json,
         updated_at = excluded.updated_at`,
    )
    .bind(playerId, JSON.stringify(usage), updatedAt)
    .run();
};
