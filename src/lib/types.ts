import type { DefenseGrade } from "./defenseRating";
import type { DailyDraftMode } from "./dailyDraftMode";

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
  /** Team the player's season stats were earned for (before roster overrides). */
  statsTeam?: string;
  lastTeam?: string;
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
  freeThrowsAttempted: number;
  freeThrowPct: number;
  personalFouls: number;
  minutes: number;
  heightInches: number;
  usage: number;
  defense: number;
  defenseGrade?: DefenseGrade;
  gamesPlayed: number;
  age?: number;
  styles: PlayStyle[];
  era?: "1970s" | "1980s" | "1990s" | "2000s" | "2010s";
  salary?: number;
  /** NBA draft year when known (used by Tier List filters). */
  draftYear?: number;
  /** Prospect available in Tier List only, not competitive modes. */
  isUpcomingRookie?: boolean;
}

export interface DraftSlotConstraint {
  position: Position;
  division: Division;
}

export interface Drafter {
  id: string;
  name: string;
  accent: string;
  lineup: string[];
  draftSlots: DraftSlotConstraint[];
  isDailyDraft?: boolean;
  dailyDraftMode?: DailyDraftMode;
  dailyChallengeTitle?: string;
  salaryCapMode?: boolean;
  salaryCapLimit?: number;
  allTimeMode?: boolean;
  practiceMode?: boolean;
  /** Weekly Events mode id (e.g. 2026-W30-u25). */
  eventId?: string;
  eventRestriction?: "u25" | "intl";
  rankedOpponentElo?: number;
  classicOpponentElo?: number;
  isGhostOpponent?: boolean;
  isLiveOpponent?: boolean;
  liveMatchId?: string;
  liveOpponentPlayerId?: string;
  /** Opaque or private id used to open a GM profile from match results. */
  profilePlayerId?: string;
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
  preciseTotal: number;
  /** Uncapped OVR before the 0–100 clamp (can exceed 100). */
  uncappedTotal: number;
  /** Whole-number points over 100 OVR; 0 when not capped. */
  ovrOverflow: number;
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
