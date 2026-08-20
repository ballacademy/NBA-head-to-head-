CREATE TABLE IF NOT EXISTS player_tier_list_library (
  player_id TEXT PRIMARY KEY,
  library_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
