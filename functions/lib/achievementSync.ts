import { normalizeUnlockedAchievementIds } from "../../src/lib/achievements";

export const filterUnlockedAchievementIds = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) {
    return [];
  }

  return normalizeUnlockedAchievementIds(
    ids.filter((id): id is string => typeof id === "string"),
  );
};

export const unionUnlockedAchievementIds = (...lists: string[][]) =>
  normalizeUnlockedAchievementIds(lists.flat());

export const parseUnlockedAchievementJson = (raw: string): string[] => {
  try {
    return filterUnlockedAchievementIds(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
};

export const loadPlayerAchievementsRow = async (
  db: D1Database,
  playerId: string,
) =>
  db
    .prepare(
      `SELECT player_id, unlocked_json, updated_at
       FROM player_achievements
       WHERE player_id = ?`,
    )
    .bind(playerId)
    .first<{ player_id: string; unlocked_json: string; updated_at: string }>();

export const upsertPlayerAchievementsRow = async (
  db: D1Database,
  playerId: string,
  unlockedIds: string[],
  updatedAt: string,
) => {
  await db
    .prepare(
      `INSERT INTO player_achievements (player_id, unlocked_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         unlocked_json = excluded.unlocked_json,
         updated_at = excluded.updated_at`,
    )
    .bind(playerId, JSON.stringify(unlockedIds), updatedAt)
    .run();
};
