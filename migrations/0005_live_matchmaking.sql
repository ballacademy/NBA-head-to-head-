CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  elo INTEGER NOT NULL,
  joined_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_mode_expires
  ON matchmaking_queue (mode, expires_at, joined_at);

CREATE TABLE IF NOT EXISTS live_matches (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  player_a_id TEXT NOT NULL,
  player_a_team TEXT NOT NULL,
  player_a_elo INTEGER NOT NULL,
  player_a_lineup_json TEXT,
  player_a_ready_at TEXT,
  player_b_id TEXT NOT NULL,
  player_b_team TEXT NOT NULL,
  player_b_elo INTEGER NOT NULL,
  player_b_lineup_json TEXT,
  player_b_ready_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_matches_player_a
  ON live_matches (mode, player_a_id, created_at);

CREATE INDEX IF NOT EXISTS idx_live_matches_player_b
  ON live_matches (mode, player_b_id, created_at);
