import type { Env, LeaderboardEntryRow } from "../types";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parseMode = (value: string | null) =>
  value === "classic" || value === "ranked" ? value : null;

const parseSort = (value: string | null) =>
  value === "elo" || value === "winStreak" || value === "lossStreak"
    ? value
    : "elo";

const SEASON_ID_PATTERN = /^\d{4}-\d{2}$/;

const parseSeasonId = (mode: "classic" | "ranked", value: string | null) => {
  if (mode === "classic") {
    return "";
  }

  return value && SEASON_ID_PATTERN.test(value) ? value : null;
};

const parsePlayerId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

const sortClause = (sort: "elo" | "winStreak" | "lossStreak") => {
  switch (sort) {
    case "winStreak":
      return "win_streak DESC, wins DESC, team_name ASC";
    case "lossStreak":
      return "loss_streak DESC, losses DESC, team_name ASC";
    default:
      return "elo DESC, wins DESC, team_name ASC";
  }
};

const rowToEntry = (row: LeaderboardEntryRow) => ({
  playerId: row.player_id,
  name: row.team_name,
  publicTag: row.public_tag,
  elo: row.elo,
  wins: row.wins,
  losses: row.losses,
  winStreak: row.win_streak,
  lossStreak: row.loss_streak,
  updatedAt: row.updated_at,
});

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
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  const seasonId = parseSeasonId(mode, url.searchParams.get("seasonId"));

  if (seasonId == null) {
    return json({ error: "seasonId is required for ranked leaderboards" }, 400);
  }

  const sort = parseSort(url.searchParams.get("sort"));
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? (mode === "ranked" ? 500 : 100)), 1),
    mode === "ranked" ? 500 : 100,
  );

  const rows = await context.env.DB.prepare(
    `SELECT mode, season_id, player_id, team_name, public_tag, elo, wins, losses,
            win_streak, loss_streak, updated_at
     FROM leaderboard_entries
     WHERE mode = ? AND season_id = ?
     ORDER BY ${sortClause(sort)}
     LIMIT ?`,
  )
    .bind(mode, seasonId, limit)
    .all<LeaderboardEntryRow>();

  return json({
    mode,
    seasonId,
    sort,
    entries: (rows.results ?? []).map(rowToEntry),
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
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  const seasonId =
    mode === "classic"
      ? ""
      : parseSeasonId(
          mode,
          typeof body.seasonId === "string" ? body.seasonId : null,
        );

  if (seasonId == null) {
    return json({ error: "seasonId is required for ranked leaderboards" }, 400);
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

  if (!Number.isFinite(elo)) {
    return json({ error: "elo must be a number" }, 400);
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

  return json(
    {
      mode,
      seasonId,
      entry: {
        playerId,
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
