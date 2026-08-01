-- Store uncapped OVR as fractional values so 100+(N) matchups stay
-- distinguishable after ghost/API persistence (was INTEGER + Math.round).
CREATE TABLE owner_match_results_real (
  id TEXT PRIMARY KEY,
  lineup_id TEXT NOT NULL,
  owner_player_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  owner_result TEXT NOT NULL,
  opponent_team_name TEXT NOT NULL,
  opponent_elo INTEGER NOT NULL,
  owner_lineup_json TEXT NOT NULL,
  owner_score REAL NOT NULL,
  opponent_score REAL NOT NULL,
  created_at TEXT NOT NULL,
  acknowledged_at TEXT
);

INSERT INTO owner_match_results_real (
  id, lineup_id, owner_player_id, mode,
  owner_result, opponent_team_name, opponent_elo,
  owner_lineup_json, owner_score, opponent_score,
  created_at, acknowledged_at
)
SELECT
  id, lineup_id, owner_player_id, mode,
  owner_result, opponent_team_name, opponent_elo,
  owner_lineup_json, owner_score, opponent_score,
  created_at, acknowledged_at
FROM owner_match_results;

DROP TABLE owner_match_results;
ALTER TABLE owner_match_results_real RENAME TO owner_match_results;

CREATE INDEX IF NOT EXISTS idx_owner_results_player
  ON owner_match_results (owner_player_id, mode, acknowledged_at);
