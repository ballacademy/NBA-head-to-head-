-- Reports against published public tier lists (parity with community posts).
CREATE TABLE IF NOT EXISTS tier_list_reports (
  id TEXT PRIMARY KEY,
  tier_list_id TEXT NOT NULL,
  reporter_player_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tier_list_reports_list
  ON tier_list_reports (tier_list_id, created_at DESC);
