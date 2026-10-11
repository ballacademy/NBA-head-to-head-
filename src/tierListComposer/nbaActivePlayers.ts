import catalog from "../../data/nba-active-tier-players.json";
import { DIVISIONS } from "../lib/divisions";
import type { Division } from "../lib/types";
import { NBA_TEAMS, NBA_TEAMS_BY_ID } from "../standingsComposer/teams";

export type PlayerPosition = "PG" | "SG" | "SF" | "PF" | "C" | "G" | "F";
export type PlayerPositionGroup = "G" | "F" | "C";

export interface TierPlayer {
  id: string;
  name: string;
  team: string;
  headshotUrl: string;
  age: number;
  heightInches: number;
  displayHeight: string;
  position: PlayerPosition;
  positionGroup: PlayerPositionGroup;
  division: Division;
}

type CatalogFile = {
  description: string;
  source: string;
  headshotCdn: string;
  playerCount: number;
  players: TierPlayer[];
};

const data = catalog as CatalogFile;

export const NBA_ACTIVE_PLAYERS: TierPlayer[] = data.players;
export const NBA_ACTIVE_PLAYER_COUNT = data.playerCount;
export const NBA_HEADSHOT_CDN = data.headshotCdn;
export const NBA_ROSTER_SOURCE = data.source;

export const NBA_ACTIVE_PLAYERS_BY_ID: Record<string, TierPlayer> =
  Object.fromEntries(NBA_ACTIVE_PLAYERS.map((player) => [player.id, player]));

export const getPlayer = (id: string | null | undefined): TierPlayer | null =>
  (id && NBA_ACTIVE_PLAYERS_BY_ID[id]) || null;

export const ALL_PLAYER_FILTER = "all";

export interface PlayerSearchFilters {
  team?: string;
  age?: string;
  height?: string;
  division?: string;
  position?: string;
}

type RangeBucket = {
  id: string;
  label: string;
  min: number;
  max: number;
};

export const AGE_FILTERS: ReadonlyArray<{ id: string; label: string } | RangeBucket> = [
  { id: ALL_PLAYER_FILTER, label: "All ages" },
  { id: "19-22", label: "22 and under", min: 0, max: 22 },
  { id: "23-26", label: "23–26", min: 23, max: 26 },
  { id: "27-30", label: "27–30", min: 27, max: 30 },
  { id: "31-34", label: "31–34", min: 31, max: 34 },
  { id: "35+", label: "35+", min: 35, max: 99 },
];

export const HEIGHT_FILTERS: ReadonlyArray<{ id: string; label: string } | RangeBucket> = [
  { id: ALL_PLAYER_FILTER, label: "All heights" },
  { id: "u72", label: "Under 6'0\"", min: 0, max: 71 },
  { id: "72-76", label: "6'0\"–6'4\"", min: 72, max: 76 },
  { id: "77-80", label: "6'5\"–6'8\"", min: 77, max: 80 },
  { id: "81-83", label: "6'9\"–6'11\"", min: 81, max: 83 },
  { id: "84+", label: "7'0\"+", min: 84, max: 99 },
];

export const POSITION_FILTERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: ALL_PLAYER_FILTER, label: "All positions" },
  { id: "PG", label: "PG" },
  { id: "SG", label: "SG" },
  { id: "SF", label: "SF" },
  { id: "PF", label: "PF" },
  { id: "C", label: "C" },
  { id: "G", label: "G" },
  { id: "F", label: "F" },
];

export const TEAM_FILTERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: ALL_PLAYER_FILTER, label: "All teams" },
  ...NBA_TEAMS.map((team) => ({ id: team.id, label: team.name })),
];

export const DIVISION_FILTERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: ALL_PLAYER_FILTER, label: "All divisions" },
  ...DIVISIONS.map((division) => ({ id: division, label: division })),
];

const rangeFor = (
  buckets: ReadonlyArray<{ id: string; label: string } | RangeBucket>,
  id: string | undefined,
): RangeBucket | null => {
  if (!id || id === ALL_PLAYER_FILTER) {
    return null;
  }
  const match = buckets.find((bucket) => bucket.id === id);
  return match && "min" in match ? match : null;
};

const inRange = (value: number, min: number, max: number) =>
  value >= min && value <= max;

export const searchPlayers = (
  query: string,
  filters: PlayerSearchFilters = {},
): TierPlayer[] => {
  const needle = query.trim().toLowerCase();
  const team =
    filters.team && filters.team !== ALL_PLAYER_FILTER ? filters.team : null;
  const division =
    filters.division && filters.division !== ALL_PLAYER_FILTER
      ? filters.division
      : null;
  const position =
    filters.position && filters.position !== ALL_PLAYER_FILTER
      ? filters.position
      : null;
  const age = rangeFor(AGE_FILTERS, filters.age);
  const height = rangeFor(HEIGHT_FILTERS, filters.height);

  return NBA_ACTIVE_PLAYERS.filter((player) => {
    if (team && player.team !== team) {
      return false;
    }
    if (division && player.division !== division) {
      return false;
    }
    if (position && player.position !== position) {
      return false;
    }
    if (age && !inRange(player.age, age.min, age.max)) {
      return false;
    }
    if (height && !inRange(player.heightInches, height.min, height.max)) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const teamCode = needle.toUpperCase();
    if (NBA_TEAMS_BY_ID[teamCode]) {
      return player.team === teamCode;
    }
    return (
      player.name.toLowerCase().includes(needle) ||
      player.team.toLowerCase().includes(needle)
    );
  });
};

/** A few stars for screenshots / seed boards. */
export const EXAMPLE_PLAYER_IDS = {
  lebron: "1966",
  jokic: "3112335",
  shai: "4278073",
  luka: "3945274",
  wemby: "5104157",
  ant: "4594268",
  curry: "3975",
  tatum: "4065648",
} as const;
