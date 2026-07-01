import type { Env } from "../types";
import {
  loadPlayerLegacyProfile,
  type PlayerLegacyProfile,
} from "../lib/playerLegacy";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parsePlayerId = (value: string | null) =>
  value && value.trim().length > 0 ? value.trim().slice(0, 128) : "";

const SEASON_ID_PATTERN = /^\d{4}-\d{2}$/;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const seasonId = url.searchParams.get("seasonId");
  const currentSeasonId =
    seasonId && SEASON_ID_PATTERN.test(seasonId) ? seasonId : null;

  const legacy = await loadPlayerLegacyProfile(context.env.DB, playerId);

  let currentSeason:
    | {
        seasonId: string;
        elo: number;
        rank: number | null;
        wins: number;
        losses: number;
        teamName: string;
        publicTag: string;
      }
    | undefined;

  if (currentSeasonId) {
    const entry = await context.env.DB.prepare(
      `SELECT team_name, public_tag, elo, wins, losses
       FROM leaderboard_entries
       WHERE mode = 'ranked' AND season_id = ? AND player_id = ?`,
    )
      .bind(currentSeasonId, playerId)
      .first<{
        team_name: string;
        public_tag: string;
        elo: number;
        wins: number;
        losses: number;
      }>();

    if (entry) {
      const rankRow = await context.env.DB.prepare(
        `SELECT COUNT(*) + 1 AS rank
         FROM leaderboard_entries
         WHERE mode = 'ranked' AND season_id = ? AND elo > ?`,
      )
        .bind(currentSeasonId, entry.elo)
        .first<{ rank: number }>();

      currentSeason = {
        seasonId: currentSeasonId,
        elo: entry.elo,
        rank: rankRow?.rank ?? null,
        wins: entry.wins,
        losses: entry.losses,
        teamName: entry.team_name,
        publicTag: entry.public_tag,
      };
    }
  }

  return json({
    playerId,
    legacy,
    currentSeason,
  } satisfies {
    playerId: string;
    legacy: PlayerLegacyProfile | null;
    currentSeason?: typeof currentSeason;
  });
};
