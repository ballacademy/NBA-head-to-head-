import teamSeasonBaselines from "../../data/team-season-baselines.json";
import { getPlayerTeamQualityImpactWeight } from "./impactRanking";
import { statsFile } from "./playerPool";
import type { Player } from "./types";
import { isFreeAgentTeam } from "./freeAgents";

export const SAME_TEAM_RECORD_OVR_WEIGHT = 0.2;
export const HEALTHY_STARTER_GAMES = 75;
export const INJURY_RECOVERY_FACTOR = 0.2;
export const LEAGUE_AVERAGE_TEAM_WINS = 41;
export const TEAM_QUALITY_RAW_PER_WIN = 0.35;
export const TEAM_QUALITY_RAW_CAP = 5;
const SEASON_LENGTH = 82;

const winsByTeam = teamSeasonBaselines.winsByTeam as Record<string, number>;

interface RawSeasonAvailability {
  gamesPlayed: number;
  gamesStarted: number;
}

const rawSeasonByBbr = new Map<string, RawSeasonAvailability>(
  statsFile.players
    .filter((player) => player.bbrPlayerId)
    .map((player) => [
      player.bbrPlayerId as string,
      {
        gamesPlayed: player.gamesPlayed,
        gamesStarted: player.gamesStarted ?? 0,
      },
    ]),
);

export interface TeamRecordAnchor {
  team: string;
  actualWins: number;
  adjustedWins: number;
  starterAvailability: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Normalize alternate Charlotte abbreviations used in source data. */
export const normalizeTeamAbbreviation = (team: string) =>
  team === "CHA" ? "CHO" : team;

/**
 * Team whose prior-season record should influence this player's quality bump.
 * Prefer the club the season stats were earned for, not a later roster move.
 */
export const getPlayerTeamQualityTeam = (
  player: Pick<Player, "team" | "statsTeam" | "lastTeam">,
) => {
  const seasonTeam =
    player.statsTeam ??
    (isFreeAgentTeam(player.team) ? player.lastTeam : undefined) ??
    player.team;

  return seasonTeam ? normalizeTeamAbbreviation(seasonTeam) : undefined;
};

export const getPlayerSeasonAvailability = (
  player: Pick<Player, "bbrPlayerId" | "gamesPlayed">,
): RawSeasonAvailability => {
  const raw = player.bbrPlayerId
    ? rawSeasonByBbr.get(player.bbrPlayerId)
    : undefined;

  return {
    gamesPlayed: raw?.gamesPlayed ?? player.gamesPlayed,
    gamesStarted: raw?.gamesStarted ?? 0,
  };
};

/** More games off the bench than as a starter → no statsTeam quality boost. */
export const isBenchMajorityPlayer = (
  player: Pick<Player, "bbrPlayerId" | "gamesPlayed">,
) => {
  const { gamesPlayed, gamesStarted } = getPlayerSeasonAvailability(player);
  if (gamesPlayed <= 0) {
    return true;
  }

  const benchGames = gamesPlayed - gamesStarted;
  return benchGames > gamesStarted;
};

export const getStarterAvailability = (lineup: Player[]) => {
  if (lineup.length === 0) {
    return 1;
  }

  const availabilityScores = lineup.map((player) => {
    const { gamesStarted, gamesPlayed } = getPlayerSeasonAvailability(player);
    const games = gamesStarted > 0 ? gamesStarted : gamesPlayed;

    return clamp(games / HEALTHY_STARTER_GAMES, 0, 1);
  });

  return (
    availabilityScores.reduce((sum, score) => sum + score, 0) /
    availabilityScores.length
  );
};

export const adjustTeamWinsForStarterAvailability = (
  actualWins: number,
  starterAvailability: number,
) => {
  if (starterAvailability >= 0.95) {
    return actualWins;
  }

  const missedAvailability = 1 - starterAvailability;
  const recovery =
    missedAvailability * (SEASON_LENGTH - actualWins) * INJURY_RECOVERY_FACTOR;

  return Math.round(clamp(actualWins + recovery, 0, SEASON_LENGTH));
};

export const getSameTeamRecordAnchor = (
  lineup: Player[],
): TeamRecordAnchor | null => {
  if (lineup.length !== 5) {
    return null;
  }

  const teams = new Set(
    lineup
      .map((player) => getPlayerTeamQualityTeam(player))
      .filter((team): team is string => Boolean(team && !isFreeAgentTeam(team))),
  );

  if (teams.size !== 1) {
    return null;
  }

  const team = [...teams][0]!;
  const actualWins = winsByTeam[normalizeTeamAbbreviation(team)];

  if (actualWins === undefined) {
    return null;
  }

  const starterAvailability = getStarterAvailability(lineup);

  return {
    team,
    actualWins,
    adjustedWins: adjustTeamWinsForStarterAvailability(
      actualWins,
      starterAvailability,
    ),
    starterAvailability,
  };
};

export const blendProjectedWinsWithTeamAnchor = (
  ovrProjectedWins: number,
  anchor: TeamRecordAnchor,
) =>
  Math.round(
    clamp(
      SAME_TEAM_RECORD_OVR_WEIGHT * ovrProjectedWins +
        (1 - SAME_TEAM_RECORD_OVR_WEIGHT) * anchor.adjustedWins,
      0,
      SEASON_LENGTH,
    ),
  );

/**
 * Prior-season team wins bump, impact-weighted within the lineup.
 * Bench-majority players (more DNP-start / bench games than starts) are excluded.
 */
export const getLineupTeamQualityRawAdjustment = (lineup: Player[]) => {
  let weightedWins = 0;
  let weightSum = 0;

  for (const player of lineup) {
    if (isBenchMajorityPlayer(player)) {
      continue;
    }

    const team = getPlayerTeamQualityTeam(player);
    const wins = team ? winsByTeam[team] : undefined;
    if (wins === undefined) {
      continue;
    }

    const weight = getPlayerTeamQualityImpactWeight(player);
    weightedWins += wins * weight;
    weightSum += weight;
  }

  if (weightSum <= 0) {
    return 0;
  }

  const averageTeamWins = weightedWins / weightSum;

  return clamp(
    (averageTeamWins - LEAGUE_AVERAGE_TEAM_WINS) * TEAM_QUALITY_RAW_PER_WIN,
    -TEAM_QUALITY_RAW_CAP,
    TEAM_QUALITY_RAW_CAP,
  );
};
