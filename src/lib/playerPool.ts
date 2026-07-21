import type { PlayStyle, Player, Position } from "./types";
import {
  buildPlayerPositions,
  formatPlayerPositions,
} from "./positions";
import { getPlayerSalary } from "./playerSalaries";
import { applyCurrentTeamOverride } from "./currentTeamOverrides";
import { applyOptionTeamOverride } from "./optionTeamOverrides";
import { applyPositionOverride } from "./positionOverrides";
import { lookupJerseyNumber } from "./jerseyNumbers";
import {
  buildDefensiveRatings,
  toDefensiveStatInput,
} from "./defenseRating";
import { isFreeAgentTeam, isDraftEligiblePlayer, isStatsFreeAgent } from "./freeAgents";
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
  statsTeam?: string;
  lastTeam?: string;
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
  threePointersMade?: number;
  threePointersAttempted?: number;
  freeThrowsAttempted?: number;
  freeThrowsMade?: number;
  freeThrowPct?: number;
  personalFouls?: number;
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

export const ACTIVE_ROSTER_AS_OF = "2026-07-06";
export const ACTIVE_ROSTER_AS_OF_LABEL = "July 6, 2026";

export { formatPlayerPositions, normalizePosition } from "./positions";

export const formatCompactPlayerName = (name: string) => {
  const parts = name.trim().split(/\s+/);

  if (parts.length < 2) {
    return name;
  }

  const firstInitial = parts[0]![0]?.toUpperCase() ?? "";
  const lastName = parts.slice(1).join(" ");

  return `${firstInitial}. ${lastName}`;
};

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

const POSITION_HEIGHT_INCHES: Record<Position, number> = {
  PG: 74.5,
  SG: 76.5,
  SF: 79.5,
  PF: 81.5,
  C: 84,
};

const estimateHeightInches = (raw: RawSeasonPlayer, position: Position) => {
  const base = POSITION_HEIGHT_INCHES[position];
  const variance = (raw.id.length + (raw.bbrPlayerId?.length ?? 0)) % 3;

  return base + variance - 1;
};

export const toPlayer = (raw: RawSeasonPlayer): Player => {
  const positions = applyPositionOverride(
    raw.bbrPlayerId,
    buildPlayerPositions(raw),
  );
  const position = positions[0];
  const ratingKey = raw.bbrPlayerId ?? raw.id;
  const rating = defensiveRatings.get(ratingKey);
  const statsTeam = raw.statsTeam ?? raw.team;
  const team = applyOptionTeamOverride(
    raw.bbrPlayerId,
    applyCurrentTeamOverride(raw.bbrPlayerId, raw.team),
  );
  const playerId = raw.bbrPlayerId
    ? `${raw.bbrPlayerId}-${team.toLowerCase()}`
    : raw.id;

  return {
    id: playerId,
    bbrPlayerId: raw.bbrPlayerId,
    name: raw.name,
    team,
    statsTeam,
    lastTeam: raw.lastTeam,
    position,
    positions,
    jerseyNumber: lookupJerseyNumber(raw.bbrPlayerId, playerId, team),
    points: raw.points,
    rebounds: raw.rebounds,
    assists: raw.assists,
    steals: raw.steals,
    blocks: raw.blocks,
    turnovers: raw.turnovers ?? 0,
    trueShooting: raw.trueShooting ?? 0.54,
    threePoint: raw.threePointPct ?? 0,
    threePointersAttempted: raw.threePointersAttempted ?? 0,
    fieldGoalsAttempted: raw.fieldGoalsAttempted ?? 0,
    freeThrowsAttempted: raw.freeThrowsAttempted ?? 0,
    freeThrowPct: raw.freeThrowPct ?? 0,
    personalFouls: raw.personalFouls ?? 0,
    minutes: raw.minutes,
    heightInches: estimateHeightInches(raw, position),
    usage: estimateUsage(raw),
    defense: rating?.defense ?? estimateDefense(raw),
    defenseGrade: rating?.grade,
    gamesPlayed: raw.gamesPlayed,
    age: raw.age,
    styles: deriveStyles(raw, position),
    salary: getPlayerSalary(raw.bbrPlayerId, raw.id),
  };
};

const mapStatsToPlayers = (rawPlayers: RawSeasonPlayer[]) =>
  rawPlayers
    .filter((player) => player.gamesPlayed > 0)
    .map(toPlayer)
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.name.localeCompare(b.name) ||
        a.team.localeCompare(b.team),
    );

export const databasePlayers: Player[] = mapStatsToPlayers(statsFile.players);

export const players: Player[] = databasePlayers.filter(isDraftEligiblePlayer);

export const freeAgentPlayers: Player[] = databasePlayers.filter(isStatsFreeAgent);

export const playersById = new Map(players.map((player) => [player.id, player]));

export const databasePlayersById = new Map(
  databasePlayers.map((player) => [player.id, player]),
);

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
