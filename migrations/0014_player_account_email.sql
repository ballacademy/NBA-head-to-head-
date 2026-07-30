-- Recovery/contact email for optional accounts (required for new signups).
ALTER TABLE player_accounts ADD COLUMN email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_accounts_email
  ON player_accounts (email)
  WHERE email IS NOT NULL;
