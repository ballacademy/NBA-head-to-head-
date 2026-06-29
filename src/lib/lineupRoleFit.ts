import type { Player } from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export interface LineupRoleTotals {
  assists: number;
}

export interface LineupRoleFitProfile {
  guardCount: number;
  forwardCount: number;
  centerCount: number;
  creators: number;
  engines: number;
  connectors: number;
  highUsagePlayers: number;
  lowUsagePlayers: number;
  stoppers: number;
  rimProtectors: number;
}

export const buildLineupRoleFitProfile = (
  lineup: Player[],
  weights: number[],
  totals: LineupRoleTotals,
  options: {
    stoppers: number;
    rimProtectors: number;
    engines: number;
    connectors: number;
    highUsagePlayers: number;
    lowUsagePlayers: number;
  },
): LineupRoleFitProfile => {
  const countRole = (predicate: (player: Player) => boolean) =>
    lineup.reduce(
      (sum, player, index) => sum + (predicate(player) ? weights[index] : 0),
      0,
    );

  return {
    guardCount: countRole((player) =>
      player.positions.some((position) => position === "PG" || position === "SG"),
    ),
    forwardCount: countRole((player) =>
      player.positions.some((position) => position === "SF" || position === "PF"),
    ),
    centerCount: countRole((player) => player.positions.includes("C")),
    creators: options.connectors + options.engines,
    engines: options.engines,
    connectors: options.connectors,
    highUsagePlayers: options.highUsagePlayers,
    lowUsagePlayers: options.lowUsagePlayers,
    stoppers: options.stoppers,
    rimProtectors: options.rimProtectors,
  };
};

export const scoreLineupRoleFit = (
  profile: LineupRoleFitProfile,
  totals: LineupRoleTotals,
) => {
  let fit = 22;

  fit += profile.stoppers >= 2 ? 7 : profile.stoppers === 1 ? 2 : -6;
  fit += profile.rimProtectors >= 1 ? 6 : -6;

  if (profile.creators >= 2 || profile.engines >= 1 || totals.assists >= 22) {
    fit += 6;
  } else if (profile.connectors >= 1 || totals.assists >= 18) {
    fit += 3;
  } else {
    fit -= 6;
  }

  if (profile.forwardCount >= 2) {
    fit += 6;
  } else if (profile.forwardCount >= 1) {
    fit += 2;
  } else {
    fit -= 5;
  }

  if (profile.centerCount === 0) {
    fit -= 8;
  } else if (profile.centerCount === 1) {
    fit += 5;
  } else if (profile.centerCount >= 3) {
    fit -= 7;
  } else {
    fit += 1;
  }

  if (profile.guardCount === 0 && totals.assists < 18) {
    fit -= 5;
  } else if (profile.guardCount >= 1) {
    fit += 2;
  }

  fit += profile.lowUsagePlayers >= 1 ? 3 : -3;
  fit -= Math.max(0, profile.highUsagePlayers - 2) * 6;
  fit -= profile.highUsagePlayers > 2 ? 2 : 0;

  return clamp(fit, 0, 48);
};

export const formatLineupRoleFitNote = (
  profile: LineupRoleFitProfile,
  stopperLabel: string,
) =>
  `${Math.round(profile.forwardCount)} forwards, ${Math.round(
    profile.centerCount,
  )} centers, ${profile.stoppers} ${stopperLabel}-or-better defenders, ${Math.round(
    profile.rimProtectors,
  )} rim protectors`;

export const hasLineupCreation = (
  profile: LineupRoleFitProfile,
  totals: LineupRoleTotals,
) =>
  profile.creators >= 2 ||
  profile.engines >= 1 ||
  totals.assists >= 18;

export const hasLineupFrontcourt = (profile: LineupRoleFitProfile) =>
  profile.forwardCount >= 2 && profile.centerCount >= 1;

export const hasTooManyCenters = (profile: LineupRoleFitProfile) =>
  profile.centerCount >= 3;

export const hasNoCenter = (profile: LineupRoleFitProfile) =>
  profile.centerCount < 1;
