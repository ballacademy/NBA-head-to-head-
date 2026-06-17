export const FULL_SAMPLE_MIN_GAMES = 10;
export const LIMITED_SAMPLE_WEIGHT_FLOOR = 0.35;

export const hasLimitedSampleSize = (player: { gamesPlayed: number }) =>
  player.gamesPlayed < FULL_SAMPLE_MIN_GAMES;

export const getPlayerStatWeight = (player: { gamesPlayed: number }) => {
  if (!hasLimitedSampleSize(player)) {
    return 1;
  }

  return Math.max(
    LIMITED_SAMPLE_WEIGHT_FLOOR,
    player.gamesPlayed / FULL_SAMPLE_MIN_GAMES,
  );
};
