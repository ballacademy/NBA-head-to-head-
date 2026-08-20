CREATE TABLE IF NOT EXISTS player_nba_usage (
  player_id TEXT PRIMARY KEY,
  usage_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
