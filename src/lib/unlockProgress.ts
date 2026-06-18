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
}

export const createUnlockProgress = (): UnlockProgress => ({
  winsSinceUnlock: 0,
  lossesSinceUnlock: 0,
});

export const loadUnlockProgress = (): UnlockProgress => {
  const saved = readJson<Partial<UnlockProgress>>(UNLOCK_PROGRESS_KEY);

  return {
    winsSinceUnlock: saved?.winsSinceUnlock ?? 0,
    lossesSinceUnlock: saved?.lossesSinceUnlock ?? 0,
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
  record: Pick<PlayerRecord, "winStreak">,
) =>
  progress.winsSinceUnlock + 1 >= UNLOCK_EVERY_WINS ||
  record.winStreak >= UNLOCK_CONSECUTIVE_WINS;

export const shouldGrantLossUnlock = (
  progress: UnlockProgress,
  record: Pick<PlayerRecord, "lossStreak">,
) =>
  progress.lossesSinceUnlock + 1 >= UNLOCK_EVERY_LOSSES ||
  record.lossStreak >= UNLOCK_CONSECUTIVE_LOSSES;

export const advanceUnlockProgress = (
  userWon: boolean,
  record: Pick<PlayerRecord, "winStreak" | "lossStreak">,
  progress = loadUnlockProgress(),
) => {
  const next: UnlockProgress = {
    winsSinceUnlock: progress.winsSinceUnlock + (userWon ? 1 : 0),
    lossesSinceUnlock: progress.lossesSinceUnlock + (userWon ? 0 : 1),
  };

  const grantWin = userWon && shouldGrantWinUnlock(progress, record);
  const grantLoss = !userWon && shouldGrantLossUnlock(progress, record);

  if (grantWin || grantLoss) {
    saveUnlockProgress(createUnlockProgress());
    return grantWin ? ("win" as const) : ("loss" as const);
  }

  saveUnlockProgress(next);
  return null;
};
