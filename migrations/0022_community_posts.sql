-- Short community text posts (MVP feed).

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_tag TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created
  ON community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_player
  ON community_posts (player_id, created_at DESC);
