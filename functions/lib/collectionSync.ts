import {
  getRecentAllStarUnlockPlayerIds,
  getWinUnlockPlayerIds,
} from "../../src/lib/allStars";
import { getScrubPlayerIds } from "../../src/lib/playerTiers";

let cachedValidIds: Set<string> | null = null;

export const getValidCollectibleIdSet = (): Set<string> => {
  if (cachedValidIds) {
    return cachedValidIds;
  }

  cachedValidIds = new Set([
    ...getWinUnlockPlayerIds(),
    ...getScrubPlayerIds(),
    ...getRecentAllStarUnlockPlayerIds(),
  ]);

  return cachedValidIds;
};

export const filterUnlockedIds = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) {
    return [];
  }

  const valid = getValidCollectibleIdSet();
  const next: string[] = [];
  const seen = new Set<string>();

  for (const value of ids) {
    if (typeof value !== "string") {
      continue;
    }

    const id = value.trim();
    if (!id || seen.has(id) || !valid.has(id)) {
      continue;
    }

    seen.add(id);
    next.push(id);

    if (next.length >= valid.size) {
      break;
    }
  }

  return next;
};

export const unionUnlockedIds = (...lists: string[][]) => {
  const valid = getValidCollectibleIdSet();
  const next: string[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    for (const id of list) {
      if (!valid.has(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      next.push(id);
    }
  }

  return next;
};

export const parseUnlockedJson = (raw: string): string[] => {
  try {
    return filterUnlockedIds(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
};

export const loadPlayerCollectionRow = async (
  db: D1Database,
  playerId: string,
) =>
  db
    .prepare(
      `SELECT player_id, unlocked_json, updated_at
       FROM player_collections
       WHERE player_id = ?`,
    )
    .bind(playerId)
    .first<{ player_id: string; unlocked_json: string; updated_at: string }>();

export const upsertPlayerCollectionRow = async (
  db: D1Database,
  playerId: string,
  unlockedIds: string[],
  updatedAt: string,
) => {
  await db
    .prepare(
      `INSERT INTO player_collections (player_id, unlocked_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         unlocked_json = excluded.unlocked_json,
         updated_at = excluded.updated_at`,
    )
    .bind(playerId, JSON.stringify(unlockedIds), updatedAt)
    .run();
};
