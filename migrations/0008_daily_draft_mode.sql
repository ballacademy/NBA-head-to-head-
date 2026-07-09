ALTER TABLE daily_draft_scores ADD COLUMN mode TEXT NOT NULL DEFAULT 'basic';

CREATE INDEX IF NOT EXISTS idx_daily_draft_scores_date_mode_goal
  ON daily_draft_scores (date_key, mode, goal_id);
