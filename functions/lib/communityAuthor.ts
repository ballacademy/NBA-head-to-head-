import { derivePublicTag } from "../../src/lib/playerIdentity";
import { getCurrentSeasonId } from "../../src/lib/rankedSeason";
import { RANKED_STARTING_ELO } from "../../src/lib/rankedElo";

const AUTHOR_NAME_MAX = 32;
const AUTHOR_TAG_MAX = 8;

/** Canonical community display fields — never trust client authorName/tag/Elo. */
export const resolveCommunityAuthorFields = async (
  db: D1Database,
  params: { playerId: string; username: string },
) => {
  const authorName = params.username.trim().slice(0, AUTHOR_NAME_MAX) || "GM";
  const authorTag = derivePublicTag(params.playerId).slice(0, AUTHOR_TAG_MAX);
  const seasonId = getCurrentSeasonId();

  const [classic, ranked] = await Promise.all([
    db
      .prepare(
        `SELECT elo FROM leaderboard_entries
         WHERE mode = 'classic' AND season_id = ? AND player_id = ?
         LIMIT 1`,
      )
      .bind(seasonId, params.playerId)
      .first<{ elo: number }>(),
    db
      .prepare(
        `SELECT elo FROM leaderboard_entries
         WHERE mode = 'ranked' AND season_id = ? AND player_id = ?
         LIMIT 1`,
      )
      .bind(seasonId, params.playerId)
      .first<{ elo: number }>(),
  ]);

  const clampElo = (value: number | undefined, fallback: number) => {
    if (value == null || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(0, Math.min(4000, Math.round(value)));
  };

  return {
    authorName,
    authorTag,
    authorClassicElo: clampElo(classic?.elo, 1000),
    authorRankedElo: clampElo(ranked?.elo, RANKED_STARTING_ELO),
  };
};
