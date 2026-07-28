-- Signup order for founding-GM badge (first 500 accounts).
ALTER TABLE player_accounts ADD COLUMN signup_index INTEGER;

-- Backfill existing accounts in creation order.
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC, rowid ASC) AS rn
  FROM player_accounts
)
UPDATE player_accounts
SET signup_index = (
  SELECT ordered.rn FROM ordered WHERE ordered.id = player_accounts.id
)
WHERE signup_index IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_accounts_signup_index
  ON player_accounts (signup_index);
