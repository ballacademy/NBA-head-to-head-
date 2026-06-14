export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type PlayStyle =
  | "engine"
  | "scorer"
  | "connector"
  | "shooter"
  | "stopper"
  | "rim-protector"
  | "roll-man";

export interface Player {
  id: string;
  name: string;
  team: string;
  position: Position;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  trueShooting: number;
  threePoint: number;
  usage: number;
  defense: number;
  styles: PlayStyle[];
}

export interface Drafter {
  id: string;
  name: string;
  city: string;
  accent: string;
  lineup: string[];
}

export interface ScoreCategory {
  label: string;
  value: number;
  note: string;
}

export interface LineupScore {
  total: number;
  categories: ScoreCategory[];
  strengths: string[];
  warnings: string[];
}

export interface Matchup {
  id: string;
  round: string;
  drafterA: string;
  drafterB: string;
}

export interface MatchupResult extends Matchup {
  scoreA: LineupScore;
  scoreB: LineupScore;
  winnerId: string;
  margin: number;
}
