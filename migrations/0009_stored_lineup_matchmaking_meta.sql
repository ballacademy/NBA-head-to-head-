-- Distinguish intentional live-queue lineups from normal ghost-pool saves,
-- and store salary / star metadata for fair matchmaking filters.
ALTER TABLE stored_lineups ADD COLUMN awaiting_live INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stored_lineups ADD COLUMN salary_total INTEGER;
ALTER TABLE stored_lineups ADD COLUMN star_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_stored_lineups_awaiting_live
  ON stored_lineups (mode, player_id, awaiting_live, consumed_at);
