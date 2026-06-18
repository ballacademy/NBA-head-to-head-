import type { DefenseGrade } from "./defenseRating";

export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type Division =
  | "Atlantic"
  | "Central"
  | "Southeast"
  | "Northwest"
  | "Pacific"
  | "Southwest";

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
  bbrPlayerId?: string;
  name: string;
  team: string;
  position: Position;
  positions: Position[];
  jerseyNumber: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  trueShooting: number;
  threePoint: number;
  threePointersAttempted: number;
  fieldGoalsAttempted: number;
  minutes: number;
  heightInches: number;
  usage: number;
  defense: number;
  defenseGrade?: DefenseGrade;
  gamesPlayed: number;
  age?: number;
  styles: PlayStyle[];
  era?: "2010s" | "1990s";
  salary?: number;
}

export interface DraftSlotConstraint {
  position: Position;
  division: Division;
}

export interface Drafter {
  id: string;
  name: string;
  city: string;
  accent: string;
  lineup: string[];
  draftSlots: DraftSlotConstraint[];
  isDailyDraft?: boolean;
  dailyChallengeTitle?: string;
  salaryCapMode?: boolean;
  allTimeMode?: boolean;
}

export interface ScoreCategory {
  label: string;
  value: number;
  note: string;
}

export interface ProjectedRecord {
  wins: number;
  losses: number;
  formatted: string;
}

export interface LineupScore {
  total: number;
  projectedRecord: ProjectedRecord;
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
