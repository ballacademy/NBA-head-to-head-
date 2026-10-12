import scoring from "../../data/nba-active-tier-player-scoring.json";
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
  /** 2025-26 regular-season points per game; 0 when Basketball-Reference has no row. */
  ppg: number;
}

type HeadshotFallback = {
  id: string;
  name: string;
  team: string;
  source: string;
  url: string;
};

type CatalogFile = {
  description: string;
  source: string;
  headshotCdn: string;
  playerCount: number;
  players: Array<
    Omit<TierPlayer, "conference" | "ppg"> & {
      conference?: Conference;
    }
  >;
  headshotFallbacks?: HeadshotFallback[];
};

type ScoringFile = {
  season: string;
  source: string;
  metric: string;
  byEspnId: Record<string, number>;
};

const data = catalog as CatalogFile;
const scoringData = scoring as ScoringFile;

export const NBA_ACTIVE_PLAYERS: TierPlayer[] = data.players.map((player) => ({
  ...player,
  conference:
    player.conference ??
    getConferenceForTeam(player.team) ??
    NBA_TEAMS_BY_ID[player.team]?.conference ??
    "East",
  ppg: scoringData.byEspnId[player.id] ?? 0,
}));
export const NBA_ACTIVE_PLAYER_COUNT = data.playerCount;
export const NBA_HEADSHOT_CDN = data.headshotCdn;
export const NBA_ROSTER_SOURCE = data.source;
export const NBA_HEADSHOT_FALLBACKS = data.headshotFallbacks ?? [];
/** Basketball-Reference 2025-26 regular-season PPG (per-game table). */
export const PLAYER_SCORING_SEASON = scoringData.season;
export const PLAYER_SCORING_SOURCE = scoringData.source;
export const PLAYER_SCORING_METRIC = "pointsPerGame";
export const PLAYER_SORT_KEY = "ddgm:tier-list-player-sort";
export const PLAYER_FILTERS_KEY = "ddgm:tier-list-player-filters";
export type PlayerPickerSort = "name" | "points";

export const parsePlayerPickerSort = (value: unknown): PlayerPickerSort =>
  value === "points" ? "points" : "name";

export const isComposerHeadshotUrl = (url: string) =>
  url.startsWith("https://a.espncdn.com/i/headshots/") ||
  url.startsWith("/composer-headshots/");

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

export interface NumberRange {
  min: number;
  max: number;
}

export interface PlayerSearchFilters {
  team?: string;
  ageRange?: NumberRange;
  heightRange?: NumberRange;
  division?: string;
  conference?: string;
  position?: string;
  draftClass?: string;
  draftStatus?: string;
  allStar?: string;
  country?: string;
  experienceRange?: NumberRange;
}

const spanOf = (values: number[]): NumberRange => ({
  min: Math.min(...values),
  max: Math.max(...values),
});

export const AGE_SPAN = spanOf(NBA_ACTIVE_PLAYERS.map((player) => player.age));
export const HEIGHT_SPAN = spanOf(
  NBA_ACTIVE_PLAYERS.map((player) => player.heightInches),
);
export const EXPERIENCE_SPAN = spanOf(
  NBA_ACTIVE_PLAYERS.map((player) => player.experienceYears),
);

export const EMPTY_PLAYER_FILTERS: PlayerSearchFilters = {
  team: ALL_PLAYER_FILTER,
  division: ALL_PLAYER_FILTER,
  conference: ALL_PLAYER_FILTER,
  position: ALL_PLAYER_FILTER,
  draftClass: ALL_PLAYER_FILTER,
  draftStatus: ALL_PLAYER_FILTER,
  allStar: ALL_PLAYER_FILTER,
  country: ALL_PLAYER_FILTER,
  ageRange: { min: AGE_SPAN.min, max: AGE_SPAN.max },
  heightRange: { min: HEIGHT_SPAN.min, max: HEIGHT_SPAN.max },
  experienceRange: { min: EXPERIENCE_SPAN.min, max: EXPERIENCE_SPAN.max },
};

export const isFullRange = (range: NumberRange | undefined, span: NumberRange) =>
  !range || (range.min <= span.min && range.max >= span.max);

export const clampRange = (
  range: NumberRange | undefined,
  span: NumberRange,
): NumberRange => {
  const min = Math.min(span.max, Math.max(span.min, range?.min ?? span.min));
  const max = Math.min(span.max, Math.max(span.min, range?.max ?? span.max));
  return min <= max ? { min, max } : { min: span.min, max: span.max };
};

export const formatHeightInches = (inches: number) => {
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  return `${feet}'${rest}"`;
};

const SELECT_KEYS = [
  "team",
  "division",
  "conference",
  "position",
  "draftClass",
  "draftStatus",
  "allStar",
  "country",
] as const;

export const isEmptyPlayerFilters = (filters: PlayerSearchFilters) =>
  SELECT_KEYS.every(
    (key) => (filters[key] ?? ALL_PLAYER_FILTER) === ALL_PLAYER_FILTER,
  ) &&
  isFullRange(filters.ageRange, AGE_SPAN) &&
  isFullRange(filters.heightRange, HEIGHT_SPAN) &&
  isFullRange(filters.experienceRange, EXPERIENCE_SPAN);

const isNumberRange = (value: unknown): value is NumberRange =>
  Boolean(
    value &&
      typeof value === "object" &&
      Number.isFinite((value as NumberRange).min) &&
      Number.isFinite((value as NumberRange).max),
  );

export const parsePlayerSearchFilters = (
  value: unknown,
): PlayerSearchFilters => {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_PLAYER_FILTERS };
  }
  const raw = value as PlayerSearchFilters;
  const next: PlayerSearchFilters = { ...EMPTY_PLAYER_FILTERS };
  for (const key of SELECT_KEYS) {
    const item = raw[key];
    if (typeof item === "string" && item) {
      next[key] = item;
    }
  }
  if (isNumberRange(raw.ageRange)) {
    next.ageRange = clampRange(raw.ageRange, AGE_SPAN);
  }
  if (isNumberRange(raw.heightRange)) {
    next.heightRange = clampRange(raw.heightRange, HEIGHT_SPAN);
  }
  if (isNumberRange(raw.experienceRange)) {
    next.experienceRange = clampRange(raw.experienceRange, EXPERIENCE_SPAN);
  }
  return next;
};

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
  const age = clampRange(filters.ageRange, AGE_SPAN);
  const height = clampRange(filters.heightRange, HEIGHT_SPAN);
  const experience = clampRange(filters.experienceRange, EXPERIENCE_SPAN);
  const ageOpen = isFullRange(age, AGE_SPAN);
  const heightOpen = isFullRange(height, HEIGHT_SPAN);
  const experienceOpen = isFullRange(experience, EXPERIENCE_SPAN);

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
    if (!ageOpen && !inRange(player.age, age.min, age.max)) {
      return false;
    }
    if (!heightOpen && !inRange(player.heightInches, height.min, height.max)) {
      return false;
    }
    if (
      !experienceOpen &&
      !inRange(player.experienceYears, experience.min, experience.max)
    ) {
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

export const sortPlayers = (
  players: TierPlayer[],
  sort: PlayerPickerSort,
): TierPlayer[] => {
  const next = players.slice();
  if (sort === "points") {
    next.sort(
      (left, right) =>
        right.ppg - left.ppg || left.name.localeCompare(right.name),
    );
    return next;
  }
  next.sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
  return next;
};

export const formatPpg = (ppg: number) =>
  ppg > 0 ? `${ppg.toFixed(1)} PPG` : "No 25–26 PPG";

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
