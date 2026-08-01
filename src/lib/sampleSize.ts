import priorSeasonProduction from "../../data/prior-season-production.json";
import activeStarBestSeasonsData from "../../data/active-star-best-seasons.json";

/** Current-season games needed before sample size is trusted on its own. */
export const FULL_SAMPLE_MIN_GAMES = 35;
export const LIMITED_SAMPLE_WEIGHT_FLOOR = 0.35;

/** Prior / peak season games needed to count as an established sample. */
export const ESTABLISHED_PRIOR_MIN_GAMES = 35;
/** Ignore tiny prior cup-of-coffee seasons when judging establishment. */
export const ESTABLISHED_PRIOR_MIN_MINUTES = 18;

/**
 * Current PPG may sit in this band around prior PPG and still count as
 * "similar production" (allows role growth / cold starts, blocks hot streaks).
 */
export const PRIOR_PRODUCTION_MIN_RATIO = 0.5;
export const PRIOR_PRODUCTION_MAX_RATIO = 1.4;
export const PRIOR_PRODUCTION_ABS_BUFFER = 3;

interface PriorProductionSnapshot {
  gamesPlayed: number;
  points: number;
  rebounds?: number;
  assists?: number;
  minutes?: number;
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
  minutes?: number;
}>) {
  if (!raw.bbrPlayerId) {
    continue;
  }
  bestSeasonByBbr.set(raw.bbrPlayerId, {
    gamesPlayed: raw.gamesPlayed,
    points: raw.points,
    rebounds: raw.rebounds,
    assists: raw.assists,
    minutes: raw.minutes,
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

/** Prior season first, then peak All-Star season as a multi-year fallback. */
export const getEstablishedProductionCredential = (
  player: Pick<SamplePlayer, "bbrPlayerId">,
): PriorProductionSnapshot | null => {
  if (!player.bbrPlayerId) {
    return null;
  }

  const prior = priorByBbr.get(player.bbrPlayerId);
  if (prior && isSizablePriorSample(prior)) {
    return prior;
  }

  const best = bestSeasonByBbr.get(player.bbrPlayerId);
  if (best && isSizablePriorSample(best)) {
    return best;
  }

  return null;
};

export const hasEstablishedPriorProduction = (player: SamplePlayer) => {
  if (!player.bbrPlayerId) {
    return false;
  }

  const prior = priorByBbr.get(player.bbrPlayerId);
  if (credentialMatches(player, prior)) {
    return true;
  }

  // Only use peak-season fallback when prior season itself was not sizable.
  if (prior && isSizablePriorSample(prior)) {
    return false;
  }

  return credentialMatches(player, bestSeasonByBbr.get(player.bbrPlayerId));
};

export const hasLimitedSampleSize = (player: SamplePlayer) => {
  if (player.gamesPlayed >= FULL_SAMPLE_MIN_GAMES) {
    return false;
  }

  return !hasEstablishedPriorProduction(player);
};

export const getPlayerStatWeight = (player: SamplePlayer) => {
  if (!hasLimitedSampleSize(player)) {
    return 1;
  }

  return Math.max(
    LIMITED_SAMPLE_WEIGHT_FLOOR,
    player.gamesPlayed / FULL_SAMPLE_MIN_GAMES,
  );
};
