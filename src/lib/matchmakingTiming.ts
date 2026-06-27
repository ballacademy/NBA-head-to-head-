export const MATCHMAKING_SEARCH_MIN_SECONDS = 17;
export const MATCHMAKING_SEARCH_MAX_SECONDS = 20;

export const resolveMatchmakingSearchMs = (
  random: () => number = Math.random,
) => {
  const span =
    MATCHMAKING_SEARCH_MAX_SECONDS - MATCHMAKING_SEARCH_MIN_SECONDS + 1;
  const seconds =
    MATCHMAKING_SEARCH_MIN_SECONDS + Math.floor(random() * span);

  return seconds * 1000;
};

export const getMatchmakingElapsedSeconds = (
  startedAtMs: number,
  nowMs = Date.now(),
) => Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
