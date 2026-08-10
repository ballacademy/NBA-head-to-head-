CREATE TABLE IF NOT EXISTS player_achievements (
  player_id TEXT PRIMARY KEY,
  unlocked_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
