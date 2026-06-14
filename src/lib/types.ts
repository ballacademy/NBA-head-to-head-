export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type PlayStyle =
  | "engine"
  | "scorer"
  | "connector"
  | "shooter"
  | "stopper"
  | "rim-protector"
  | "roll-man";

export interface SeasonStats {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  trueShooting: number;
  threePoint: number;
  usage: number;
  defense: number;
}

export interface Player extends SeasonStats {
  id: string;
  name: string;
  team: string;
  position: Position;
  styles: PlayStyle[];
  // Optional 2025-26 postseason per-game splits. When present, the player's
  // effective stats are a 75% regular-season / 25% postseason blend; when
  // absent (player missed the playoffs) only the regular season is used.
  postseason?: SeasonStats;
}

// A player whose season/postseason splits have already been blended into the
// flat stat fields the scoring engine reads. `blended` records whether a
// postseason split actually contributed to the numbers.
export type ResolvedPlayer = Omit<Player, "postseason"> & {
  blended?: boolean;
};

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
