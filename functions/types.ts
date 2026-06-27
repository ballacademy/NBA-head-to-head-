export interface Env {
  DB: D1Database;
}

export type MatchmakingMode = "classic" | "ranked";

export interface StoredLineupRow {
  id: string;
  mode: string;
  player_id: string;
  team_name: string;
  lineup_json: string;
  elo: number;
  created_at: string;
  consumed_at?: string | null;
  consumed_by?: string | null;
}

export interface DailyDraftScoreRow {
  date_key: string;
  goal_id: string;
  player_id: string;
  team_name: string;
  value: number;
  formatted_result: string;
  lineup_json: string;
  submitted_at: string;
}
