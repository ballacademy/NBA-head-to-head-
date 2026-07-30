import type { Player } from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * clamp(t, 0, 1);

/** Smooth 0→1 as value moves from `lo` to `hi`. */
export const smoothUnit = (value: number, lo: number, hi: number) => {
  if (hi <= lo) {
    return value >= hi ? 1 : 0;
  }

  return clamp((value - lo) / (hi - lo), 0, 1);
};

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

export const ELITE_CREATION_ASSISTS_THRESHOLD = 26;
export const ELITE_CREATION_MIN_ENGINES = 2;
export const ELITE_CREATION_ASSISTS_SOFT_START = 22;

/** 0–1 how close the lineup is to elite creation (soft assists + engines). */
export const getEliteCreationFactor = (
  profile: LineupRoleFitProfile,
  totals: LineupRoleTotals,
) => {
  const assistFactor = smoothUnit(
    totals.assists,
    ELITE_CREATION_ASSISTS_SOFT_START,
    ELITE_CREATION_ASSISTS_THRESHOLD,
  );
  const engineFactor = clamp(profile.engines / ELITE_CREATION_MIN_ENGINES, 0, 1);
  return Math.min(assistFactor, engineFactor);
};

export const hasEliteLineupCreation = (
  profile: LineupRoleFitProfile,
  totals: LineupRoleTotals,
) => getEliteCreationFactor(profile, totals) >= 0.95;

const scoreCenterFit = (centerCount: number) => {
  // Ideal ~1 center. Piecewise-linear: 0→-8, 1→+5, 2→+1, 3→-7.
  if (centerCount <= 1) {
    return lerp(-8, 5, centerCount);
  }

  if (centerCount <= 2) {
    return lerp(5, 1, centerCount - 1);
  }

  if (centerCount <= 3) {
    return lerp(1, -7, centerCount - 2);
  }

  return -7;
};

/**
 * Continuous role-fit scoring. Avoids exact-equality cliffs like
 * `stoppers === 1` (which punished fractional 1.05 the same as 0).
 */
export const scoreLineupRoleFit = (
  profile: LineupRoleFitProfile,
  totals: LineupRoleTotals,
) => {
  let fit = 22;

  // Stoppers: 0 → -6, 1 → +0.5, 2 → +7
  fit += lerp(-6, 7, clamp(profile.stoppers / 2, 0, 1));

  // Rim: 0 → -6, 1 → +6
  fit += lerp(-6, 6, clamp(profile.rimProtectors, 0, 1));

  // Creation: blend engines / creator count / assists
  const creationFactor = Math.max(
    clamp(profile.engines, 0, 1),
    clamp(profile.creators / 2, 0, 1),
    smoothUnit(totals.assists, 14, 22),
  );
  fit += lerp(-6, 6, creationFactor);

  // Forwards: 0 → -5, 1 → +0.5, 2 → +6
  fit += lerp(-5, 6, clamp(profile.forwardCount / 2, 0, 1));

  fit += scoreCenterFit(profile.centerCount);

  // Guards: soft need when creation is thin
  if (profile.guardCount <= 0) {
    fit += lerp(-5, 0, smoothUnit(totals.assists, 14, 20));
  } else {
    fit += lerp(0, 2, clamp(profile.guardCount, 0, 1));
  }

  // Low-usage balance: 0 → -3, 1 → +3
  fit += lerp(-3, 3, clamp(profile.lowUsagePlayers, 0, 1));

  const eliteFactor = getEliteCreationFactor(profile, totals);
  const excessHighUsage = Math.max(0, profile.highUsagePlayers - 2);
  const usageTax = excessHighUsage * 6 + (profile.highUsagePlayers > 2 ? 2 : 0);
  fit -= usageTax * (1 - eliteFactor);

  return clamp(fit, 0, 48);
};

export const formatLineupRoleFitNote = (
  profile: LineupRoleFitProfile,
  stopperLabel: string,
) =>
  `${Math.round(profile.forwardCount)} forwards, ${Math.round(
    profile.centerCount,
  )} centers, ${roundOne(profile.stoppers)} ${stopperLabel}-or-better defenders, ${roundOne(
    profile.rimProtectors,
  )} rim protectors`;

const roundOne = (value: number) => Math.round(value * 10) / 10;

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
