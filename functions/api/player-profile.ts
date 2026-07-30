import type { Env } from "../types";
import {
  loadPlayerLegacyProfile,
  type PlayerLegacyProfile,
} from "../lib/playerLegacy";
import {
  isPublicOpaquePlayerId,
  resolvePrivatePlayerId,
} from "../lib/leaderboardPublicId";

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

const parseMode = (value: string | null) =>
  value === "classic" || value === "ranked" ? value : "ranked";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const rawPlayerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!rawPlayerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const seasonId = url.searchParams.get("seasonId");
  const currentSeasonId =
    seasonId && SEASON_ID_PATTERN.test(seasonId) ? seasonId : null;
  const mode = parseMode(url.searchParams.get("mode"));

  const playerId = await resolvePrivatePlayerId(
    context.env.DB,
    rawPlayerId,
    currentSeasonId,
  );

  if (!playerId) {
    return json({
      playerId: rawPlayerId,
      legacy: null,
      currentSeason: undefined,
    });
  }

  const legacy = await loadPlayerLegacyProfile(context.env.DB, playerId);

  const account = await context.env.DB.prepare(
    `SELECT username FROM player_accounts WHERE player_id = ?`,
  )
    .bind(playerId)
    .first<{ username: string }>();

  const username =
    typeof account?.username === "string" && account.username.trim().length > 0
      ? account.username.trim().toLowerCase()
      : undefined;

  let currentSeason:
    | {
        seasonId: string;
        mode: "classic" | "ranked";
        elo: number;
        rank: number | null;
        wins: number;
        losses: number;
        winStreak: number;
        lossStreak: number;
        teamName: string;
        publicTag: string;
        username?: string;
      }
    | undefined;

  if (currentSeasonId) {
    const entry = await context.env.DB.prepare(
      `SELECT team_name, public_tag, elo, wins, losses, win_streak, loss_streak
       FROM leaderboard_entries
       WHERE mode = ? AND season_id = ? AND player_id = ?`,
    )
      .bind(mode, currentSeasonId, playerId)
      .first<{
        team_name: string;
        public_tag: string;
        elo: number;
        wins: number;
        losses: number;
        win_streak: number;
        loss_streak: number;
      }>();

    if (entry) {
      const rankRow = await context.env.DB.prepare(
        `SELECT COUNT(*) + 1 AS rank
         FROM leaderboard_entries
         WHERE mode = ? AND season_id = ? AND elo > ?`,
      )
        .bind(mode, currentSeasonId, entry.elo)
        .first<{ rank: number }>();

      currentSeason = {
        seasonId: currentSeasonId,
        mode,
        elo: entry.elo,
        rank: rankRow?.rank ?? null,
        wins: entry.wins,
        losses: entry.losses,
        winStreak: entry.win_streak,
        lossStreak: entry.loss_streak,
        teamName: entry.team_name,
        publicTag: entry.public_tag,
        username,
      };
    }
  }

  return json({
    playerId: isPublicOpaquePlayerId(rawPlayerId) ? rawPlayerId : playerId,
    username,
    legacy,
    currentSeason,
  } satisfies {
    playerId: string;
    username?: string;
    legacy: PlayerLegacyProfile | null;
    currentSeason?: typeof currentSeason;
  });
};
