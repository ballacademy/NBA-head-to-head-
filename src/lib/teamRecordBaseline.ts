import teamSeasonBaselines from "../../data/team-season-baselines.json";
import { statsFile } from "./playerPool";
import type { Player } from "./types";
import { isFreeAgentTeam } from "./freeAgents";

export const SAME_TEAM_RECORD_OVR_WEIGHT = 0.25;
export const HEALTHY_STARTER_GAMES = 75;
export const INJURY_RECOVERY_FACTOR = 0.2;
const SEASON_LENGTH = 82;

const winsByTeam = teamSeasonBaselines.winsByTeam as Record<string, number>;

const rawAvailabilityByBbr = new Map(
  statsFile.players
    .filter((player) => player.bbrPlayerId)
    .map((player) => [
      player.bbrPlayerId as string,
      player.gamesStarted ?? player.gamesPlayed,
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

export const getStarterAvailability = (lineup: Player[]) => {
  if (lineup.length === 0) {
    return 1;
  }

  const availabilityScores = lineup.map((player) => {
    const games =
      (player.bbrPlayerId
        ? rawAvailabilityByBbr.get(player.bbrPlayerId)
        : undefined) ?? player.gamesPlayed;

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
      .map((player) => player.team)
      .filter((team) => team && !isFreeAgentTeam(team)),
  );

  if (teams.size !== 1) {
    return null;
  }

  const team = [...teams][0];
  const actualWins = winsByTeam[team];

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
