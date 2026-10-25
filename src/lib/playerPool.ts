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
import { resolvePlayerHeightInches } from "./playerHeights";
import {
  buildDefensiveRatings,
  toDefensiveStatInput,
} from "./defenseRating";
import { isFreeAgentTeam, isDraftEligiblePlayer, isStatsFreeAgent } from "./freeAgents";
import priorSeasonStats from "../../data/nba-stats/nba-player-stats-202526-regular-season.json";
import currentSeasonStats from "../../data/nba-stats/nba-player-stats-202627-regular-season.json";
import espnRosterAdditions from "../../data/espn-roster-additions.json";

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
  espnId?: string;
  name: string;
  team: string;
  statsTeam?: string;
  lastTeam?: string;
  position?: string;
  positions?: string[];
  age?: number;
  /** Optional contract override for roster additions without salary-file rows. */
  salary?: number;
  draftYear?: number;
  jerseyNumber?: number | null;
  /** Real listed height in inches when available (from BBR roster sync). */
  heightInches?: number | null;
  isRosterAddition?: boolean;
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

/** Prior full season — DEF ratings, usage/styles spine, team-availability anchors. */
export const priorStatsFile = priorSeasonStats as SeasonStatsFile;

/**
 * Display / current-season file. Player-facing box stats prefer this season
 * when a player has games; scoring game-weights it against prior production.
 */
export const statsFile = currentSeasonStats as SeasonStatsFile;

export const ACTIVE_ROSTER_AS_OF = "2026-10-25";
export const ACTIVE_ROSTER_AS_OF_LABEL = "October 25, 2026";

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

const defensiveRatingInputs = priorStatsFile.players
  .filter((player) => player.gamesPlayed > 0)
  .map((raw) => ({
    id: raw.bbrPlayerId ?? raw.id,
    bbrPlayerId: raw.bbrPlayerId,
    ...toDefensiveStatInput(raw),
  }));

export const defensiveRatings = buildDefensiveRatings(defensiveRatingInputs);

/** Prefer the fuller prior-season row when a player has multiple team splits. */
const pickPreferredSeasonRow = (
  current: RawSeasonPlayer | undefined,
  candidate: RawSeasonPlayer,
) => {
  if (!current) {
    return candidate;
  }

  if (candidate.gamesPlayed !== current.gamesPlayed) {
    return candidate.gamesPlayed > current.gamesPlayed ? candidate : current;
  }

  return candidate.minutes > current.minutes ? candidate : current;
};

const indexSeasonPlayersByBbr = (rawPlayers: RawSeasonPlayer[]) => {
  const byBbr = new Map<string, RawSeasonPlayer>();
  for (const raw of rawPlayers) {
    if (!raw.bbrPlayerId) {
      continue;
    }
    byBbr.set(
      raw.bbrPlayerId,
      pickPreferredSeasonRow(byBbr.get(raw.bbrPlayerId), raw),
    );
  }
  return byBbr;
};

const currentSeasonByBbr = indexSeasonPlayersByBbr(statsFile.players);
const currentSeasonNames = new Set(
  statsFile.players
    .filter((player) => player.gamesPlayed > 0)
    .map((player) => normalizeName(player.name)),
);

/**
 * Overlay current-season box stats for display while keeping usage / defense /
 * styles / statsTeam derived from the prior-season spine (stable early-season
 * scoring + team-quality anchors).
 */
const applyCurrentSeasonDisplayStats = (
  player: Player,
  current: RawSeasonPlayer,
): Player => ({
  ...player,
  points: current.points,
  rebounds: current.rebounds,
  assists: current.assists,
  steals: current.steals,
  blocks: current.blocks,
  turnovers: current.turnovers ?? 0,
  trueShooting: current.trueShooting ?? 0.54,
  threePoint: current.threePointPct ?? 0,
  threePointersAttempted: current.threePointersAttempted ?? 0,
  fieldGoalsAttempted: current.fieldGoalsAttempted ?? 0,
  freeThrowsAttempted: current.freeThrowsAttempted ?? 0,
  freeThrowPct: current.freeThrowPct ?? 0,
  personalFouls: current.personalFouls ?? 0,
  minutes: current.minutes,
  gamesPlayed: current.gamesPlayed,
  age: current.age ?? player.age,
});

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
    jerseyNumber:
      typeof raw.jerseyNumber === "number"
        ? raw.jerseyNumber
        : lookupJerseyNumber(raw.bbrPlayerId, playerId, team),
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
    heightInches: resolvePlayerHeightInches({
      heightInches: raw.heightInches,
      bbrPlayerId: raw.bbrPlayerId,
      position,
      seed: `${raw.id}${raw.bbrPlayerId ?? ""}`,
    }),
    usage: estimateUsage(raw),
    defense: rating?.defense ?? estimateDefense(raw),
    defenseGrade: rating?.grade,
    gamesPlayed: raw.gamesPlayed,
    age: raw.age,
    draftYear: raw.draftYear,
    styles: deriveStyles(raw, position),
    salary: raw.salary ?? getPlayerSalary(raw.bbrPlayerId, raw.id),
  };
};

const sortPlayers = (list: Player[]) =>
  [...list].sort(
    (a, b) =>
      b.points - a.points ||
      a.name.localeCompare(b.name) ||
      a.team.localeCompare(b.team),
  );

const mapStatsToPlayers = (rawPlayers: RawSeasonPlayer[]) =>
  rawPlayers
    .filter(
      (player) => player.gamesPlayed > 0 || player.isRosterAddition === true,
    )
    .map(toPlayer);

const allRosterAdditionPlayers = (
  espnRosterAdditions as { players: RawSeasonPlayer[] }
).players;

const rosterAdditionsByName = new Map(
  allRosterAdditionPlayers.map((player) => [
    normalizeName(player.name),
    player,
  ]),
);

const rosterAdditionPlayers = allRosterAdditionPlayers.filter(
  // Drop preseason stubs once Basketball Reference has a current-season sample.
  (player) => !currentSeasonNames.has(normalizeName(player.name)),
);

/** Carry salary / draftYear / espnId from ESPN stubs onto new BBR season rows. */
const enrichCurrentOnlyRaw = (raw: RawSeasonPlayer): RawSeasonPlayer => {
  const addition = rosterAdditionsByName.get(normalizeName(raw.name));
  if (!addition) {
    return raw;
  }

  return {
    ...raw,
    salary: raw.salary ?? addition.salary,
    draftYear: raw.draftYear ?? addition.draftYear,
    espnId: raw.espnId ?? addition.espnId,
    jerseyNumber:
      typeof raw.jerseyNumber === "number"
        ? raw.jerseyNumber
        : addition.jerseyNumber,
  };
};

const priorSeasonPlayers = mapStatsToPlayers(priorStatsFile.players).map(
  (player) => {
    const current =
      player.bbrPlayerId != null
        ? currentSeasonByBbr.get(player.bbrPlayerId)
        : undefined;
    if (!current || current.gamesPlayed <= 0) {
      return player;
    }
    return applyCurrentSeasonDisplayStats(player, current);
  },
);

const priorBbrIds = new Set(
  priorStatsFile.players
    .map((player) => player.bbrPlayerId)
    .filter((id): id is string => Boolean(id)),
);

const currentOnlyPlayers = mapStatsToPlayers(
  [...currentSeasonByBbr.values()]
    .filter(
      (player) =>
        player.gamesPlayed > 0 &&
        player.bbrPlayerId != null &&
        !priorBbrIds.has(player.bbrPlayerId),
    )
    .map(enrichCurrentOnlyRaw),
);

export const databasePlayers: Player[] = sortPlayers([
  ...priorSeasonPlayers,
  ...mapStatsToPlayers(rosterAdditionPlayers),
  ...currentOnlyPlayers,
]);

/**
 * Draftable pool for every live mode (daily, H2H, salary cap, practice, etc.).
 * Upcoming-season rookies/UDFAs with no regular-season sample stay in
 * `databasePlayers` for Tier List only.
 */
export const players: Player[] = databasePlayers.filter(
  (player) => isDraftEligiblePlayer(player) && player.gamesPlayed > 0,
);

/** Stats table: season-sample players only (no preseason rookies/UDFAs). */
export const statsPlayers: Player[] = databasePlayers.filter(
  (player) => player.gamesPlayed > 0,
);

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
