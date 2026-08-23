CREATE TABLE IF NOT EXISTS account_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (account_id) REFERENCES player_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_account_sessions_player
  ON account_sessions (player_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_account_sessions_expires
  ON account_sessions (expires_at);
