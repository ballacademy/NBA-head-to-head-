import type { Env, LeaderboardEntryRow } from "../types";
import { rejectProfaneTeamName } from "../lib/profanity";
import { upsertPlayerLegacyStats } from "../lib/playerLegacy";
import { getAccountByPlayerId } from "../lib/playerAccounts";
import {
  isPublicOpaquePlayerId,
  toLeaderboardPublicEntry,
} from "../lib/leaderboardPublicId";
import {
  MAX_ELO,
  validateLeaderboardUpsert,
} from "../lib/leaderboardUpsert";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

type LeaderboardMode = "classic" | "ranked" | "event";

const parseMode = (value: string | null): LeaderboardMode | null =>
  value === "classic" || value === "ranked" || value === "event"
    ? value
    : null;

const parseSort = (value: string | null) =>
  value === "elo" ||
  value === "winStreak" ||
  value === "lossStreak" ||
  value === "wins"
    ? value
    : "elo";

const SEASON_ID_PATTERN = /^\d{4}-\d{2}$/;
const EVENT_SEASON_ID_PATTERN =
  /^\d{4}-W\d{2}-(u25|intl|nostars|bargain|blind|agepos)$/;

const parseSeasonId = (mode: LeaderboardMode, value: string | null) => {
  if (!value) {
    return null;
  }

  if (mode === "event") {
    return EVENT_SEASON_ID_PATTERN.test(value) ? value : null;
  }

  return SEASON_ID_PATTERN.test(value) ? value : null;
};

const parsePlayerId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

const sortClause = (
  sort: "elo" | "winStreak" | "lossStreak" | "wins",
  tableAlias = "",
) => {
  const col = (name: string) => (tableAlias ? `${tableAlias}.${name}` : name);

  switch (sort) {
    case "wins":
      return `${col("wins")} DESC, ${col("losses")} ASC, ${col("elo")} DESC, ${col("team_name")} ASC`;
    case "winStreak":
      return `${col("win_streak")} DESC, ${col("wins")} DESC, ${col("team_name")} ASC`;
    case "lossStreak":
      return `${col("loss_streak")} DESC, ${col("losses")} DESC, ${col("team_name")} ASC`;
    default:
      return `${col("elo")} DESC, ${col("wins")} DESC, ${col("team_name")} ASC`;
  }
};

interface LeaderboardBody {
  mode?: unknown;
  seasonId?: unknown;
  playerId?: unknown;
  teamName?: unknown;
  publicTag?: unknown;
  elo?: unknown;
  wins?: unknown;
  losses?: unknown;
  winStreak?: unknown;
  lossStreak?: unknown;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const mode = parseMode(url.searchParams.get("mode"));

  if (!mode) {
    return json({ error: "mode must be classic, ranked, or event" }, 400);
  }

  const seasonId = parseSeasonId(mode, url.searchParams.get("seasonId"));

  if (seasonId == null) {
    return json({ error: "seasonId is required for leaderboards" }, 400);
  }

  const sort =
    mode === "event" && !url.searchParams.get("sort")
      ? "wins"
      : parseSort(url.searchParams.get("sort"));
  const viewerPlayerId = parsePlayerId(url.searchParams.get("viewerPlayerId"));
  const defaultLimit = mode === "event" ? 100 : 500;
  const limit = Math.min(
    Math.max(
      Number(url.searchParams.get("limit") ?? defaultLimit),
      1,
    ),
    mode === "event" ? 100 : 500,
  );

  const rows = await context.env.DB.prepare(
    `SELECT le.mode AS mode, le.season_id AS season_id, le.player_id AS player_id,
            le.team_name AS team_name, le.public_tag AS public_tag, le.elo AS elo,
            le.wins AS wins, le.losses AS losses, le.win_streak AS win_streak,
            le.loss_streak AS loss_streak, le.updated_at AS updated_at,
            pa.username AS username
     FROM leaderboard_entries le
     INNER JOIN player_accounts pa ON pa.player_id = le.player_id
     WHERE le.mode = ? AND le.season_id = ?
     ORDER BY ${sortClause(sort, "le")}
     LIMIT ?`,
  )
    .bind(mode, seasonId, limit)
    .all<LeaderboardEntryRow & { username?: string | null }>();

  const entries = await Promise.all(
    (rows.results ?? []).map((row) =>
      toLeaderboardPublicEntry(row, viewerPlayerId),
    ),
  );

  return json({
    mode,
    seasonId,
    sort,
    entries,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: LeaderboardBody;

  try {
    body = (await context.request.json()) as LeaderboardBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const mode = parseMode(typeof body.mode === "string" ? body.mode : null);

  if (!mode) {
    return json({ error: "mode must be classic, ranked, or event" }, 400);
  }

  const seasonId = parseSeasonId(
    mode,
    typeof body.seasonId === "string" ? body.seasonId : null,
  );

  if (seasonId == null) {
    return json({ error: "seasonId is required for leaderboards" }, 400);
  }

  const playerId = parsePlayerId(body.playerId);
  const teamName =
    typeof body.teamName === "string" ? body.teamName.trim().slice(0, 32) : "";
  const publicTag =
    typeof body.publicTag === "string" ? body.publicTag.trim().slice(0, 16) : "";
  const elo = Math.max(0, Math.round(Number(body.elo)));
  const wins = Math.max(0, Math.round(Number(body.wins ?? 0)));
  const losses = Math.max(0, Math.round(Number(body.losses ?? 0)));
  const winStreak = Math.max(0, Math.round(Number(body.winStreak ?? 0)));
  const lossStreak = Math.max(0, Math.round(Number(body.lossStreak ?? 0)));

  if (!playerId || !teamName || !publicTag) {
    return json(
      { error: "playerId, teamName, and publicTag are required" },
      400,
    );
  }

  if (isPublicOpaquePlayerId(playerId)) {
    return json({ error: "playerId is invalid" }, 400);
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json(
      { error: "Create an account to appear on leaderboards." },
      403,
    );
  }

  const profanityError = rejectProfaneTeamName(teamName);

  if (profanityError) {
    return json({ error: profanityError }, 400);
  }

  if (!Number.isFinite(elo)) {
    return json({ error: "elo must be a number" }, 400);
  }

  if (elo > MAX_ELO) {
    return json({ error: "elo exceeds the maximum allowed value" }, 400);
  }

  const existing = await context.env.DB.prepare(
    `SELECT elo, wins, losses, win_streak, loss_streak
     FROM leaderboard_entries
     WHERE mode = ? AND season_id = ? AND player_id = ?`,
  )
    .bind(mode, seasonId, playerId)
    .first<{
      elo: number;
      wins: number;
      losses: number;
      win_streak: number;
      loss_streak: number;
    }>();

  const validationError = validateLeaderboardUpsert(
    mode,
    { elo, wins, losses, winStreak, lossStreak },
    existing,
  );

  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const updatedAt = new Date().toISOString();

  await context.env.DB.prepare(
    `INSERT INTO leaderboard_entries (
      mode, season_id, player_id, team_name, public_tag, elo, wins, losses,
      win_streak, loss_streak, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mode, season_id, player_id) DO UPDATE SET
      team_name = excluded.team_name,
      public_tag = excluded.public_tag,
      elo = excluded.elo,
      wins = excluded.wins,
      losses = excluded.losses,
      win_streak = excluded.win_streak,
      loss_streak = excluded.loss_streak,
      updated_at = excluded.updated_at`,
  )
    .bind(
      mode,
      seasonId,
      playerId,
      teamName,
      publicTag,
      elo,
      wins,
      losses,
      winStreak,
      lossStreak,
      updatedAt,
    )
    .run();

  if (mode === "ranked" && seasonId) {
    await upsertPlayerLegacyStats(context.env, playerId, seasonId, elo);
  }

  return json(
    {
      mode,
      seasonId,
      entry: {
        playerId,
        isYou: true,
        name: teamName,
        publicTag,
        elo,
        wins,
        losses,
        winStreak,
        lossStreak,
        updatedAt,
      },
    },
    201,
  );
};
