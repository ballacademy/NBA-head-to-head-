CREATE TABLE IF NOT EXISTS private_rematches (
  source_match_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  player_a_id TEXT NOT NULL,
  player_a_team TEXT NOT NULL,
  player_a_elo INTEGER NOT NULL,
  player_b_id TEXT NOT NULL,
  player_b_team TEXT NOT NULL,
  player_b_elo INTEGER NOT NULL,
  player_a_ready_at TEXT,
  player_b_ready_at TEXT,
  new_match_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_private_rematches_status_expires
  ON private_rematches (status, expires_at);
