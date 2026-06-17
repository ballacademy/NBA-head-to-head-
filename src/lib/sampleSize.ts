export const FULL_SAMPLE_MIN_GAMES = 10;

export const hasLimitedSampleSize = (player: { gamesPlayed: number }) =>
  player.gamesPlayed < FULL_SAMPLE_MIN_GAMES;
