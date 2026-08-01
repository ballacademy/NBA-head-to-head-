-- Remove leaderboard rows for players who never created an account.
-- Appearing on leaderboards now requires a linked player_accounts row.
DELETE FROM leaderboard_entries
WHERE NOT EXISTS (
  SELECT 1
  FROM player_accounts pa
  WHERE pa.player_id = leaderboard_entries.player_id
);
