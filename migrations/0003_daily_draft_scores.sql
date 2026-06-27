CREATE TABLE IF NOT EXISTS daily_draft_scores (
  date_key TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  value REAL NOT NULL,
  formatted_result TEXT NOT NULL,
  lineup_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  PRIMARY KEY (date_key, goal_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_draft_scores_date_goal_value
  ON daily_draft_scores (date_key, goal_id, value);
