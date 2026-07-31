import { readJson, writeJson } from "./browserStorage";
import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "./allStars";
import {
  DRAFT_CLASS_YEARS,
  type DraftClassYear,
  isCurrentRookiePlayer,
  isUpcomingRookiePlayer,
  isVeteranPlayer,
  playerMatchesDraftClass,
  upcomingRookiePlayers,
} from "./draftClasses";
import { databasePlayers } from "./playerPool";
import { isScrubPlayer, isSuperScrubPlayer } from "./playerTiers";
import { isBenchMajorityPlayer } from "./teamRecordBaseline";
import type { Player, Position } from "./types";
import {
  isInternationalEventPlayer,
  isUnder25EventPlayer,
} from "./weeklyEvents";

export const TIER_LIST_STORAGE_KEY = "nba-head-to-head-tier-list";

export type TierListAgeFilter = "all" | "u25" | "26-30" | "31plus";
export type TierListRoleFilter = "all" | "starter" | "bench";
export type TierListExperienceFilter =
  | "all"
  | "rookies"
  | "veterans"
  | "upcoming";
export type TierListClassFilter =
  | "all"
  | "superstar"
  | "all-star"
  | "recent-all-star"
  | "scrub"
  | "super-scrub";
export type TierListPoolSort = "points" | "name" | "age" | "minutes";
export type TierListDraftClassFilter = "all" | DraftClassYear;

export interface TierListFilters {
  query: string;
  positions: Position[];
  age: TierListAgeFilter;
  role: TierListRoleFilter;
  internationalOnly: boolean;
  experience: TierListExperienceFilter;
  draftClass: TierListDraftClassFilter;
  playerClass: TierListClassFilter;
  sort: TierListPoolSort;
}

export interface TierListRow {
  id: string;
  name: string;
  playerIds: string[];
}

export interface TierListState {
  title: string;
  tiers: TierListRow[];
}

export const DEFAULT_TIER_LIST_FILTERS: TierListFilters = {
  query: "",
  positions: [],
  age: "all",
  role: "all",
  internationalOnly: false,
  experience: "all",
  draftClass: "all",
  playerClass: "all",
  sort: "points",
};

/** Full season pool plus upcoming rookies (Tier List only). */
export const getTierListPlayers = (): Player[] => [
  ...databasePlayers,
  ...upcomingRookiePlayers,
];

export { DRAFT_CLASS_YEARS };

const DEFAULT_TIER_NAMES = ["S", "A", "B", "C", "D", "F"] as const;

export const createDefaultTier = (): TierListRow[] =>
  DEFAULT_TIER_NAMES.map((name, index) => ({
    id: `tier-${name.toLowerCase()}-${index}`,
    name,
    playerIds: [],
  }));

export const createDefaultTierListState = (): TierListState => ({
  title: "My Tier List",
  tiers: createDefaultTier(),
});

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const normalizeTierListState = (
  saved: Partial<TierListState> | null | undefined,
): TierListState => {
  const fallback = createDefaultTierListState();

  if (!saved || !Array.isArray(saved.tiers) || saved.tiers.length === 0) {
    return fallback;
  }

  const tiers = saved.tiers
    .map((tier, index): TierListRow | null => {
      if (!tier || typeof tier !== "object") {
        return null;
      }

      const id = isNonEmptyString(tier.id) ? tier.id : `tier-${index}`;
      const name = isNonEmptyString(tier.name) ? tier.name.trim() : `Tier ${index + 1}`;
      const playerIds = Array.isArray(tier.playerIds)
        ? tier.playerIds.filter(isNonEmptyString)
        : [];

      return { id, name, playerIds };
    })
    .filter((tier): tier is TierListRow => tier != null);

  if (tiers.length === 0) {
    return fallback;
  }

  return {
    title: isNonEmptyString(saved.title) ? saved.title.trim() : fallback.title,
    tiers,
  };
};

export const loadTierListState = (): TierListState =>
  normalizeTierListState(readJson<Partial<TierListState>>(TIER_LIST_STORAGE_KEY));

export const saveTierListState = (state: TierListState) => {
  writeJson(TIER_LIST_STORAGE_KEY, normalizeTierListState(state));
};

export const getAssignedPlayerIds = (state: TierListState) =>
  new Set(state.tiers.flatMap((tier) => tier.playerIds));

export const renameTier = (
  state: TierListState,
  tierId: string,
  name: string,
): TierListState => ({
  ...state,
  tiers: state.tiers.map((tier) =>
    tier.id === tierId ? { ...tier, name: name.slice(0, 24) } : tier,
  ),
});

export const setTierListTitle = (
  state: TierListState,
  title: string,
): TierListState => ({
  ...state,
  title: title.slice(0, 48),
});

export const addTier = (state: TierListState): TierListState => {
  const index = state.tiers.length + 1;
  return {
    ...state,
    tiers: [
      ...state.tiers,
      {
        id: `tier-custom-${Date.now()}-${index}`,
        name: `Tier ${index}`,
        playerIds: [],
      },
    ],
  };
};

export const removeTier = (
  state: TierListState,
  tierId: string,
): TierListState => {
  if (state.tiers.length <= 1) {
    return state;
  }

  return {
    ...state,
    tiers: state.tiers.filter((tier) => tier.id !== tierId),
  };
};

/** Move a player into a tier, or back to the unranked pool when tierId is null. */
export const movePlayerToTier = (
  state: TierListState,
  playerId: string,
  tierId: string | null,
  insertBeforePlayerId?: string | null,
): TierListState => {
  const withoutPlayer: TierListState = {
    ...state,
    tiers: state.tiers.map((tier) => ({
      ...tier,
      playerIds: tier.playerIds.filter((id) => id !== playerId),
    })),
  };

  if (!tierId) {
    return withoutPlayer;
  }

  return {
    ...withoutPlayer,
    tiers: withoutPlayer.tiers.map((tier) => {
      if (tier.id !== tierId) {
        return tier;
      }

      const nextIds = [...tier.playerIds];
      const insertAt =
        insertBeforePlayerId != null
          ? nextIds.indexOf(insertBeforePlayerId)
          : -1;

      if (insertAt >= 0) {
        nextIds.splice(insertAt, 0, playerId);
      } else {
        nextIds.push(playerId);
      }

      return { ...tier, playerIds: nextIds };
    }),
  };
};

export const clearTierListPlacements = (state: TierListState): TierListState => ({
  ...state,
  tiers: state.tiers.map((tier) => ({ ...tier, playerIds: [] })),
});

export const resetTierListState = (): TierListState => createDefaultTierListState();

export const matchesAgeFilter = (
  player: Player,
  age: TierListAgeFilter,
): boolean => {
  if (age === "all") {
    return true;
  }

  if (typeof player.age !== "number") {
    return false;
  }

  if (age === "u25") {
    return isUnder25EventPlayer(player);
  }

  if (age === "26-30") {
    return player.age >= 26 && player.age <= 30;
  }

  return player.age >= 31;
};

export const matchesRoleFilter = (
  player: Player,
  role: TierListRoleFilter,
): boolean => {
  if (role === "all") {
    return true;
  }

  const bench = isBenchMajorityPlayer(player);
  return role === "bench" ? bench : !bench;
};

export const matchesClassFilter = (
  player: Player,
  playerClass: TierListClassFilter,
): boolean => {
  switch (playerClass) {
    case "superstar":
      return isSuperstarPlayer(player);
    case "all-star":
      return isAllStarPlayer(player);
    case "recent-all-star":
      return isRecentAllStarPlayer(player);
    case "scrub":
      return isScrubPlayer(player);
    case "super-scrub":
      return isSuperScrubPlayer(player);
    default:
      return true;
  }
};

export const matchesExperienceFilter = (
  player: Player,
  experience: TierListExperienceFilter,
): boolean => {
  switch (experience) {
    case "rookies":
      return isCurrentRookiePlayer(player);
    case "veterans":
      return isVeteranPlayer(player);
    case "upcoming":
      return isUpcomingRookiePlayer(player);
    default:
      return true;
  }
};

export const playerMatchesTierListFilters = (
  player: Player,
  filters: TierListFilters,
): boolean => {
  const query = filters.query.trim().toLowerCase();

  if (query) {
    const haystack = `${player.name} ${player.team} ${player.position}`.toLowerCase();
    if (!haystack.includes(query)) {
      return false;
    }
  }

  if (
    filters.positions.length > 0 &&
    !filters.positions.some(
      (position) =>
        player.position === position || player.positions.includes(position),
    )
  ) {
    return false;
  }

  if (!matchesAgeFilter(player, filters.age)) {
    return false;
  }

  // Upcoming rookies have no NBA minutes sample — skip starter/bench gating
  // when browsing them explicitly; otherwise exclude from role-filtered views.
  if (filters.role !== "all") {
    if (isUpcomingRookiePlayer(player)) {
      if (
        filters.experience !== "upcoming" &&
        filters.draftClass !== 2026
      ) {
        return false;
      }
    } else if (!matchesRoleFilter(player, filters.role)) {
      return false;
    }
  }

  if (filters.internationalOnly && !isInternationalEventPlayer(player)) {
    return false;
  }

  if (!matchesExperienceFilter(player, filters.experience)) {
    return false;
  }

  if (!playerMatchesDraftClass(player, filters.draftClass)) {
    return false;
  }

  if (!matchesClassFilter(player, filters.playerClass)) {
    return false;
  }

  return true;
};

export const comparePlayersForTierPool = (
  left: Player,
  right: Player,
  sort: TierListPoolSort,
) => {
  switch (sort) {
    case "name":
      return left.name.localeCompare(right.name);
    case "age":
      return (left.age ?? 99) - (right.age ?? 99) || left.name.localeCompare(right.name);
    case "minutes":
      return right.minutes - left.minutes || left.name.localeCompare(right.name);
    default:
      return right.points - left.points || left.name.localeCompare(right.name);
  }
};

export const filterTierListPool = (
  players: Player[],
  filters: TierListFilters,
  assignedIds: Set<string>,
) =>
  players
    .filter(
      (player) =>
        !assignedIds.has(player.id) &&
        playerMatchesTierListFilters(player, filters),
    )
    .sort((left, right) => comparePlayersForTierPool(left, right, filters.sort));

export const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
