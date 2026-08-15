export {
  emptyCareerStats,
  mergeCareerStats,
  normalizeCareerStats,
  parseCareerJson,
  type AllTimeBannersPayload,
  type CareerStatsPayload,
  type ModeRecordStatsPayload,
} from "../../src/lib/careerStatsShared";

import type { CareerStatsPayload } from "../../src/lib/careerStatsShared";

export const loadCareerStatsRow = async (db: D1Database, playerId: string) =>
  db
    .prepare(
      `SELECT player_id, career_json, updated_at
       FROM player_career_stats
       WHERE player_id = ?`,
    )
    .bind(playerId)
    .first<{ player_id: string; career_json: string; updated_at: string }>();

export const upsertCareerStatsRow = async (
  db: D1Database,
  playerId: string,
  career: CareerStatsPayload,
  updatedAt: string,
) => {
  await db
    .prepare(
      `INSERT INTO player_career_stats (player_id, career_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         career_json = excluded.career_json,
         updated_at = excluded.updated_at`,
    )
    .bind(playerId, JSON.stringify(career), updatedAt)
    .run();
};
