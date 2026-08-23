-- Optional invite target for Challenge flows (Community / Ranks / results).
-- When set, only that playerId may join as guest.
ALTER TABLE private_rooms ADD COLUMN invited_player_id TEXT;

CREATE INDEX IF NOT EXISTS idx_private_rooms_invited
  ON private_rooms (invited_player_id, status, expires_at);
