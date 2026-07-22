-- Soft-claim ghost lineups so Pro locks stay until a real match result (or TTL).
ALTER TABLE stored_lineups ADD COLUMN claimed_by TEXT;
ALTER TABLE stored_lineups ADD COLUMN claim_expires_at TEXT;

CREATE INDEX IF NOT EXISTS idx_stored_lineups_claim_expires
  ON stored_lineups (mode, claim_expires_at);
