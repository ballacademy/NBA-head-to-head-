import draftClassesData from "../../data/draft-classes.json";
import upcomingRookiesData from "../../data/upcoming-rookies.json";
import type { Player, Position } from "./types";

export type DraftClassYear = number;

const curatedYears = Object.keys(draftClassesData.classes)
  .map(Number)
  .filter((year) => Number.isFinite(year))
  .sort((left, right) => right - left);

/** Next draft class still listed as prospects (Tier List “Upcoming”). */
export const UPCOMING_ROOKIE_DRAFT_YEAR = 2027;
/** Most recent NBA draft class (Tier List rookies / UDFAs; not draftable yet). */
export const CURRENT_ROOKIE_DRAFT_YEAR = 2026;

/** Newest → oldest, including upcoming 2026 prospects. */
export const DRAFT_CLASS_YEARS: DraftClassYear[] = [
  UPCOMING_ROOKIE_DRAFT_YEAR,
  ...curatedYears.filter((year) => year !== UPCOMING_ROOKIE_DRAFT_YEAR),
];

const draftClassIdsByYear = new Map<number, Set<string>>(
  Object.entries(draftClassesData.classes).map(([year, ids]) => [
    Number(year),
    new Set(ids as string[]),
  ]),
);

const emptyStats = {
  jerseyNumber: 0,
  points: 0,
  rebounds: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
  trueShooting: 0,
  threePoint: 0,
  threePointersAttempted: 0,
  fieldGoalsAttempted: 0,
  freeThrowsAttempted: 0,
  freeThrowPct: 0,
  personalFouls: 0,
  minutes: 0,
  heightInches: 78,
  usage: 0.18,
  defense: 0,
  gamesPlayed: 0,
  styles: [] as Player["styles"],
};

/** Prospects for a future draft (Tier List “Upcoming” only). */
export const upcomingRookiePlayers: Player[] = (
  upcomingRookiesData.players as Array<{
    id: string;
    bbrPlayerId: string;
    name: string;
    team: string;
    position: Position;
    positions: Position[];
    age?: number;
    draftYear: number;
    isUpcomingRookie?: boolean;
  }>
)
  .filter((raw) => raw.draftYear >= UPCOMING_ROOKIE_DRAFT_YEAR)
  .map((raw) => ({
    ...emptyStats,
    id: raw.id,
    bbrPlayerId: raw.bbrPlayerId,
    name: raw.name,
    team: raw.team,
    position: raw.position,
    positions: raw.positions.length > 0 ? raw.positions : [raw.position],
    age: raw.age,
    draftYear: raw.draftYear,
    isUpcomingRookie: true,
  }));

const upcomingById = new Map(
  upcomingRookiePlayers.map((player) => [player.id, player]),
);

export const getPlayerDraftYear = (
  player: Pick<Player, "id" | "bbrPlayerId" | "draftYear" | "isUpcomingRookie">,
): number | null => {
  if (typeof player.draftYear === "number") {
    return player.draftYear;
  }

  if (player.isUpcomingRookie) {
    return UPCOMING_ROOKIE_DRAFT_YEAR;
  }

  const bbrId = player.bbrPlayerId;
  if (!bbrId) {
    return null;
  }

  for (const [year, ids] of draftClassIdsByYear) {
    if (ids.has(bbrId)) {
      return year;
    }
  }

  return null;
};

export const isUpcomingRookiePlayer = (
  player: Pick<Player, "id" | "isUpcomingRookie" | "draftYear">,
) =>
  player.isUpcomingRookie === true ||
  player.draftYear === UPCOMING_ROOKIE_DRAFT_YEAR ||
  upcomingById.has(player.id);

export const isCurrentRookiePlayer = (
  player: Pick<Player, "id" | "bbrPlayerId" | "draftYear" | "isUpcomingRookie">,
) =>
  !isUpcomingRookiePlayer(player) &&
  getPlayerDraftYear(player) === CURRENT_ROOKIE_DRAFT_YEAR;

export const isVeteranPlayer = (
  player: Pick<Player, "id" | "bbrPlayerId" | "draftYear" | "isUpcomingRookie">,
) => {
  if (isUpcomingRookiePlayer(player) || isCurrentRookiePlayer(player)) {
    return false;
  }

  return true;
};

export const playerMatchesDraftClass = (
  player: Pick<Player, "id" | "bbrPlayerId" | "draftYear" | "isUpcomingRookie">,
  draftClass: DraftClassYear | "all",
) => {
  if (draftClass === "all") {
    return true;
  }

  return getPlayerDraftYear(player) === draftClass;
};
