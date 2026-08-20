CREATE INDEX IF NOT EXISTS idx_daily_draft_scores_player_date
  ON daily_draft_scores (player_id, date_key);
