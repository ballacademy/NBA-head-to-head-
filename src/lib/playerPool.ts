import type { PlayStyle, Player, Position } from "./types";
import {
  buildPlayerPositions,
  formatPlayerPositions,
  normalizePosition,
} from "./positions";
import {
  buildDefensiveRatings,
  toDefensiveStatInput,
} from "./defenseRating";
import seasonStats from "../../data/nba-stats/nba-player-stats-202526-regular-season.json";

export interface SeasonStatsFile {
  season: string;
  seasonType: string;
  source: string;
  generatedAt: string;
  playerCount: number;
  uniquePlayerCount?: number;
  players: RawSeasonPlayer[];
}

export interface RawSeasonPlayer {
  id: string;
  bbrPlayerId?: string;
  name: string;
  team: string;
  position?: string;
  positions?: string[];
  age?: number;
  gamesPlayed: number;
  gamesStarted?: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  defensiveRebounds?: number;
  defensiveWinShares?: number | null;
  defensiveBoxPlusMinus?: number | null;
  defensiveReboundPct?: number | null;
  stealPct?: number | null;
  blockPct?: number | null;
  turnovers?: number;
  fieldGoalsAttempted?: number;
  freeThrowsAttempted?: number;
  fieldGoalPct?: number;
  threePointPct?: number;
  trueShooting?: number | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const statsFile = seasonStats as SeasonStatsFile;

export { formatPlayerPositions, normalizePosition } from "./positions";

export const estimateUsage = (raw: RawSeasonPlayer) => {
  const possessions =
    (raw.fieldGoalsAttempted ?? 0) +
    0.44 * (raw.freeThrowsAttempted ?? 0) +
    (raw.turnovers ?? 0);

  const minutesBased =
    raw.minutes > 0 ? (possessions / raw.minutes) * 37 : 0;
  const productionBased =
    12 +
    raw.points * 0.45 +
    raw.assists * 0.7 +
    (raw.turnovers ?? 0);

  return clamp(Math.max(minutesBased, productionBased), 10, 40);
};

export const estimateDefense = (raw: RawSeasonPlayer) =>
  clamp(
    4.5 + raw.steals * 1.9 + raw.blocks * 1.6 + (raw.minutes >= 32 ? 0.8 : 0),
    4,
    9.8,
  );

const defensiveRatingInputs = statsFile.players
  .filter((player) => player.gamesPlayed > 0)
  .map((raw) => ({
    id: raw.bbrPlayerId ?? raw.id,
    bbrPlayerId: raw.bbrPlayerId,
    ...toDefensiveStatInput(raw),
  }));

export const defensiveRatings = buildDefensiveRatings(defensiveRatingInputs);

export const deriveStyles = (
  raw: RawSeasonPlayer,
  position: Position,
): PlayStyle[] => {
  const styles: PlayStyle[] = [];

  if (raw.assists >= 7) {
    styles.push("engine");
  }
  if (raw.points >= 24) {
    styles.push("scorer");
  }
  if (raw.assists >= 4 && raw.points < 24) {
    styles.push("connector");
  }
  if ((raw.threePointPct ?? 0) >= 0.38) {
    styles.push("shooter");
  }
  if (raw.steals >= 1.2) {
    styles.push("stopper");
  }
  if (raw.blocks >= 1.5 || (position === "C" && raw.blocks >= 1.1)) {
    styles.push("rim-protector");
  }
  if (
    (position === "C" || position === "PF") &&
    raw.rebounds >= 8 &&
    (raw.threePointPct ?? 0) < 0.34
  ) {
    styles.push("roll-man");
  }

  if (styles.length === 0) {
    styles.push("connector");
  }

  return styles.slice(0, 2);
};

export const toPlayer = (raw: RawSeasonPlayer): Player => {
  const positions = buildPlayerPositions(raw);
  const position = positions[0] ?? normalizePosition(raw.position);
  const ratingKey = raw.bbrPlayerId ?? raw.id;
  const rating = defensiveRatings.get(ratingKey);

  return {
    id: raw.id,
    name: raw.name,
    team: raw.team,
    position,
    positions,
    points: raw.points,
    rebounds: raw.rebounds,
    assists: raw.assists,
    steals: raw.steals,
    blocks: raw.blocks,
    trueShooting: raw.trueShooting ?? 0.54,
    threePoint: raw.threePointPct ?? 0,
    usage: estimateUsage(raw),
    defense: rating?.defense ?? estimateDefense(raw),
    defenseGrade: rating?.grade,
    styles: deriveStyles(raw, position),
  };
};

export const players: Player[] = statsFile.players
  .filter((player) => player.gamesPlayed > 0)
  .map(toPlayer)
  .sort(
    (a, b) =>
      b.points - a.points ||
      a.name.localeCompare(b.name) ||
      a.team.localeCompare(b.team),
  );

export const playersById = new Map(players.map((player) => [player.id, player]));

export const findPlayerId = (name: string) => {
  const normalized = normalizeName(name);
  const exactMatch = players.find(
    (player) => normalizeName(player.name) === normalized,
  );

  if (exactMatch) {
    return exactMatch.id;
  }

  const lastName = normalized.split(" ").at(-1) ?? normalized;
  const partialMatches = players.filter((player) =>
    normalizeName(player.name).includes(lastName),
  );

  if (partialMatches.length === 1) {
    return partialMatches[0].id;
  }

  const sameLastName = partialMatches.filter((player) =>
    normalizeName(player.name).endsWith(lastName),
  );

  return sameLastName[0]?.id ?? partialMatches[0]?.id;
};

export const resolveLineup = (preferredNames: readonly string[]) =>
  preferredNames
    .map((name) => findPlayerId(name))
    .filter((playerId): playerId is string => Boolean(playerId));
