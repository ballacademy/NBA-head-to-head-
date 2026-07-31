-- Published tier lists and likes for the community browser.

CREATE TABLE IF NOT EXISTS published_tier_lists (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_tag TEXT NOT NULL,
  title TEXT NOT NULL,
  tiers_json TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_published_tier_lists_created
  ON published_tier_lists (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_published_tier_lists_likes
  ON published_tier_lists (like_count DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_published_tier_lists_player
  ON published_tier_lists (player_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS tier_list_likes (
  tier_list_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tier_list_id, player_id),
  FOREIGN KEY (tier_list_id) REFERENCES published_tier_lists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tier_list_likes_player
  ON tier_list_likes (player_id, created_at DESC);
