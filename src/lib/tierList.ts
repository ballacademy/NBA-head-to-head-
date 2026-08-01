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
/** Discrete height bands for the editor pool (inches). */
export type TierListHeightBand =
  | "all"
  | "under-66"
  | "66-68"
  | "69-611"
  | "7-plus";

export interface TierListFilters {
  query: string;
  positions: Position[];
  /** Inclusive lower age bound; null means no minimum. */
  ageMin: number | null;
  /** Inclusive upper age bound; null means no maximum. */
  ageMax: number | null;
  heightBand: TierListHeightBand;
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
  /** Remote/local public catalog id when this board has been published. */
  publishedId?: string | null;
}

export interface TierListSavedDocument {
  id: string;
  title: string;
  tiers: TierListRow[];
  savedAt: number;
  publishedId?: string | null;
}

export interface TierListLibrary {
  documents: TierListSavedDocument[];
}

export const DEFAULT_TIER_LIST_FILTERS: TierListFilters = {
  query: "",
  positions: [],
  ageMin: null,
  ageMax: null,
  heightBand: "all",
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

/** Soft cap so tier labels stay readable in the narrow board column. */
export const TIER_NAME_MAX_LENGTH = 12;
/** Max rows on a board (matches publish API). */
export const TIER_LIST_MAX_TIERS = 12;

export const TIER_LIST_HEIGHT_BANDS: Array<{
  id: TierListHeightBand;
  label: string;
}> = [
  { id: "all", label: "Any height" },
  { id: "under-66", label: "Under 6'6\"" },
  { id: "66-68", label: "6'6\"–6'8\"" },
  { id: "69-611", label: "6'9\"–6'11\"" },
  { id: "7-plus", label: "7'0\"+" },
];

export const createDefaultTier = (): TierListRow[] =>
  DEFAULT_TIER_NAMES.map((name, index) => ({
    id: `tier-${name.toLowerCase()}-${index}`,
    name,
    playerIds: [],
  }));

const createTierListId = () =>
  `tier-list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Shown as the empty-state / placeholder title for a new board. */
export const DEFAULT_TIER_LIST_TITLE = "Name your tier list";

const LEGACY_DEFAULT_TITLES = new Set([
  "my tier list",
  "name your tier list",
]);

export const createDefaultTierListState = (): TierListState => ({
  id: createTierListId(),
  title: "",
  tiers: createDefaultTier(),
});

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeTierListTitle = (title: unknown): string => {
  if (!isNonEmptyString(title)) {
    return "";
  }

  const trimmed = title.trim();
  if (LEGACY_DEFAULT_TITLES.has(trimmed.toLowerCase())) {
    return "";
  }

  return trimmed;
};

export const displayTierListTitle = (title: string) =>
  title.trim() || DEFAULT_TIER_LIST_TITLE;

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
      const rawName = isNonEmptyString(tier.name)
        ? tier.name.trim()
        : `Tier ${index + 1}`;
      const name = rawName.slice(0, TIER_NAME_MAX_LENGTH);
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
    title: normalizeTierListTitle(saved.title),
    tiers,
    publishedId:
      typeof saved.publishedId === "string" && saved.publishedId.trim()
        ? saved.publishedId.trim().slice(0, 64)
        : null,
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
        publishedId: normalized.publishedId ?? null,
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
    title: displayTierListTitle(normalized.title),
    tiers: normalized.tiers,
    savedAt,
    publishedId: normalized.publishedId ?? null,
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

export const getAssignedPlayerIds = (state: TierListState) =>
  new Set(state.tiers.flatMap((tier) => tier.playerIds));

export const renameTier = (
  state: TierListState,
  tierId: string,
  name: string,
): TierListState => ({
  ...state,
  tiers: state.tiers.map((tier) =>
    tier.id === tierId
      ? { ...tier, name: name.slice(0, TIER_NAME_MAX_LENGTH) }
      : tier,
  ),
});

export const setTierListPublishedId = (
  state: TierListState,
  publishedId: string | null,
): TierListState => ({
  ...state,
  publishedId,
});

export const setTierListTitle = (
  state: TierListState,
  title: string,
): TierListState => ({
  ...state,
  title: title.slice(0, 48),
});

export const addTier = (state: TierListState): TierListState => {
  if (state.tiers.length >= TIER_LIST_MAX_TIERS) {
    return state;
  }

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

export const matchesHeightBandFilter = (
  player: Player,
  heightBand: TierListHeightBand,
): boolean => {
  if (heightBand === "all") {
    return true;
  }

  const height = player.heightInches;
  if (typeof height !== "number" || !Number.isFinite(height)) {
    return false;
  }

  switch (heightBand) {
    case "under-66":
      return height < 78;
    case "66-68":
      return height >= 78 && height <= 80;
    case "69-611":
      return height >= 81 && height <= 83;
    case "7-plus":
      return height >= 84;
    default:
      return true;
  }
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

  if (!matchesHeightBandFilter(player, filters.heightBand)) {
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

/** Sort My lists using remote like counts for published boards. */
export const sortTierListLibraryDocuments = (
  documents: TierListSavedDocument[],
  sort: "recent" | "likes",
  likeCountByPublishedId: Record<string, number> = {},
) =>
  [...documents].sort((left, right) => {
    if (sort === "likes") {
      const leftLikes = left.publishedId
        ? (likeCountByPublishedId[left.publishedId] ?? 0)
        : 0;
      const rightLikes = right.publishedId
        ? (likeCountByPublishedId[right.publishedId] ?? 0)
        : 0;
      if (rightLikes !== leftLikes) {
        return rightLikes - leftLikes;
      }
    }

    return right.savedAt - left.savedAt;
  });

export const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
