CREATE TABLE IF NOT EXISTS player_event_profiles (
  player_id TEXT PRIMARY KEY,
  profiles_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
