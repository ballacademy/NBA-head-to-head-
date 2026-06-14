import type { Player, ResolvedPlayer, SeasonStats } from "./types";

export const REGULAR_SEASON_WEIGHT = 0.75;
export const POSTSEASON_WEIGHT = 0.25;

const STAT_KEYS: (keyof SeasonStats)[] = [
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "trueShooting",
  "threePoint",
  "usage",
  "defense",
];

// Rate stats stay at 3 decimals (e.g. true shooting 0.612); volume/box-score
// stats round to a single decimal to match how the rest of the app displays.
const RATE_KEYS = new Set<keyof SeasonStats>(["trueShooting", "threePoint"]);

const roundStat = (key: keyof SeasonStats, value: number) => {
  const factor = RATE_KEYS.has(key) ? 1000 : 10;
  return Math.round(value * factor) / factor;
};

const regularSeasonStats = (player: Player): SeasonStats => ({
  points: player.points,
  rebounds: player.rebounds,
  assists: player.assists,
  steals: player.steals,
  blocks: player.blocks,
  trueShooting: player.trueShooting,
  threePoint: player.threePoint,
  usage: player.usage,
  defense: player.defense,
});

/**
 * Blend a player's 2025-26 regular season and postseason per-game stats.
 *
 * - If the player has postseason splits, every stat is weighted 75% regular
 *   season / 25% postseason.
 * - If the player has no postseason splits (missed the playoffs), the regular
 *   season numbers are returned unchanged.
 */
export const blendStats = (player: Player): SeasonStats => {
  const regular = regularSeasonStats(player);

  if (!player.postseason) {
    return regular;
  }

  const postseason = player.postseason;
  const blended = {} as SeasonStats;

  for (const key of STAT_KEYS) {
    const value =
      regular[key] * REGULAR_SEASON_WEIGHT +
      postseason[key] * POSTSEASON_WEIGHT;
    blended[key] = roundStat(key, value);
  }

  return blended;
};

/** Collapse a raw player into the flat, blended shape the scoring engine uses. */
export const resolvePlayer = (player: Player): ResolvedPlayer => {
  const { postseason, ...identity } = player;

  return {
    ...identity,
    ...blendStats(player),
    blended: Boolean(postseason),
  };
};

export const resolveRoster = (roster: Player[]): ResolvedPlayer[] =>
  roster.map(resolvePlayer);
