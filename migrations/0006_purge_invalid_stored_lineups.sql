-- Remove ghost lineups saved before the salary-cap draft deadlock fix (PR #55),
-- and any rows that never stored five player ids.
DELETE FROM stored_lineups
WHERE created_at < '2026-06-28T05:00:00.000Z'
   OR json_array_length(lineup_json) != 5;
