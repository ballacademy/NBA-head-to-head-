import { readJson, writeJson } from "./browserStorage";
import type { PlayerRecord } from "./playerRecord";

const UNLOCK_PROGRESS_KEY = "nba-head-to-head-unlock-progress";

export const UNLOCK_EVERY_WINS = 3;
export const UNLOCK_EVERY_LOSSES = 3;
export const UNLOCK_CONSECUTIVE_WINS = 2;
export const UNLOCK_CONSECUTIVE_LOSSES = 2;

export interface UnlockProgress {
  winsSinceUnlock: number;
  lossesSinceUnlock: number;
  winStreak: number;
  lossStreak: number;
}

export const createUnlockProgress = (): UnlockProgress => ({
  winsSinceUnlock: 0,
  lossesSinceUnlock: 0,
  winStreak: 0,
  lossStreak: 0,
});

export const loadUnlockProgress = (): UnlockProgress => {
  const saved = readJson<Partial<UnlockProgress>>(UNLOCK_PROGRESS_KEY);

  return {
    winsSinceUnlock: saved?.winsSinceUnlock ?? 0,
    lossesSinceUnlock: saved?.lossesSinceUnlock ?? 0,
    winStreak: saved?.winStreak ?? 0,
    lossStreak: saved?.lossStreak ?? 0,
  };
};

export const saveUnlockProgress = (progress: UnlockProgress) => {
  writeJson(UNLOCK_PROGRESS_KEY, progress);
};

export const resetUnlockProgress = () => {
  saveUnlockProgress(createUnlockProgress());
};

export const shouldGrantWinUnlock = (
  progress: UnlockProgress,
  userWon: boolean,
) => {
  if (!userWon) {
    return false;
  }

  return (
    progress.winsSinceUnlock + 1 >= UNLOCK_EVERY_WINS ||
    progress.winStreak + 1 >= UNLOCK_CONSECUTIVE_WINS
  );
};

export const shouldGrantLossUnlock = (
  progress: UnlockProgress,
  userWon: boolean,
) => {
  if (userWon) {
    return false;
  }

  return (
    progress.lossesSinceUnlock + 1 >= UNLOCK_EVERY_LOSSES ||
    progress.lossStreak + 1 >= UNLOCK_CONSECUTIVE_LOSSES
  );
};

export const advanceUnlockProgress = (
  userWon: boolean,
  progress = loadUnlockProgress(),
) => {
  const grantWin = shouldGrantWinUnlock(progress, userWon);
  const grantLoss = shouldGrantLossUnlock(progress, userWon);

  if (grantWin || grantLoss) {
    saveUnlockProgress(createUnlockProgress());
    return grantWin ? ("win" as const) : ("loss" as const);
  }

  const next: UnlockProgress = {
    winsSinceUnlock: progress.winsSinceUnlock + (userWon ? 1 : 0),
    lossesSinceUnlock: progress.lossesSinceUnlock + (userWon ? 0 : 1),
    winStreak: userWon ? progress.winStreak + 1 : 0,
    lossStreak: userWon ? 0 : progress.lossStreak + 1,
  };

  saveUnlockProgress(next);
  return null;
};
