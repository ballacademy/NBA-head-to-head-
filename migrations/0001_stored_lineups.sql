CREATE TABLE IF NOT EXISTS stored_lineups (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  lineup_json TEXT NOT NULL,
  elo INTEGER NOT NULL DEFAULT 1000,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stored_lineups_mode_elo_created
  ON stored_lineups (mode, elo, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stored_lineups_player
  ON stored_lineups (player_id, created_at DESC);
