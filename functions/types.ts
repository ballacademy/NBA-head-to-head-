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
  awaiting_live?: number | null;
  salary_total?: number | null;
  star_count?: number | null;
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

export interface LeaderboardEntryRow {
  mode: string;
  season_id: string;
  player_id: string;
  team_name: string;
  public_tag: string;
  elo: number;
  wins: number;
  losses: number;
  win_streak: number;
  loss_streak: number;
  updated_at: string;
}
