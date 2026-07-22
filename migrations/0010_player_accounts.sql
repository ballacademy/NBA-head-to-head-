-- Optional password accounts for restoring a GM identity across browsers.
-- Passwords are stored only as salted PBKDF2 hashes (never plaintext).

CREATE TABLE IF NOT EXISTS player_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iters INTEGER NOT NULL,
  player_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_player_accounts_player_id
  ON player_accounts (player_id);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  attempt_count INTEGER NOT NULL
);
