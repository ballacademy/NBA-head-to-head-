-- Community posts suite: quotes, author flair, replies, reports.

ALTER TABLE community_posts ADD COLUMN quote_post_id TEXT;
ALTER TABLE community_posts ADD COLUMN quote_json TEXT;
ALTER TABLE community_posts ADD COLUMN author_classic_elo INTEGER;
ALTER TABLE community_posts ADD COLUMN author_ranked_elo INTEGER;

CREATE INDEX IF NOT EXISTS idx_community_posts_quote
  ON community_posts (quote_post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_post_replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_tag TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_post_replies_post
  ON community_post_replies (post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS community_post_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  reporter_player_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_post_reports_post
  ON community_post_reports (post_id, created_at DESC);
