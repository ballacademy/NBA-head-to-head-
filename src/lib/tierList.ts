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
import {
  CONFERENCES,
  DIVISIONS,
  getConferenceForTeam,
  getDivisionForTeam,
  type Conference,
} from "./divisions";
import { isStatsFreeAgent } from "./freeAgents";
import { databasePlayers } from "./playerPool";
import { isScrubPlayer, isSuperScrubPlayer } from "./playerTiers";
import { isBenchMajorityPlayer } from "./teamRecordBaseline";
import type { Division, Player, Position } from "./types";
import { isInternationalEventPlayer } from "./weeklyEvents";

export const TIER_LIST_STORAGE_KEY = "nba-head-to-head-tier-list";
export const TIER_LIST_LIBRARY_KEY = "nba-head-to-head-tier-list-library";

export type TierListRoleFilter = "all" | "starter" | "bench";
export type TierListExperienceFilter =
  | "all"
  | "rookies"
  | "veterans"
  | "upcoming";
export type TierListAgencyFilter = "all" | "free-agent" | "rostered";
export type TierListClassFilter =
  | "all"
  | "superstar"
  | "all-star"
  | "recent-all-star"
  | "scrub"
  | "super-scrub";
export type TierListPoolSort = "points" | "name" | "age" | "minutes";
export type TierListDraftClassFilter = "all" | DraftClassYear;
export type TierListTeamFilter = "all" | string;
export type TierListDivisionFilter = "all" | Division;
export type TierListConferenceFilter = "all" | Conference;

export interface TierListFilters {
  query: string;
  positions: Position[];
  /** Inclusive lower age bound; null means no minimum. */
  ageMin: number | null;
  /** Inclusive upper age bound; null means no maximum. */
  ageMax: number | null;
  team: TierListTeamFilter;
  division: TierListDivisionFilter;
  conference: TierListConferenceFilter;
  agency: TierListAgencyFilter;
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
  id: string;
  title: string;
  tiers: TierListRow[];
}

export interface TierListSavedDocument {
  id: string;
  title: string;
  tiers: TierListRow[];
  savedAt: number;
}

export interface TierListLibrary {
  documents: TierListSavedDocument[];
}

export const DEFAULT_TIER_LIST_FILTERS: TierListFilters = {
  query: "",
  positions: [],
  ageMin: null,
  ageMax: null,
  team: "all",
  division: "all",
  conference: "all",
  agency: "all",
  role: "all",
  internationalOnly: false,
  experience: "all",
  draftClass: "all",
  playerClass: "all",
  sort: "points",
};

export { DIVISIONS, CONFERENCES };

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

const createTierListId = () =>
  `tier-list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createDefaultTierListState = (): TierListState => ({
  id: createTierListId(),
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
    id: isNonEmptyString(saved.id) ? saved.id : fallback.id,
    title: isNonEmptyString(saved.title) ? saved.title.trim() : fallback.title,
    tiers,
  };
};

export const loadTierListState = (): TierListState =>
  normalizeTierListState(readJson<Partial<TierListState>>(TIER_LIST_STORAGE_KEY));

export const saveTierListState = (state: TierListState) => {
  writeJson(TIER_LIST_STORAGE_KEY, normalizeTierListState(state));
};

export const normalizeTierListLibrary = (
  saved: Partial<TierListLibrary> | null | undefined,
): TierListLibrary => {
  if (!saved || !Array.isArray(saved.documents)) {
    return { documents: [] };
  }

  const documents = saved.documents
    .map((doc): TierListSavedDocument | null => {
      if (!doc || typeof doc !== "object") {
        return null;
      }

      const normalized = normalizeTierListState(doc);
      const savedAt =
        typeof doc.savedAt === "number" && Number.isFinite(doc.savedAt)
          ? doc.savedAt
          : Date.now();

      return {
        id: normalized.id,
        title: normalized.title,
        tiers: normalized.tiers,
        savedAt,
      };
    })
    .filter((doc): doc is TierListSavedDocument => doc != null)
    .sort((left, right) => right.savedAt - left.savedAt);

  return { documents };
};

export const loadTierListLibrary = (): TierListLibrary =>
  normalizeTierListLibrary(
    readJson<Partial<TierListLibrary>>(TIER_LIST_LIBRARY_KEY),
  );

export const saveTierListLibrary = (library: TierListLibrary) => {
  writeJson(TIER_LIST_LIBRARY_KEY, normalizeTierListLibrary(library));
};

/** Upsert the working board into the saved-library list. */
export const saveTierListToLibrary = (
  state: TierListState,
  library: TierListLibrary = loadTierListLibrary(),
): { state: TierListState; library: TierListLibrary } => {
  const normalized = normalizeTierListState(state);
  const savedAt = Date.now();
  const document: TierListSavedDocument = {
    id: normalized.id,
    title: normalized.title,
    tiers: normalized.tiers,
    savedAt,
  };

  const without = library.documents.filter((entry) => entry.id !== document.id);
  const nextLibrary = normalizeTierListLibrary({
    documents: [document, ...without],
  });
  saveTierListLibrary(nextLibrary);
  saveTierListState(normalized);

  return { state: normalized, library: nextLibrary };
};

export const openTierListFromLibrary = (
  documentId: string,
  library: TierListLibrary = loadTierListLibrary(),
): TierListState | null => {
  const document = library.documents.find((entry) => entry.id === documentId);
  if (!document) {
    return null;
  }

  const next = normalizeTierListState(document);
  saveTierListState(next);
  return next;
};

export const deleteTierListFromLibrary = (
  documentId: string,
  library: TierListLibrary = loadTierListLibrary(),
): TierListLibrary => {
  const nextLibrary = normalizeTierListLibrary({
    documents: library.documents.filter((entry) => entry.id !== documentId),
  });
  saveTierListLibrary(nextLibrary);
  return nextLibrary;
};

export const downloadTierListState = (state: TierListState) => {
  const normalized = normalizeTierListState(state);
  const payload = {
    id: normalized.id,
    title: normalized.title,
    tiers: normalized.tiers,
    exportedAt: Date.now(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeTitle =
    normalized.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tier-list";
  anchor.href = url;
  anchor.download = `${safeTitle}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
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

export const matchesAgeRangeFilter = (
  player: Player,
  ageMin: number | null,
  ageMax: number | null,
): boolean => {
  if (ageMin == null && ageMax == null) {
    return true;
  }

  if (typeof player.age !== "number") {
    return false;
  }

  if (ageMin != null && player.age < ageMin) {
    return false;
  }

  if (ageMax != null && player.age > ageMax) {
    return false;
  }

  return true;
};

export const matchesAgencyFilter = (
  player: Player,
  agency: TierListAgencyFilter,
): boolean => {
  if (agency === "all") {
    return true;
  }

  const freeAgent = isStatsFreeAgent(player);
  return agency === "free-agent" ? freeAgent : !freeAgent;
};

export const matchesTeamFilter = (
  player: Player,
  team: TierListTeamFilter,
): boolean => {
  if (team === "all") {
    return true;
  }

  return player.team === team;
};

export const matchesDivisionFilter = (
  player: Player,
  division: TierListDivisionFilter,
): boolean => {
  if (division === "all") {
    return true;
  }

  return getDivisionForTeam(player.team) === division;
};

export const matchesConferenceFilter = (
  player: Player,
  conference: TierListConferenceFilter,
): boolean => {
  if (conference === "all") {
    return true;
  }

  return getConferenceForTeam(player.team) === conference;
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

  if (!matchesAgeRangeFilter(player, filters.ageMin, filters.ageMax)) {
    return false;
  }

  if (!matchesTeamFilter(player, filters.team)) {
    return false;
  }

  if (!matchesDivisionFilter(player, filters.division)) {
    return false;
  }

  if (!matchesConferenceFilter(player, filters.conference)) {
    return false;
  }

  if (!matchesAgencyFilter(player, filters.agency)) {
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
