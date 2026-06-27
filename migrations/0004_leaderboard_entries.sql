CREATE TABLE IF NOT EXISTS leaderboard_entries (
  mode TEXT NOT NULL,
  season_id TEXT NOT NULL DEFAULT '',
  player_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  public_tag TEXT NOT NULL,
  elo INTEGER NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  win_streak INTEGER NOT NULL DEFAULT 0,
  loss_streak INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (mode, season_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_mode_season_elo
  ON leaderboard_entries (mode, season_id, elo DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_mode_season_win_streak
  ON leaderboard_entries (mode, season_id, win_streak DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_mode_season_loss_streak
  ON leaderboard_entries (mode, season_id, loss_streak DESC);
