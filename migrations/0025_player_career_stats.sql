CREATE TABLE IF NOT EXISTS player_career_stats (
  player_id TEXT PRIMARY KEY,
  career_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
