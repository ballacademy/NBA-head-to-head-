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
  /** Inclusive lower height bound in inches; null means no minimum. */
  heightMin: number | null;
  /** Inclusive upper height bound in inches; null means no maximum. */
  heightMax: number | null;
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
  heightMin: null,
  heightMax: null,
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

const TIER_LIST_TITLE_MAX = 48;

const POSITION_LABELS: Record<Position, string> = {
  PG: "PG",
  SG: "SG",
  SF: "SF",
  PF: "PF",
  C: "C",
};

const CLASS_TITLE_LABELS: Record<
  Exclude<TierListClassFilter, "all">,
  string
> = {
  superstar: "Superstars",
  "all-star": "All-Stars",
  "recent-all-star": "Recent All-Stars",
  scrub: "Scrubs",
  "super-scrub": "Super Scrubs",
};

const formatTierListHeightShort = (inches: number) => {
  const feet = Math.floor(inches / 12);
  const remaining = Math.round(inches % 12);
  return `${feet}'${remaining}"`;
};

const formatTierListPositionsTitle = (positions: Position[]): string | null => {
  if (positions.length === 0) {
    return null;
  }

  const unique = [...new Set(positions)];
  if (unique.length >= 5) {
    return null;
  }

  const set = new Set(unique);
  const onlyGuards =
    unique.every((position) => position === "PG" || position === "SG") &&
    set.has("PG") &&
    set.has("SG") &&
    unique.length === 2;
  if (onlyGuards) {
    return "Guards";
  }

  const onlyForwards =
    unique.every((position) => position === "SF" || position === "PF") &&
    set.has("SF") &&
    set.has("PF") &&
    unique.length === 2;
  if (onlyForwards) {
    return "Forwards";
  }

  if (unique.length === 1 && unique[0] === "C") {
    return "Centers";
  }

  return unique.map((position) => POSITION_LABELS[position]).join("/");
};

const formatTierListAgeTitle = (
  ageMin: number | null,
  ageMax: number | null,
): string | null => {
  if (ageMin != null && ageMax != null) {
    return ageMin === ageMax ? `Age ${ageMin}` : `Ages ${ageMin}–${ageMax}`;
  }
  if (ageMax != null) {
    return `${ageMax} & Under`;
  }
  if (ageMin != null) {
    return `${ageMin}+`;
  }
  return null;
};

const formatTierListHeightTitle = (
  heightMin: number | null,
  heightMax: number | null,
): string | null => {
  if (heightMin != null && heightMax != null) {
    return `${formatTierListHeightShort(heightMin)}–${formatTierListHeightShort(heightMax)}`;
  }
  if (heightMin != null) {
    return `${formatTierListHeightShort(heightMin)}+`;
  }
  if (heightMax != null) {
    return `${formatTierListHeightShort(heightMax)} & Under`;
  }
  return null;
};

/**
 * Build a short board title from active pool filters (ignores search/sort).
 * Returns "" when filters are all defaults so the UI can keep the placeholder.
 */
export const recommendTierListTitle = (filters: TierListFilters): string => {
  const parts: string[] = [];

  if (filters.team !== "all") {
    parts.push(filters.team);
  } else if (filters.division !== "all") {
    parts.push(filters.division);
  } else if (filters.conference !== "all") {
    parts.push(filters.conference);
  }

  const positions = formatTierListPositionsTitle(filters.positions);
  if (positions) {
    parts.push(positions);
  }

  if (filters.playerClass !== "all") {
    parts.push(CLASS_TITLE_LABELS[filters.playerClass]);
  }

  if (filters.draftClass !== "all") {
    if (filters.experience === "rookies") {
      parts.push(`${filters.draftClass} Rookies`);
    } else if (filters.experience === "upcoming") {
      parts.push(`${filters.draftClass} Upcoming`);
    } else {
      parts.push(`${filters.draftClass} Class`);
    }
  } else if (filters.experience === "rookies") {
    parts.push("Rookies");
  } else if (filters.experience === "veterans") {
    parts.push("Veterans");
  } else if (filters.experience === "upcoming") {
    parts.push("Upcoming");
  }

  if (filters.agency === "free-agent") {
    parts.push("Free Agents");
  } else if (filters.agency === "rostered") {
    parts.push("Rostered");
  }

  if (filters.role === "starter") {
    parts.push("Starters");
  } else if (filters.role === "bench") {
    parts.push("Bench");
  }

  if (filters.internationalOnly) {
    parts.push("International");
  }

  const age = formatTierListAgeTitle(filters.ageMin, filters.ageMax);
  if (age) {
    parts.push(age);
  }

  const height = formatTierListHeightTitle(filters.heightMin, filters.heightMax);
  if (height) {
    parts.push(height);
  }

  // Prefer a tight phrase: geography/identity first, then up to two more traits.
  const compact =
    parts.length <= 3 ? parts : [parts[0]!, parts[1]!, parts[2]!].filter(Boolean);

  if (compact.length === 0) {
    return "";
  }

  return compact.join(" ").slice(0, TIER_LIST_TITLE_MAX).trim();
};

/** Use the typed title when set; otherwise recommend from filters. */
export const resolveTierListTitle = (
  title: string,
  filters: TierListFilters,
): string => {
  const normalized = normalizeTierListTitle(title);
  if (normalized) {
    return normalized.slice(0, TIER_LIST_TITLE_MAX);
  }

  return recommendTierListTitle(filters);
};

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
  title: title.slice(0, TIER_LIST_TITLE_MAX),
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

export const matchesHeightRangeFilter = (
  player: Player,
  heightMin: number | null,
  heightMax: number | null,
): boolean => {
  if (heightMin == null && heightMax == null) {
    return true;
  }

  const height = player.heightInches;
  if (typeof height !== "number" || !Number.isFinite(height)) {
    return false;
  }

  if (heightMin != null && height < heightMin) {
    return false;
  }

  if (heightMax != null && height > heightMax) {
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

  if (!matchesHeightRangeFilter(player, filters.heightMin, filters.heightMax)) {
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
