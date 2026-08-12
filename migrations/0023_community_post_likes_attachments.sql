-- Community posts: likes + optional matchup/lineup attachment.

ALTER TABLE community_posts ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN attachment_json TEXT;

CREATE INDEX IF NOT EXISTS idx_community_posts_likes
  ON community_posts (like_count DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS community_post_likes (
  post_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_likes_player
  ON community_post_likes (player_id, created_at DESC);
