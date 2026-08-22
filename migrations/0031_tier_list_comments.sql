-- Comments on published public tier lists.

CREATE TABLE IF NOT EXISTS tier_list_comments (
  id TEXT PRIMARY KEY,
  tier_list_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_tag TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tier_list_id) REFERENCES published_tier_lists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tier_list_comments_list
  ON tier_list_comments (tier_list_id, created_at ASC);
