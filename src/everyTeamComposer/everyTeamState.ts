import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { NBA_TEAMS, type NbaTeam } from "../standingsComposer/teams";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";

export { DEFAULT_BRAND };

/** City / location labels used for alphabetical slot order. */
export const EVERY_TEAM_CITY: Record<string, string> = {
  ATL: "Atlanta",
  BOS: "Boston",
  BKN: "Brooklyn",
  CHA: "Charlotte",
  CHI: "Chicago",
  CLE: "Cleveland",
  DAL: "Dallas",
  DEN: "Denver",
  DET: "Detroit",
  GSW: "Golden State",
  HOU: "Houston",
  IND: "Indiana",
  LAC: "LA Clippers",
  LAL: "Los Angeles Lakers",
  MEM: "Memphis",
  MIA: "Miami",
  MIL: "Milwaukee",
  MIN: "Minnesota",
  NOP: "New Orleans",
  NYK: "New York",
  OKC: "Oklahoma City",
  ORL: "Orlando",
  PHI: "Philadelphia",
  PHX: "Phoenix",
  POR: "Portland",
  SAC: "Sacramento",
  SAS: "San Antonio",
  TOR: "Toronto",
  UTA: "Utah",
  WAS: "Washington",
};

export const EVERY_TEAM_ORDER: NbaTeam[] = [...NBA_TEAMS].sort((a, b) => {
  const left = EVERY_TEAM_CITY[a.id] ?? a.name;
  const right = EVERY_TEAM_CITY[b.id] ?? b.name;
  return left.localeCompare(right);
});

export const EVERY_TEAM_COUNT = EVERY_TEAM_ORDER.length;
export const EVERY_TEAM_COLS = 5;
export const EVERY_TEAM_ROWS = 6;

export const DEFAULT_EVERY_TEAM_TITLE =
  "MOST DISAPPOINTING PLAYER ON EVERY NBA TEAM";

export type EveryTeamSlots = Array<string | null>;

export const createEmptyEveryTeamSlots = (): EveryTeamSlots =>
  Array.from({ length: EVERY_TEAM_COUNT }, () => null);

export const isEveryTeamSlots = (value: unknown): value is EveryTeamSlots =>
  Array.isArray(value) &&
  value.length === EVERY_TEAM_COUNT &&
  value.every((slot) => slot === null || typeof slot === "string");

export interface EveryTeamDraft {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
}

export const isEveryTeamDraft = (value: unknown): value is EveryTeamDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as EveryTeamDraft).brand === "string" &&
      typeof (value as EveryTeamDraft).title === "string" &&
      isEveryTeamSlots((value as EveryTeamDraft).slots),
  );

export const teamAtSlot = (index: number): NbaTeam | null =>
  EVERY_TEAM_ORDER[index] ?? null;

export const assignPlayer = (
  slots: EveryTeamSlots,
  index: number,
  playerId: string,
): EveryTeamSlots => {
  if (index < 0 || index >= EVERY_TEAM_COUNT || !playerId) {
    return slots;
  }
  const next = slots.slice();
  const previous = next.indexOf(playerId);
  if (previous >= 0 && previous !== index) {
    next[previous] = null;
  }
  next[index] = playerId;
  return next;
};

export const clearEveryTeamSlot = (
  slots: EveryTeamSlots,
  index: number,
): EveryTeamSlots => {
  if (index < 0 || index >= EVERY_TEAM_COUNT) {
    return slots;
  }
  const next = slots.slice();
  next[index] = null;
  return next;
};

export const splitEveryTeamTitle = (title: string): string[] =>
  splitBalancedTitle(title, DEFAULT_EVERY_TEAM_TITLE);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const exportEveryTeamFilename = (title: string) => {
  const stem = slugify(title) || "every-nba-team";
  return `${stem}.png`;
};
