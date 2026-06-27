ALTER TABLE stored_lineups ADD COLUMN consumed_at TEXT;
ALTER TABLE stored_lineups ADD COLUMN consumed_by TEXT;

CREATE TABLE IF NOT EXISTS owner_match_results (
  id TEXT PRIMARY KEY,
  lineup_id TEXT NOT NULL,
  owner_player_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  owner_result TEXT NOT NULL,
  opponent_team_name TEXT NOT NULL,
  opponent_elo INTEGER NOT NULL,
  owner_lineup_json TEXT NOT NULL,
  owner_score INTEGER NOT NULL,
  opponent_score INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  acknowledged_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_owner_results_player
  ON owner_match_results (owner_player_id, mode, acknowledged_at);

CREATE INDEX IF NOT EXISTS idx_stored_lineups_unconsumed
  ON stored_lineups (mode, player_id, consumed_at, created_at DESC);
