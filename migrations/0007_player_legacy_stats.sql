CREATE TABLE IF NOT EXISTS player_legacy_stats (
  player_id TEXT PRIMARY KEY,
  peak_elo INTEGER NOT NULL DEFAULT 0,
  peak_elo_season_id TEXT NOT NULL DEFAULT '',
  best_monthly_rank INTEGER,
  best_monthly_rank_season_id TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_player_legacy_peak_elo
  ON player_legacy_stats (peak_elo DESC);
