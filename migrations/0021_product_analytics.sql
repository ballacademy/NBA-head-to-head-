CREATE TABLE IF NOT EXISTS product_analytics (
  event_name TEXT NOT NULL,
  day_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (event_name, day_key)
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_day
  ON product_analytics (day_key);
