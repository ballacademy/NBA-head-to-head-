import {
  getRecentAllStarUnlockPlayerIds,
  getWinUnlockPlayerIds,
} from "../../src/lib/allStars";
import { playersById } from "../../src/lib/playerPool";
import { getScrubPlayerIds } from "../../src/lib/playerTiers";

let cachedCollectibleIds: Set<string> | null = null;
let cachedStarUnlockIds: Set<string> | null = null;

export const getValidCollectibleIdSet = (): Set<string> => {
  if (cachedCollectibleIds) {
    return cachedCollectibleIds;
  }

  cachedCollectibleIds = new Set([
    ...getWinUnlockPlayerIds(),
    ...getScrubPlayerIds(),
    ...getRecentAllStarUnlockPlayerIds(),
  ]);

  return cachedCollectibleIds;
};

const getStarUnlockIdSet = (): Set<string> => {
  if (cachedStarUnlockIds) {
    return cachedStarUnlockIds;
  }

  cachedStarUnlockIds = new Set(getWinUnlockPlayerIds());
  return cachedStarUnlockIds;
};

/**
 * Accept current collectibles. Also keep non-star player IDs that still exist
 * (former scrub-pool unlocks after a pool rebuild) so sync does not wipe them.
 */
export const filterUnlockedIds = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) {
    return [];
  }

  const collectible = getValidCollectibleIdSet();
  const starUnlockIds = getStarUnlockIdSet();
  const next: string[] = [];
  const seen = new Set<string>();

  for (const value of ids) {
    if (typeof value !== "string") {
      continue;
    }

    const id = value.trim();
    if (!id || seen.has(id)) {
      continue;
    }

    const keep =
      collectible.has(id) ||
      (playersById.has(id) && !starUnlockIds.has(id));

    if (!keep) {
      continue;
    }

    seen.add(id);
    next.push(id);

    if (next.length >= collectible.size + 500) {
      break;
    }
  }

  return next;
};

export const unionUnlockedIds = (...lists: string[][]) => {
  const collectible = getValidCollectibleIdSet();
  const starUnlockIds = getStarUnlockIdSet();
  const next: string[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    for (const id of list) {
      const keep =
        collectible.has(id) ||
        (playersById.has(id) && !starUnlockIds.has(id));
      if (!keep || seen.has(id)) {
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
