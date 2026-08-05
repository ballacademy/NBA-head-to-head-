CREATE TABLE IF NOT EXISTS private_rooms (
  code TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  host_player_id TEXT NOT NULL,
  host_team_name TEXT NOT NULL,
  host_elo INTEGER NOT NULL,
  guest_player_id TEXT,
  guest_team_name TEXT,
  guest_elo INTEGER,
  match_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_private_rooms_status_expires
  ON private_rooms (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_private_rooms_host
  ON private_rooms (host_player_id, status, created_at);
