import priorSeasonProduction from "../../data/prior-season-production.json";
import activeStarBestSeasonsData from "../../data/active-star-best-seasons.json";
import {
  getPlayerDefenseGradeRank,
  rankToDefenseGrade,
} from "./defenseGrade";
import type { Player } from "./types";

/**
 * Limited sample size (current season < FULL_SAMPLE_MIN_GAMES games):
 * 1) Game-weight blend current production with prior/peak season stats for scoring
 * 2) Down-weight the player in lineup aggregates until combined games reach full sample
 *
 * At FULL_SAMPLE_MIN_GAMES+ (30+), scoring uses current-season stats only.
 * Player-facing summary: Account → Beta notes → Limited sample size.
 */

/** Current-season games needed before sample size is trusted on its own (30+ = full). */
export const FULL_SAMPLE_MIN_GAMES = 30;
export const LIMITED_SAMPLE_WEIGHT_FLOOR = 0.35;

/** Prior / peak season games needed to count as a useful blend partner. */
export const ESTABLISHED_PRIOR_MIN_GAMES = 35;
/** Ignore tiny prior cup-of-coffee seasons when judging establishment. */
export const ESTABLISHED_PRIOR_MIN_MINUTES = 18;

/**
 * Current PPG may sit in this band around prior PPG and still count as
 * "similar production" (legacy helper for diagnostics / tests).
 */
export const PRIOR_PRODUCTION_MIN_RATIO = 0.5;
export const PRIOR_PRODUCTION_MAX_RATIO = 1.4;
export const PRIOR_PRODUCTION_ABS_BUFFER = 3;

export interface PriorProductionSnapshot {
  gamesPlayed: number;
  points: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  turnovers?: number;
  minutes?: number;
  trueShooting?: number;
  threePoint?: number;
  threePointersAttempted?: number;
  fieldGoalsAttempted?: number;
  freeThrowsAttempted?: number;
  freeThrowPct?: number;
  personalFouls?: number;
}

type SamplePlayer = {
  bbrPlayerId?: string;
  gamesPlayed: number;
  points: number;
};

const priorByBbr = new Map<string, PriorProductionSnapshot>(
  Object.entries(
    priorSeasonProduction.players as Record<string, PriorProductionSnapshot>,
  ),
);

const bestSeasonByBbr = new Map<string, PriorProductionSnapshot>();
for (const raw of activeStarBestSeasonsData.players as Array<{
  bbrPlayerId?: string;
  gamesPlayed: number;
  points: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  turnovers?: number;
  minutes?: number;
  trueShooting?: number;
  threePointPct?: number;
  threePointersAttempted?: number;
  fieldGoalsAttempted?: number;
  freeThrowsAttempted?: number;
  freeThrowPct?: number;
  personalFouls?: number;
}>) {
  if (!raw.bbrPlayerId) {
    continue;
  }
  bestSeasonByBbr.set(raw.bbrPlayerId, {
    gamesPlayed: raw.gamesPlayed,
    points: raw.points,
    rebounds: raw.rebounds,
    assists: raw.assists,
    steals: raw.steals,
    blocks: raw.blocks,
    turnovers: raw.turnovers,
    minutes: raw.minutes,
    trueShooting: raw.trueShooting,
    threePoint: raw.threePointPct,
    threePointersAttempted: raw.threePointersAttempted,
    fieldGoalsAttempted: raw.fieldGoalsAttempted,
    freeThrowsAttempted: raw.freeThrowsAttempted,
    freeThrowPct: raw.freeThrowPct,
    personalFouls: raw.personalFouls,
  });
}

const isSizablePriorSample = (snapshot: PriorProductionSnapshot) =>
  snapshot.gamesPlayed >= ESTABLISHED_PRIOR_MIN_GAMES &&
  (snapshot.minutes ?? 30) >= ESTABLISHED_PRIOR_MIN_MINUTES;

export const isSimilarPriorProduction = (
  currentPoints: number,
  priorPoints: number,
) => {
  const floor = Math.max(
    0,
    priorPoints * PRIOR_PRODUCTION_MIN_RATIO - PRIOR_PRODUCTION_ABS_BUFFER,
  );
  const ceiling =
    priorPoints * PRIOR_PRODUCTION_MAX_RATIO + PRIOR_PRODUCTION_ABS_BUFFER;
  return currentPoints >= floor && currentPoints <= ceiling;
};

const credentialMatches = (
  player: SamplePlayer,
  snapshot: PriorProductionSnapshot | undefined,
) =>
  Boolean(
    snapshot &&
      isSizablePriorSample(snapshot) &&
      isSimilarPriorProduction(player.points, snapshot.points),
  );

/**
 * Legacy "similar production" credential. Scoring no longer waives limited
 * samples with this — it game-weight blends prior stats instead.
 */
export const getEstablishedProductionCredential = (
  player: SamplePlayer,
): PriorProductionSnapshot | null => {
  if (!player.bbrPlayerId) {
    return null;
  }

  const prior = priorByBbr.get(player.bbrPlayerId);
  if (credentialMatches(player, prior)) {
    return prior ?? null;
  }

  if (prior && isSizablePriorSample(prior)) {
    return null;
  }

  const best = bestSeasonByBbr.get(player.bbrPlayerId);
  if (credentialMatches(player, best)) {
    return best ?? null;
  }

  return null;
};

export const hasEstablishedPriorProduction = (player: SamplePlayer) =>
  getEstablishedProductionCredential(player) != null;

/** Current-season sample is small, regardless of prior history. */
export const hasLimitedSampleSize = (player: SamplePlayer) =>
  player.gamesPlayed < FULL_SAMPLE_MIN_GAMES;

/**
 * Prior (or peak) season used for equal game-weighted blending when the
 * current season sample is limited.
 */
export const getBlendablePriorSnapshot = (
  player: SamplePlayer,
): PriorProductionSnapshot | null => {
  if (!player.bbrPlayerId || !hasLimitedSampleSize(player)) {
    return null;
  }

  const prior = priorByBbr.get(player.bbrPlayerId);
  if (prior && prior.gamesPlayed > 0) {
    return prior;
  }

  const best = bestSeasonByBbr.get(player.bbrPlayerId);
  if (best && best.gamesPlayed > 0) {
    return best;
  }

  return null;
};

export const getSeasonBlendShares = (
  player: SamplePlayer,
): { currentShare: number; priorShare: number; prior: PriorProductionSnapshot } | null => {
  const prior = getBlendablePriorSnapshot(player);
  if (!prior) {
    return null;
  }

  const totalGames = player.gamesPlayed + prior.gamesPlayed;
  if (totalGames <= 0) {
    return null;
  }

  return {
    currentShare: player.gamesPlayed / totalGames,
    priorShare: prior.gamesPlayed / totalGames,
    prior,
  };
};

const blendOptional = (
  current: number,
  priorValue: number | undefined,
  currentShare: number,
  priorShare: number,
) => {
  if (typeof priorValue !== "number" || !Number.isFinite(priorValue)) {
    return current;
  }

  return current * currentShare + priorValue * priorShare;
};

/**
 * Game-weight current-season stats with prior-season stats when the current
 * sample is limited. Example: 5 current + 70 prior → 5/75 and 70/75.
 */
export const resolvePlayerForScoring = (player: Player): Player => {
  const blend = getSeasonBlendShares(player);
  if (!blend) {
    return player;
  }

  const { currentShare, priorShare, prior } = blend;

  return {
    ...player,
    points: blendOptional(player.points, prior.points, currentShare, priorShare),
    rebounds: blendOptional(
      player.rebounds,
      prior.rebounds,
      currentShare,
      priorShare,
    ),
    assists: blendOptional(
      player.assists,
      prior.assists,
      currentShare,
      priorShare,
    ),
    steals: blendOptional(player.steals, prior.steals, currentShare, priorShare),
    blocks: blendOptional(player.blocks, prior.blocks, currentShare, priorShare),
    turnovers: blendOptional(
      player.turnovers,
      prior.turnovers,
      currentShare,
      priorShare,
    ),
    minutes: blendOptional(
      player.minutes,
      prior.minutes,
      currentShare,
      priorShare,
    ),
    trueShooting: blendOptional(
      player.trueShooting,
      prior.trueShooting,
      currentShare,
      priorShare,
    ),
    threePoint: blendOptional(
      player.threePoint,
      prior.threePoint,
      currentShare,
      priorShare,
    ),
    threePointersAttempted: blendOptional(
      player.threePointersAttempted,
      prior.threePointersAttempted,
      currentShare,
      priorShare,
    ),
    fieldGoalsAttempted: blendOptional(
      player.fieldGoalsAttempted,
      prior.fieldGoalsAttempted,
      currentShare,
      priorShare,
    ),
    freeThrowsAttempted: blendOptional(
      player.freeThrowsAttempted,
      prior.freeThrowsAttempted,
      currentShare,
      priorShare,
    ),
    freeThrowPct: blendOptional(
      player.freeThrowPct,
      prior.freeThrowPct,
      currentShare,
      priorShare,
    ),
    personalFouls: blendOptional(
      player.personalFouls,
      prior.personalFouls,
      currentShare,
      priorShare,
    ),
    // Soft-regress extreme current DEF grades toward average (C) with the same
    // game weights used for box stats — prior snapshots do not store grades.
    defenseGrade: rankToDefenseGrade(
      getPlayerDefenseGradeRank(player) * currentShare + 5 * priorShare,
    ),
  };
};

export const resolveLineupForScoring = (lineup: Player[]): Player[] =>
  lineup.map(resolvePlayerForScoring);

export const getPlayerStatWeight = (player: SamplePlayer) => {
  if (player.gamesPlayed >= FULL_SAMPLE_MIN_GAMES) {
    return 1;
  }

  const prior = getBlendablePriorSnapshot(player);
  if (prior) {
    const effectiveGames = player.gamesPlayed + prior.gamesPlayed;
    return Math.min(
      1,
      Math.max(LIMITED_SAMPLE_WEIGHT_FLOOR, effectiveGames / FULL_SAMPLE_MIN_GAMES),
    );
  }

  return Math.max(
    LIMITED_SAMPLE_WEIGHT_FLOOR,
    player.gamesPlayed / FULL_SAMPLE_MIN_GAMES,
  );
};
