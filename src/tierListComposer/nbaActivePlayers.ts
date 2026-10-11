import catalog from "../../data/nba-active-tier-players.json";
import {
  CONFERENCES,
  DIVISIONS,
  getConferenceForTeam,
  type Conference,
} from "../lib/divisions";
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
  conference: Conference;
  draftYear: number | null;
  draftRound: number | null;
  draftPick: number | null;
  country: string | null;
  experienceYears: number;
  allStar: boolean;
}

type CatalogFile = {
  description: string;
  source: string;
  headshotCdn: string;
  playerCount: number;
  players: Array<
    Omit<TierPlayer, "conference"> & {
      conference?: Conference;
    }
  >;
};

const data = catalog as CatalogFile;

export const NBA_ACTIVE_PLAYERS: TierPlayer[] = data.players.map((player) => ({
  ...player,
  conference:
    player.conference ??
    getConferenceForTeam(player.team) ??
    NBA_TEAMS_BY_ID[player.team]?.conference ??
    "East",
}));
export const NBA_ACTIVE_PLAYER_COUNT = data.playerCount;
export const NBA_HEADSHOT_CDN = data.headshotCdn;
export const NBA_ROSTER_SOURCE = data.source;

export const NBA_ACTIVE_PLAYERS_BY_ID: Record<string, TierPlayer> =
  Object.fromEntries(NBA_ACTIVE_PLAYERS.map((player) => [player.id, player]));

export const getPlayer = (id: string | null | undefined): TierPlayer | null =>
  (id && NBA_ACTIVE_PLAYERS_BY_ID[id]) || null;

export const ALL_PLAYER_FILTER = "all";
export const UNDRAFTED_FILTER = "undrafted";
export const INTERNATIONAL_FILTER = "international";
export const ALL_STAR_FILTER = "all-star";
export const NEVER_ALL_STAR_FILTER = "never";
export const LOTTERY_FILTER = "lottery";
export const NON_LOTTERY_FILTER = "non-lottery";

export interface PlayerSearchFilters {
  team?: string;
  age?: string;
  height?: string;
  division?: string;
  conference?: string;
  position?: string;
  draftClass?: string;
  draftStatus?: string;
  allStar?: string;
  country?: string;
  experience?: string;
}

export const EMPTY_PLAYER_FILTERS: PlayerSearchFilters = {
  team: ALL_PLAYER_FILTER,
  age: ALL_PLAYER_FILTER,
  height: ALL_PLAYER_FILTER,
  division: ALL_PLAYER_FILTER,
  conference: ALL_PLAYER_FILTER,
  position: ALL_PLAYER_FILTER,
  draftClass: ALL_PLAYER_FILTER,
  draftStatus: ALL_PLAYER_FILTER,
  allStar: ALL_PLAYER_FILTER,
  country: ALL_PLAYER_FILTER,
  experience: ALL_PLAYER_FILTER,
};

export const isEmptyPlayerFilters = (filters: PlayerSearchFilters) =>
  (Object.keys(EMPTY_PLAYER_FILTERS) as Array<keyof PlayerSearchFilters>).every(
    (key) => (filters[key] ?? ALL_PLAYER_FILTER) === ALL_PLAYER_FILTER,
  );

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

export const EXPERIENCE_FILTERS: ReadonlyArray<{ id: string; label: string } | RangeBucket> = [
  { id: ALL_PLAYER_FILTER, label: "All experience" },
  { id: "rookie", label: "Rookie / 1st year", min: 0, max: 1 },
  { id: "2-3", label: "2–3 years", min: 2, max: 3 },
  { id: "4-6", label: "4–6 years", min: 4, max: 6 },
  { id: "7-10", label: "7–10 years", min: 7, max: 10 },
  { id: "11+", label: "11+ years", min: 11, max: 40 },
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

export const CONFERENCE_FILTERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: ALL_PLAYER_FILTER, label: "All conferences" },
  ...CONFERENCES.map((conference) => ({ id: conference, label: conference })),
];

export const ALL_STAR_FILTERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: ALL_PLAYER_FILTER, label: "All players" },
  { id: ALL_STAR_FILTER, label: "All-Star" },
  { id: NEVER_ALL_STAR_FILTER, label: "Never All-Star" },
];

export const DRAFT_STATUS_FILTERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: ALL_PLAYER_FILTER, label: "All draft status" },
  { id: LOTTERY_FILTER, label: "Lottery" },
  { id: NON_LOTTERY_FILTER, label: "Non-lottery" },
  { id: UNDRAFTED_FILTER, label: "Undrafted" },
];

const draftYears = [
  ...new Set(
    NBA_ACTIVE_PLAYERS.map((player) => player.draftYear).filter(
      (year): year is number => typeof year === "number",
    ),
  ),
].sort((left, right) => right - left);

export const DRAFT_CLASS_FILTERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: ALL_PLAYER_FILTER, label: "All classes" },
  ...draftYears.map((year) => ({ id: String(year), label: String(year) })),
  { id: UNDRAFTED_FILTER, label: "Undrafted" },
];

const countryCounts = new Map<string, number>();
for (const player of NBA_ACTIVE_PLAYERS) {
  if (!player.country) {
    continue;
  }
  countryCounts.set(player.country, (countryCounts.get(player.country) ?? 0) + 1);
}

const countryNames = [...countryCounts.keys()].sort((left, right) => {
  if (left === "United States") {
    return -1;
  }
  if (right === "United States") {
    return 1;
  }
  return left.localeCompare(right);
});

export const COUNTRY_FILTERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: ALL_PLAYER_FILTER, label: "All countries" },
  { id: INTERNATIONAL_FILTER, label: "International" },
  ...countryNames.map((country) => ({
    id: country,
    label: `${country} (${countryCounts.get(country)})`,
  })),
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

const isLotteryPick = (player: TierPlayer) =>
  player.draftRound === 1 &&
  player.draftPick != null &&
  player.draftPick >= 1 &&
  player.draftPick <= 14;

const matchesDraftClass = (player: TierPlayer, draftClass: string | undefined) => {
  if (!draftClass || draftClass === ALL_PLAYER_FILTER) {
    return true;
  }
  if (draftClass === UNDRAFTED_FILTER) {
    return player.draftYear == null;
  }
  return player.draftYear === Number(draftClass);
};

const matchesDraftStatus = (player: TierPlayer, draftStatus: string | undefined) => {
  if (!draftStatus || draftStatus === ALL_PLAYER_FILTER) {
    return true;
  }
  if (draftStatus === UNDRAFTED_FILTER) {
    return player.draftYear == null;
  }
  if (draftStatus === LOTTERY_FILTER) {
    return isLotteryPick(player);
  }
  if (draftStatus === NON_LOTTERY_FILTER) {
    return player.draftYear != null && !isLotteryPick(player);
  }
  return true;
};

const matchesAllStar = (player: TierPlayer, allStar: string | undefined) => {
  if (!allStar || allStar === ALL_PLAYER_FILTER) {
    return true;
  }
  if (allStar === ALL_STAR_FILTER) {
    return player.allStar;
  }
  if (allStar === NEVER_ALL_STAR_FILTER) {
    return !player.allStar;
  }
  return true;
};

const matchesCountry = (player: TierPlayer, country: string | undefined) => {
  if (!country || country === ALL_PLAYER_FILTER) {
    return true;
  }
  if (country === INTERNATIONAL_FILTER) {
    return Boolean(player.country) && player.country !== "United States";
  }
  return player.country === country;
};

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
  const conference =
    filters.conference && filters.conference !== ALL_PLAYER_FILTER
      ? filters.conference
      : null;
  const position =
    filters.position && filters.position !== ALL_PLAYER_FILTER
      ? filters.position
      : null;
  const age = rangeFor(AGE_FILTERS, filters.age);
  const height = rangeFor(HEIGHT_FILTERS, filters.height);
  const experience = rangeFor(EXPERIENCE_FILTERS, filters.experience);

  return NBA_ACTIVE_PLAYERS.filter((player) => {
    if (team && player.team !== team) {
      return false;
    }
    if (division && player.division !== division) {
      return false;
    }
    if (conference && player.conference !== conference) {
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
    if (experience && !inRange(player.experienceYears, experience.min, experience.max)) {
      return false;
    }
    if (!matchesDraftClass(player, filters.draftClass)) {
      return false;
    }
    if (!matchesDraftStatus(player, filters.draftStatus)) {
      return false;
    }
    if (!matchesAllStar(player, filters.allStar)) {
      return false;
    }
    if (!matchesCountry(player, filters.country)) {
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
